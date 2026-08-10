/**
 * @vitest-environment node
 */
import type { ChatSessionNewResponse, Session, SessionEvent } from '@srgnt/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ForkKeyConflictError, forkSession, reconcileForkLinks, type ForkStore } from './fork.js';
import type { ChatSessionLineage } from './session-controller.js';

/**
 * Fork-with-handoff against an in-memory store. The point of the fake is that
 * it models the ONE durability property that matters: `createChild` writes the
 * child record, and everything else — the parent's list, any lookup — is a
 * cache that must be rebuildable from it.
 */

const now = '2026-08-01T10:00:00.000Z';

function session(overrides: Partial<Session> & { id: string }): Session {
  return {
    projectId: 'p1',
    harnessId: 'mock',
    kind: 'single',
    status: 'idle',
    createdAt: now,
    ...overrides,
  } as Session;
}

interface Fake {
  store: ForkStore;
  records: Map<string, Session>;
  events: SessionEvent[];
  createChild: ReturnType<typeof vi.fn>;
  /** Drops the write that happens AFTER the child commit, simulating a crash. */
  crashAfterChild: { value: boolean };
}

function fake(source: Session, events: SessionEvent[] = []): Fake {
  const records = new Map<string, Session>([[source.id, source]]);
  const crashAfterChild = { value: false };
  let created = 0;
  const createChild = vi.fn(async (lineage: ChatSessionLineage): Promise<ChatSessionNewResponse> => {
    created += 1;
    const id = `child-${created}`;
    records.set(
      id,
      session({
        id,
        parentSessionId: lineage.parentSessionId,
        idempotencyKey: lineage.idempotencyKey,
        requestFingerprint: lineage.requestFingerprint,
      }),
    );
    return {
      sessionId: id,
      target: 'mock',
      projectId: 'p1',
      harnessId: 'mock',
      harnessName: 'Mock Agent',
      quirks: [],
      capabilities: {},
    };
  });
  const store: ForkStore = {
    readMeta: async ({ sessionId }) => {
      const record = records.get(sessionId);
      if (record === undefined) throw new Error(`no session ${sessionId}`);
      return record;
    },
    readEvents: async () => ({ events }),
    updateMeta: async ({ sessionId }, patch) => {
      if (crashAfterChild.value) throw new Error('crashed before the parent update landed');
      const record = records.get(sessionId)!;
      const next = { ...record, ...patch } as Session;
      records.set(sessionId, next);
      return next;
    },
    listSessions: async () => ({ sessions: [...records.values()] }),
  };
  return { store, records, events, createChild, crashAfterChild };
}

const request = {
  projectId: 'p1',
  sourceSessionId: 'src',
  includeHandoff: true,
  idempotencyKey: 'key-1',
};

