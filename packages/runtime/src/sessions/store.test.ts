import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionPathError } from './paths.js';
import {
  SessionAlreadyExistsError,
  SessionIdentityError,
  SessionStore,
  createSessionStore,
  type SessionRef,
} from './store.js';

let root: string;
let store: SessionStore;

const ref: SessionRef = { projectId: 'proj-1', sessionId: 'sess-1' };

function meta(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    projectId: 'proj-1',
    harnessId: 'pi',
    status: 'idle' as const,
    createdAt: '2026-07-27T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-store-'));
  store = createSessionStore(root);
});

afterEach(async () => {
  await store.close();
  await fs.rm(root, { recursive: true, force: true });
});

describe('SessionStore', () => {
  it('refuses to create a session that already exists', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'acp/session_update', { text: 'first session' });
    await store.closeSession(ref);

    await expect(store.createSession({ ...meta(), title: 'different' })).rejects.toBeInstanceOf(
      SessionAlreadyExistsError
    );
    // The point of refusing: a silent overwrite would leave the new metadata
    // pointing at the old session's event history.
    expect((await store.readMeta(ref)).title).not.toBe('different');
    expect((await store.readEvents(ref)).events).toHaveLength(1);
  });

  it('rejects a patch that would move a session out of its own directory', async () => {
    await store.createSession(meta());
    await expect(store.updateMeta(ref, { id: 'sess-2' })).rejects.toBeInstanceOf(
      SessionIdentityError
    );
    await expect(store.updateMeta(ref, { projectId: 'proj-2' })).rejects.toBeInstanceOf(
      SessionIdentityError
    );
    // Listing still agrees with the on-disk location.
    const listed = await store.listSessions('proj-1');
    expect(listed.sessions.map((session) => session.id)).toEqual(['sess-1']);
  });

  it('keeps meta.json valid when two updates overlap', async () => {
    await store.createSession(meta());
    await Promise.all([
      store.updateMeta(ref, { title: 'first' }),
      store.updateMeta(ref, { title: 'second' }),
    ]);
    // Unique temp names mean neither write can publish the other's partial
    // document; the file is one of the two, never a blend or a truncation.
    const after = await store.readMeta(ref);
    expect(['first', 'second']).toContain(after.title);
  });

  it('closeSession releases the handle and later appends still land', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'acp/session_update');
    await store.closeSession(ref);
    // Idempotent: closing an already-released session is not an error.
    await store.closeSession(ref);
    await store.appendEvent(ref, 'client/stop');
    expect((await store.readEvents(ref)).events.map((event) => event.seq)).toEqual([0, 1]);
  });

  it('creates the documented directory layout', async () => {
    const created = await store.createSession(meta());
    expect(created.kind).toBe('single');
    const dir = path.join(root, 'projects', 'proj-1', 'sessions', 'sess-1');
    expect(await fs.readdir(dir)).toEqual(['meta.json']);
    expect(await store.readMeta(ref)).toEqual(created);
  });

  it('appends and reads back events in order', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'client/prompt', { text: 'hi' }, 1);
    await store.appendEvent(ref, 'acp/session_update', { update: { sessionUpdate: 'plan' } }, 1);

    const result = await store.readEvents(ref);
    expect(result.events.map((event) => [event.seq, event.kind])).toEqual([
      [0, 'client/prompt'],
      [1, 'acp/session_update'],
    ]);
    expect(result.events[0]?.protocolVersion).toBe(1);
    expect(result.truncatedTail).toBe(false);
  });

  it('makes in-flight appends visible to a concurrent read', async () => {
    await store.createSession(meta());
    const pending = Promise.all([
      store.appendEvent(ref, 'client/prompt'),
      store.appendEvent(ref, 'client/stop'),
    ]);
    const result = await store.readEvents(ref);
    await pending;
    expect(result.events).toHaveLength(2);
  });

  it('defaults protocolVersion to 0 when no connection exists yet', async () => {
    await store.createSession(meta());
    const event = await store.appendEvent(ref, 'client/session_created');
    expect(event.protocolVersion).toBe(0);
    expect(event.payload).toBeUndefined();
  });

  it('reads an empty log for a session that never appended', async () => {
    await store.createSession(meta());
    expect(await store.readEvents(ref)).toMatchObject({ events: [], truncatedTail: false });
  });

  it('supports fromSeq', async () => {
    await store.createSession(meta());
    for (let i = 0; i < 4; i += 1) {
      await store.appendEvent(ref, 'acp/session_update', { i });
    }
    expect((await store.readEvents(ref, { fromSeq: 2 })).events.map((e) => e.seq)).toEqual([2, 3]);
  });

  it('continues seq across a store close and reopen', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'client/prompt');
    await store.appendEvent(ref, 'client/stop');
    await store.close();

    const reopened = createSessionStore(root);
    const event = await reopened.appendEvent(ref, 'client/prompt');
    expect(event.seq).toBe(2);
    await reopened.close();
    expect((await store.readEvents(ref)).events.map((e) => e.seq)).toEqual([0, 1, 2]);
  });

  it('updates meta and stamps updatedAt', async () => {
    await store.createSession(meta());
    const updated = await store.updateMeta(ref, { status: 'closed', title: 'done' });
    expect(updated.status).toBe('closed');
    expect(updated.title).toBe('done');
    expect(updated.updatedAt).toBeDefined();
    expect(await store.readMeta(ref)).toEqual(updated);
  });

  it('rejects path-unsafe ids', async () => {
    await expect(store.createSession(meta({ id: '../escape' }))).rejects.toBeInstanceOf(
      SessionPathError
    );
    await expect(
      store.appendEvent({ projectId: '..', sessionId: 'sess-1' }, 'client/prompt')
    ).rejects.toBeInstanceOf(SessionPathError);
    await expect(store.listSessions('a/b')).rejects.toBeInstanceOf(SessionPathError);
  });

  it('lists sessions and reports unreadable ones instead of failing', async () => {
    await store.createSession(meta({ id: 'sess-1' }));
    await store.createSession(meta({ id: 'sess-2', status: 'closed' }));

    const brokenDir = path.join(root, 'projects', 'proj-1', 'sessions', 'sess-broken');
    await fs.mkdir(brokenDir, { recursive: true });
    await fs.writeFile(path.join(brokenDir, 'meta.json'), '{ not json');

    const emptyDir = path.join(root, 'projects', 'proj-1', 'sessions', 'sess-nometa');
    await fs.mkdir(emptyDir, { recursive: true });

    const result = await store.listSessions('proj-1');
    expect(result.sessions.map((session) => session.id)).toEqual(['sess-1', 'sess-2']);
    expect(result.skipped.map((entry) => entry.sessionId).sort()).toEqual([
      'sess-broken',
      'sess-nometa',
    ]);
    expect(result.skipped[0]?.reason).toBeTruthy();
  });

  it('lists nothing for an unknown project', async () => {
    expect(await store.listSessions('proj-unknown')).toEqual({ sessions: [], skipped: [] });
  });

  it('keeps per-session seq independent', async () => {
    await store.createSession(meta({ id: 'sess-1' }));
    await store.createSession(meta({ id: 'sess-2' }));
    await store.appendEvent(ref, 'client/prompt');
    await store.appendEvent(ref, 'client/stop');
    const other = await store.appendEvent(
      { projectId: 'proj-1', sessionId: 'sess-2' },
      'client/prompt'
    );
    expect(other.seq).toBe(0);
    expect((await store.readEvents(ref)).events).toHaveLength(2);
  });

  it('appends to a session directory that does not exist yet', async () => {
    // Crash between directory creation and the first append is the same shape.
    const event = await store.appendEvent(
      { projectId: 'proj-2', sessionId: 'sess-9' },
      'client/session_created'
    );
    expect(event.seq).toBe(0);
  });
});

