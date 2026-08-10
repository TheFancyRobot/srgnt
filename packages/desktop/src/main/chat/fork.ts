import {
  FORK_KEY_CONFLICT,
  type ChatSessionForkRequest,
  type ChatSessionForkResponse,
  type ChatSessionNewResponse,
  type Session,
  type SessionEvent,
} from '@srgnt/contracts';
import type { ChatSessionLineage } from './session-controller.js';
import { buildHandoffText, forkRequestFingerprint, readHandoffSource } from './resume.js';

/**
 * Fork-with-handoff (PHASE-24, STEP-24-04) — the ONE continue path for a
 * session the harness cannot resume, and the only one the phase allows: a new
 * session, linked to the old one, seeded with an explicit summary the user
 * reads before sending. Never a silent re-prime.
 */

/** The `SessionStore` slice a fork touches. Structural, so tests need no store. */
export interface ForkStore {
  readMeta(ref: { projectId: string; sessionId: string }): Promise<Session>;
  readEvents(ref: { projectId: string; sessionId: string }): Promise<{ events: SessionEvent[] }>;
  updateMeta(
    ref: { projectId: string; sessionId: string },
    patch: { forkedSessionIds?: readonly string[] },
  ): Promise<Session>;
  listSessions(projectId: string): Promise<{ sessions: Session[] }>;
}

/**
 * A repeated `idempotencyKey` that arrived with different parameters. Its own
 * error because neither alternative is acceptable: returning the first
 * request's child hands back a fork of the wrong session, and forking again
 * breaks the exactly-once guarantee the key exists to provide.
 */
export class ForkKeyConflictError extends Error {
  readonly code = FORK_KEY_CONFLICT;
  constructor(key: string) {
    super(
      `${FORK_KEY_CONFLICT}: fork idempotency key '${key}' was already used for a different request`,
    );
    this.name = 'ForkKeyConflictError';
  }
}

export interface ForkDeps {
  readonly store: ForkStore;
  /** Opens the child session, stamping the lineage into its first meta write. */
  createChild(lineage: ChatSessionLineage, source: Session): Promise<ChatSessionNewResponse>;
}

/**
 * Resolves an idempotency key to the child that already answered it, by
 * SCANNING the project's session records.
 *
 * ponytail: no `forks/<key>` index file. The brief allowed one strictly as a
 * rebuildable cache — but a cache that must be rebuilt from the child records
 * on startup, fallen back to on a miss, and proven disposable in a test is more
 * machinery than the scan it accelerates. Forking is a rare, human-paced action
 * and `listSessions` is already the per-project meta read the list does on every
 * render. Add the index only if a project ever holds enough sessions for this
 * scan to be measurable.
 */
async function findByKey(
  store: ForkStore,
  projectId: string,
  idempotencyKey: string,
): Promise<Session | undefined> {
  const { sessions } = await store.listSessions(projectId);
  return sessions.find((session) => session.idempotencyKey === idempotencyKey);
}

/**
 * Creates (or re-resolves) a fork of `sourceSessionId`.
 *
 * Ordering is the durability contract: the CHILD meta — carrying
 * `parentSessionId`, `idempotencyKey` and `requestFingerprint` — is written
 * first and is the commit point. Only then is the parent's `forkedSessionIds`
 * updated, and that list is a rebuildable cache (see `reconcileForkLinks`), so
 * a crash in between self-heals and a retry resolves to the same child instead
 * of forking twice.
 */
export async function forkSession(
  deps: ForkDeps,
  request: ChatSessionForkRequest,
): Promise<ChatSessionForkResponse> {
  const { projectId, sourceSessionId, includeHandoff, idempotencyKey } = request;
  const fingerprint = forkRequestFingerprint({ projectId, sourceSessionId, includeHandoff });

  const existing = await findByKey(deps.store, projectId, idempotencyKey);
  if (existing !== undefined) {
    if (existing.requestFingerprint !== fingerprint) throw new ForkKeyConflictError(idempotencyKey);
    return {
      // The child may no longer be live (this is also the crash-retry path), so
      // only what the record itself knows is echoed; the renderer opens it from
      // disk exactly as it would any other persisted session.
      session: {
        sessionId: existing.id,
        target: existing.harnessId === 'pi' ? 'pi' : 'mock',
        projectId: existing.projectId,
        harnessId: existing.harnessId,
        harnessName: existing.harnessId,
        quirks: [],
        capabilities: {},
      },
      parentSessionId: existing.parentSessionId ?? sourceSessionId,
      handoffText: '',
      reused: true,
    };
  }

  const ref = { projectId, sessionId: sourceSessionId };
  const source = await deps.store.readMeta(ref);
  const handoffText = includeHandoff
    ? buildHandoffText(source.title, readHandoffSource((await deps.store.readEvents(ref)).events))
    : '';

  const child = await deps.createChild(
    { parentSessionId: sourceSessionId, idempotencyKey, requestFingerprint: fingerprint },
    source,
  );

  // Second write, deliberately after the commit point. A failure here costs the
  // parent's convenience list, not the fork: the next `chat:session:list`
  // rebuilds it from the child.
  const listed = [...(source.forkedSessionIds ?? [])];
  if (!listed.includes(child.sessionId)) {
    await deps.store
      .updateMeta(ref, { forkedSessionIds: [...listed, child.sessionId] })
      .catch(() => undefined);
  }

  return { session: child, parentSessionId: sourceSessionId, handoffText, reused: false };
}

/**
 * Rebuilds every parent's `forkedSessionIds` from the children that name it.
 *
 * The child record is the source of truth (its `parentSessionId` is written
 * with the fork itself); the parent's list is a cache that a crash between the
 * two writes can leave stale. Returns only the parents whose stored list is
 * missing something, as the FULL list to write.
 *
 * Union, never subtraction: an entry naming a child this scan did not see is
 * kept, because "the scan is incomplete" is far likelier than "the fork was
 * deleted" — sessions are not deletable.
 */
export function reconcileForkLinks(sessions: readonly Session[]): Map<string, string[]> {
  const derived = new Map<string, Set<string>>();
  for (const session of sessions) {
    const parent = session.parentSessionId;
    if (parent === undefined) continue;
    const bucket = derived.get(parent);
    if (bucket === undefined) derived.set(parent, new Set([session.id]));
    else bucket.add(session.id);
  }
  const repairs = new Map<string, string[]>();
  for (const session of sessions) {
    const children = derived.get(session.id);
    if (children === undefined) continue;
    const stored = session.forkedSessionIds ?? [];
    const missing = [...children].filter((id) => !stored.includes(id));
    // Set comparison, not order comparison: a positional check would rewrite
    // `meta.json` on every single list read (bumping `updatedAt`, which the list
    // sorts on) for a list that was already correct.
    if (missing.length > 0) repairs.set(session.id, [...stored, ...missing]);
  }
  return repairs;
}