describe('forkSession', () => {
  it('creates a linked child with the handoff pre-filled and lineage on both records', async () => {
    const source = session({ id: 'src', title: 'Fix the login bug' });
    const f = fake(source, [
      { seq: 0, ts: now, protocolVersion: 1, kind: 'client/prompt', payload: { text: 'why is it broken?' } },
    ]);

    const result = await forkSession({ store: f.store, createChild: f.createChild }, request);

    expect(result.reused).toBe(false);
    expect(result.parentSessionId).toBe('src');
    expect(result.handoffText).toContain('Continuing from "Fix the login bug".');
    expect(result.handoffText).toContain('> why is it broken?');
    // The child carries the authoritative link plus its own fork stamp…
    const child = f.records.get('child-1')!;
    expect(child.parentSessionId).toBe('src');
    expect(child.idempotencyKey).toBe('key-1');
    expect(child.requestFingerprint).toBeDefined();
    // …and the parent's list is updated after, as a convenience.
    expect(f.records.get('src')!.forkedSessionIds).toEqual(['child-1']);
  });

  it('omits the handoff when the caller asked for none', async () => {
    const f = fake(session({ id: 'src', title: 't' }), [
      { seq: 0, ts: now, protocolVersion: 1, kind: 'client/prompt', payload: { text: 'q' } },
    ]);
    const result = await forkSession(
      { store: f.store, createChild: f.createChild },
      { ...request, includeHandoff: false },
    );
    expect(result.handoffText).toBe('');
  });

  it('returns the ORIGINAL child when the same request is replayed', async () => {
    const f = fake(session({ id: 'src', title: 't' }));
    const first = await forkSession({ store: f.store, createChild: f.createChild }, request);
    const second = await forkSession({ store: f.store, createChild: f.createChild }, request);

    expect(second.reused).toBe(true);
    expect(second.session.sessionId).toBe(first.session.sessionId);
    // Exactly one child, ever — that is the entire guarantee.
    expect(f.createChild).toHaveBeenCalledTimes(1);
  });

  it('resolves a retry after a crash between the two writes to the same child', async () => {
    const f = fake(session({ id: 'src', title: 't' }));
    f.crashAfterChild.value = true;
    const first = await forkSession({ store: f.store, createChild: f.createChild }, request);
    // The parent never learned about the child, so lineage is one-way…
    expect(f.records.get('src')!.forkedSessionIds).toBeUndefined();

    f.crashAfterChild.value = false;
    const retried = await forkSession({ store: f.store, createChild: f.createChild }, request);
    // …and the retry still resolves to it rather than forking twice, because the
    // key was stamped on the child by the write that committed the fork.
    expect(retried.reused).toBe(true);
    expect(retried.session.sessionId).toBe(first.session.sessionId);
    expect(f.createChild).toHaveBeenCalledTimes(1);

    // Lineage self-heals from the child record on the next list read.
    const repairs = reconcileForkLinks([...f.records.values()]);
    expect(repairs.get('src')).toEqual(['child-1']);
  });

  it('rejects a reused key that arrives with different parameters', async () => {
    const f = fake(session({ id: 'src', title: 't' }));
    f.records.set('other', session({ id: 'other', title: 'another' }));
    await forkSession({ store: f.store, createChild: f.createChild }, request);

    // Different source: answering with the first request's child would hand back
    // a fork of the wrong session.
    await expect(
      forkSession({ store: f.store, createChild: f.createChild }, { ...request, sourceSessionId: 'other' }),
    ).rejects.toBeInstanceOf(ForkKeyConflictError);
    // Different parameters on the same source count too.
    await expect(
      forkSession({ store: f.store, createChild: f.createChild }, { ...request, includeHandoff: false }),
    ).rejects.toThrow(/fork_key_conflict/);
    expect(f.createChild).toHaveBeenCalledTimes(1);
  });

  it('forks an empty session into a linked one with nothing quoted', async () => {
    const f = fake(session({ id: 'src' }));
    const result = await forkSession({ store: f.store, createChild: f.createChild }, request);
    expect(result.handoffText.trim()).toBe('Continuing from a previous session.');
    expect(f.records.get('child-1')!.parentSessionId).toBe('src');
  });

  it('still returns the fork when the parent list write fails', async () => {
    const f = fake(session({ id: 'src', title: 't' }));
    f.crashAfterChild.value = true;
    // A failed cache update must not fail the fork itself.
    await expect(
      forkSession({ store: f.store, createChild: f.createChild }, request),
    ).resolves.toMatchObject({ reused: false });
  });
});

describe('reconcileForkLinks', () => {
  it('back-fills a parent whose list is missing a child that names it', () => {
    const repairs = reconcileForkLinks([
      session({ id: 'a' }),
      session({ id: 'b', parentSessionId: 'a' }),
    ]);
    expect(repairs.get('a')).toEqual(['b']);
  });

  it('leaves an already-correct list alone, whatever order it is stored in', () => {
    // A positional comparison here would rewrite meta.json on every list read,
    // bumping `updatedAt` — which the list sorts on.
    const repairs = reconcileForkLinks([
      session({ id: 'a', forkedSessionIds: ['c', 'b'] }),
      session({ id: 'b', parentSessionId: 'a' }),
      session({ id: 'c', parentSessionId: 'a' }),
    ]);
    expect(repairs.size).toBe(0);
  });

  it('keeps entries whose child is not in this scan', () => {
    const repairs = reconcileForkLinks([
      session({ id: 'a', forkedSessionIds: ['gone'] }),
      session({ id: 'b', parentSessionId: 'a' }),
    ]);
    // Union, never subtraction: sessions are not deletable, so a missing child
    // means an incomplete scan, not a removed fork.
    expect(repairs.get('a')).toEqual(['gone', 'b']);
  });

  it('handles a chain of forks without collapsing it', () => {
    const repairs = reconcileForkLinks([
      session({ id: 'a' }),
      session({ id: 'b', parentSessionId: 'a' }),
      session({ id: 'c', parentSessionId: 'b' }),
    ]);
    expect(repairs.get('a')).toEqual(['b']);
    expect(repairs.get('b')).toEqual(['c']);
  });
});