describe('SessionStore.checkpointTranscript', () => {
  const transcriptPath = (): string =>
    path.join(root, 'projects', 'proj-1', 'sessions', 'sess-1', 'transcript.md');

  it('never lets an older overlapping checkpoint overwrite a newer one', async () => {
    // The periodic checkpoint reads at T0 and the turn-end one at T1. Without
    // serialization the older render can land last and drop the completed turn.
    await store.createSession(meta({ title: 'First question' }));
    await store.appendEvent(ref, 'client/prompt', { text: 'First question' }, 1);

    const early = store.checkpointTranscript(ref);
    await store.appendEvent(ref, 'client/prompt', { text: 'Second question' }, 1);
    const late = store.checkpointTranscript(ref);
    await Promise.all([early, late]);

    // The file reflects the newer snapshot, whichever render finished first.
    const rendered = await fs.readFile(transcriptPath(), 'utf8');
    expect(rendered).toContain('Second question');
  });

  it('renders transcript.md from the log and rewrites it on the next checkpoint', async () => {
    await store.createSession(meta({ title: 'First question' }));
    await store.appendEvent(ref, 'client/prompt', { text: 'First question' }, 1);
    await store.appendEvent(
      ref,
      'acp/session_update',
      { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'An answer.' } },
      1
    );
    await store.appendEvent(ref, 'client/stop', { stopReason: 'end_turn' }, 1);

    await store.checkpointTranscript(ref);
    const first = await fs.readFile(transcriptPath(), 'utf8');
    expect(first).toContain('# First question');
    expect(first).toContain('An answer.');
    expect(first).toContain('_Stopped: end_turn_');

    // A second turn lands, and the derived file follows the log.
    await store.appendEvent(ref, 'client/prompt', { text: 'Second question' }, 1);
    await store.checkpointTranscript(ref);
    const second = await fs.readFile(transcriptPath(), 'utf8');
    expect(second).toContain('Second question');
    expect(second).toContain('## Turn 2');
  });

  it('is rebuildable: deleting transcript.md loses nothing the log still holds', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'client/prompt', { text: 'hello' }, 1);
    await store.checkpointTranscript(ref);
    const rendered = await fs.readFile(transcriptPath(), 'utf8');

    await fs.rm(transcriptPath());
    await store.checkpointTranscript(ref);
    expect(await fs.readFile(transcriptPath(), 'utf8')).toBe(rendered);
  });

  it('marks a truncated tail interrupted without needing the meta status', async () => {
    await store.createSession(meta());
    await store.appendEvent(ref, 'client/prompt', { text: 'hello' }, 1);
    await store.closeSession(ref);
    // The crash-mid-append shape: a half-written final line.
    await fs.appendFile(
      path.join(root, 'projects', 'proj-1', 'sessions', 'sess-1', 'events.jsonl'),
      '{"seq":1,"ts":"2026-07-2'
    );

    await store.checkpointTranscript(ref);
    expect(await fs.readFile(transcriptPath(), 'utf8')).toContain('interrupted');
  });

  it('renders a real pi-acp turn into readable markdown', async () => {
    // Copied verbatim from the STEP-22-04 recorded corpus (see event-log.test.ts
    // for why these lines are copied rather than imported).
    await store.createSession(meta({ title: 'say hello', harnessId: 'pi' }));
    const eventsPath = path.join(root, 'projects', 'proj-1', 'sessions', 'sess-1', 'events.jsonl');
    await fs.writeFile(
      eventsPath,
      [
        '{"seq":0,"ts":"2026-07-14T12:00:00.000Z","protocolVersion":1,"kind":"client/session_created","payload":{"sessionId":"sess-pi-01","cwd":"/<HOME>/dev/demo"}}',
        '{"seq":1,"ts":"2026-07-14T12:00:00.100Z","protocolVersion":1,"kind":"client/prompt","payload":{"text":"say hello"}}',
        '{"seq":2,"ts":"2026-07-14T12:00:00.300Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-01","update":{"sessionUpdate":"agent_thought_chunk","content":{"type":"text","text":"thinking"}}}}',
        '{"seq":3,"ts":"2026-07-14T12:05:00.400Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-01","update":{"sessionUpdate":"tool_call","toolCallId":"call-1","title":"Run `ls -la`","kind":"execute","status":"in_progress","rawInput":{"command":"ls","args":["-la"],"cwd":"/<HOME>/dev/demo"}}}}',
        '{"seq":4,"ts":"2026-07-14T12:05:01.400Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-01","update":{"sessionUpdate":"tool_call_update","toolCallId":"call-1","status":"completed"}}}',
        '{"seq":5,"ts":"2026-07-14T12:05:02.000Z","protocolVersion":1,"kind":"acp/session_update","payload":{"sessionId":"sess-pi-01","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"Hello!"}}}}',
        '{"seq":6,"ts":"2026-07-14T12:05:02.100Z","protocolVersion":1,"kind":"client/stop","payload":{"stopReason":"end_turn"}}',
        '',
      ].join('\n')
    );

    await store.checkpointTranscript(ref);
    expect(await fs.readFile(transcriptPath(), 'utf8')).toBe(
      [
        '# say hello',
        '',
        '- Session: `sess-1`',
        '- Project: `proj-1`',
        '- Harness: pi',
        '- Status: idle',
        '- Created: 2026-07-27T00:00:00.000Z',
        '',
        '## Turn 1',
        '',
        '**User**',
        '',
        'say hello',
        '',
        '- Tool (execute) **Run `ls -la`** — completed',
        '',
        '**Agent**',
        '',
        'Hello!',
        '',
        '_1 thought chunk_',
        '',
        '_Stopped: end_turn_',
        '',
      ].join('\n')
    );
  });
});
