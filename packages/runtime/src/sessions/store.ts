import * as fs from 'fs/promises';
import type { Session, SessionEvent } from '@srgnt/contracts';
import {
  SessionEventLog,
  readEventLog,
  type AppendEventInput,
  type ReadEventsResult,
} from './event-log.js';
import {
  SessionMetaError,
  parseSessionMeta,
  readSessionMeta,
  writeSessionMeta,
  type SessionMetaInput,
} from './meta.js';
import { isSafeId, projectSessionsDirectory, sessionPaths } from './paths.js';

/** `createSession` was called for an id that already has a `meta.json`. */
export class SessionAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAlreadyExistsError';
  }
}

/** A metadata patch tried to change the ids that name the session's directory. */
export class SessionIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionIdentityError';
  }
}

export interface SessionRef {
  projectId: string;
  sessionId: string;
}

export interface ListSessionsResult {
  sessions: Session[];
  /** Session directories that could not be read — reported, never fatal. */
  skipped: Array<{ sessionId: string; reason: string }>;
}

/**
 * Disk layer for sessions: `projects/<projectId>/sessions/<sessionId>/` holding
 * an append-only `events.jsonl` (the source of truth) and an atomically
 * rewritten `meta.json`.
 *
 * Project *entities* are STEP-24-02 — `projectId` is a caller-supplied
 * parameter here and the directory is created on demand.
 */
export class SessionStore {
  private readonly logs = new Map<string, Promise<SessionEventLog>>();

  constructor(readonly workspaceRoot: string) {}

  private key(ref: SessionRef): string {
    return `${ref.projectId}/${ref.sessionId}`;
  }

  private paths(ref: SessionRef) {
    return sessionPaths(this.workspaceRoot, ref.projectId, ref.sessionId);
  }

  /** Create the session directory and write its initial `meta.json`. */
  async createSession(meta: SessionMetaInput): Promise<Session> {
    const session = parseSessionMeta(meta, `${meta.projectId}/${meta.id}`);
    const paths = this.paths({ projectId: session.projectId, sessionId: session.id });
    // Refuse to reuse an id. Overwriting `meta.json` leaves the previous
    // session's `events.jsonl` in place, so the new record would inherit
    // somebody else's history — worse than a failed create.
    try {
      await fs.access(paths.meta);
      throw new SessionAlreadyExistsError(
        `Session ${session.projectId}/${session.id} already exists`
      );
    } catch (error) {
      if (error instanceof SessionAlreadyExistsError) throw error;
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    }
    await fs.mkdir(paths.directory, { recursive: true });
    return writeSessionMeta(paths.meta, session);
  }

  private log(ref: SessionRef): Promise<SessionEventLog> {
    const key = this.key(ref);
    let pending = this.logs.get(key);
    if (pending === undefined) {
      const paths = this.paths(ref);
      pending = fs
        .mkdir(paths.directory, { recursive: true })
        .then(() => SessionEventLog.open(paths.events));
      // A failed open must not stick in the map as a permanently rejected entry.
      pending.catch(() => this.logs.delete(key));
      this.logs.set(key, pending);
    }
    return pending;
  }

  async appendEvent(
    ref: SessionRef,
    kind: string,
    payload?: unknown,
    protocolVersion = 0
  ): Promise<SessionEvent> {
    const log = await this.log(ref);
    return log.append({ kind, payload, protocolVersion } satisfies AppendEventInput);
  }

  /** Read the session's events in order, optionally from `fromSeq` onward. */
  async readEvents(ref: SessionRef, options: { fromSeq?: number } = {}): Promise<ReadEventsResult> {
    const pending = this.logs.get(this.key(ref));
    if (pending !== undefined) {
      // Make in-flight appends visible to the read.
      await (await pending).drain();
    }
    return readEventLog(this.paths(ref).events, options);
  }

  async readMeta(ref: SessionRef): Promise<Session> {
    return readSessionMeta(this.paths(ref).meta);
  }

  /**
   * Read-modify-write `meta.json`, stamping `updatedAt`.
   *
   * `id` and `projectId` are identity, not metadata: they name the directory
   * the file lives in. Letting a patch change them would leave `listSessions`
   * returning ids that point at a different directory than the one they were
   * read from, so they are rejected rather than silently ignored.
   */
  async updateMeta(
    ref: SessionRef,
    patch: Partial<Omit<SessionMetaInput, 'id' | 'projectId'>> & { id?: string; projectId?: string }
  ): Promise<Session> {
    if (patch.id !== undefined && patch.id !== ref.sessionId) {
      throw new SessionIdentityError(`Cannot change session id from ${ref.sessionId} to ${patch.id}`);
    }
    if (patch.projectId !== undefined && patch.projectId !== ref.projectId) {
      throw new SessionIdentityError(
        `Cannot change project id from ${ref.projectId} to ${patch.projectId}`
      );
    }
    const paths = this.paths(ref);
    const current = await readSessionMeta(paths.meta);
    const next = parseSessionMeta(
      {
        ...current,
        ...patch,
        id: current.id,
        projectId: current.projectId,
        updatedAt: patch.updatedAt ?? new Date().toISOString(),
      },
      paths.meta
    );
    return writeSessionMeta(paths.meta, next);
  }

  /**
   * Close one session's append handle. Every open log holds a file descriptor
   * until `close()`, so a long-lived process that touches many sessions needs a
   * way to release one it is done with.
   *
   * ponytail: explicit release, no LRU. Add automatic eviction only if a caller
   * is ever shown to keep enough sessions hot to matter.
   */
  async closeSession(ref: SessionRef): Promise<void> {
    const key = this.key(ref);
    const pending = this.logs.get(key);
    if (pending === undefined) return;
    this.logs.delete(key);
    await (await pending).close();
  }

  /**
   * List a project's sessions. A session directory with unreadable or invalid
   * meta is reported in `skipped`, never fatal to the listing.
   */
  async listSessions(projectId: string): Promise<ListSessionsResult> {
    const directory = projectSessionsDirectory(this.workspaceRoot, projectId);
    let entries: string[];
    try {
      entries = (await fs.readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return { sessions: [], skipped: [] };
      }
      throw error;
    }

    const sessions: Session[] = [];
    const skipped: ListSessionsResult['skipped'] = [];

    for (const sessionId of entries.sort()) {
      if (!isSafeId(sessionId)) {
        skipped.push({ sessionId, reason: 'unsafe session directory name' });
        continue;
      }
      try {
        sessions.push(await readSessionMeta(sessionPaths(this.workspaceRoot, projectId, sessionId).meta));
      } catch (error) {
        skipped.push({
          sessionId,
          reason: error instanceof SessionMetaError ? error.message : String(error),
        });
      }
    }

    return { sessions, skipped };
  }

  /** Flush and close every open event log. */
  async close(): Promise<void> {
    const pending = [...this.logs.values()];
    this.logs.clear();
    await Promise.all(
      pending.map(async (entry) => {
        const log = await entry.catch(() => undefined);
        await log?.close();
      })
    );
  }
}

export function createSessionStore(workspaceRoot: string): SessionStore {
  return new SessionStore(workspaceRoot);
}
