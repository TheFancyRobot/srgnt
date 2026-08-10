import type { Session, SessionEvent } from '@srgnt/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { renderTranscript } from './transcript.js';

const META: Session = {
  id: 'sess-1',
  projectId: 'proj-1',
  harnessId: 'mock',
  kind: 'single',
  status: 'idle',
  title: 'Explain the file',
  createdAt: '2026-01-01T00:00:00.000Z',
};

let seq = 0;
function event(kind: string, payload?: unknown): SessionEvent {
  seq += 1;
  return { seq, ts: '2026-01-01T00:00:01.000Z', protocolVersion: 1, kind, ...(payload === undefined ? {} : { payload }) };
}

function update(body: Record<string, unknown>): SessionEvent {
  return event('acp/session_update', body);
}

function chunk(sessionUpdate: string, text: string): SessionEvent {
  return update({ sessionUpdate, content: { type: 'text', text } });
}

describe('renderTranscript', () => {
  it('renders a header from meta and one section per turn', () => {
    const markdown = renderTranscript(
      [
        event('client/session_created', { target: 'mock' }),
        event('client/prompt', { text: 'Explain the file' }),
        chunk('agent_message_chunk', 'It is '),
        chunk('agent_message_chunk', 'a module.'),
        event('client/stop', { stopReason: 'end_turn' }),
      ],
      META,
    );

    expect(markdown).toContain('# Explain the file');
    expect(markdown).toContain('- Session: `sess-1`');
    expect(markdown).toContain('- Harness: mock');
    expect(markdown).toContain('## Turn 1');
    expect(markdown).toContain('**User**');
    expect(markdown).toContain('Explain the file');
    // Consecutive agent chunks coalesce, exactly as they do live.
    expect(markdown).toContain('It is a module.');
    expect(markdown).toContain('_Stopped: end_turn_');
    expect(markdown.endsWith('\n')).toBe(true);
    expect(markdown.endsWith('\n\n')).toBe(false);
  });

  it('splits agent runs around a tool call instead of merging them', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'go' }),
        chunk('agent_message_chunk', 'before'),
        update({ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read file', kind: 'read', status: 'in_progress' }),
        chunk('agent_message_chunk', 'after'),
        event('client/stop', { stopReason: 'end_turn' }),
      ],
      META,
    );

    const body = markdown.slice(markdown.indexOf('## Turn 1'));
    expect(body.indexOf('before')).toBeLessThan(body.indexOf('Read file'));
    expect(body.indexOf('Read file')).toBeLessThan(body.indexOf('after'));
    expect(body).not.toContain('beforeafter');
  });

  it('folds tool_call_update into the call it belongs to, even after the turn ended', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'go' }),
        update({ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Run checks', kind: 'execute', status: 'pending' }),
        event('client/stop', { stopReason: 'end_turn' }),
        // A late frame, after the turn's stop. It must still correct the status.
        update({ sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' }),
      ],
      META,
    );

    expect(markdown).toContain('- Tool (execute) **Run checks** — completed');
    expect(markdown).not.toContain('**Run checks** — pending');
  });

  it('renders an orphan tool_call_update rather than dropping the evidence', () => {
    const markdown = renderTranscript(
      [event('client/prompt', { text: 'go' }), update({ sessionUpdate: 'tool_call_update', toolCallId: 't9', status: 'failed' })],
      META,
    );
    expect(markdown).toContain('**t9** — failed');
  });

  it('summarizes thoughts as a count instead of inlining them', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'go' }),
        chunk('agent_thought_chunk', 'secret reasoning'),
        chunk('agent_thought_chunk', 'more reasoning'),
        event('client/stop', { stopReason: 'end_turn' }),
      ],
      META,
    );
    expect(markdown).toContain('_2 thought chunks_');
    expect(markdown).not.toContain('secret reasoning');
  });

  it('renders permission decisions, client fs activity, reconnects and reaps', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'go' }),
        event('client/permission_decision', { title: 'Edit answer.ts', optionId: 'allow-once' }),
        event('client/fs_write_text_file', { path: 'answer.ts' }),
        event('client/fs_denied', { path: '/etc/passwd' }),
        event('client/reconnected', { via: 'session/load' }),
        event('client/harness_reaped', { reason: 'idle' }),
        event('client/agent_status', { status: 'crashed', message: 'Agent process died on SIGSEGV' }),
      ],
      META,
    );

    expect(markdown).toContain('- Permission **Edit answer.ts** -> allow-once');
    expect(markdown).toContain('- Client wrote `answer.ts`');
    expect(markdown).toContain('- Client denied `/etc/passwd`');
    expect(markdown).toContain('- Reconnected via `session/load`');
    expect(markdown).toContain('reaped for idleness');
    expect(markdown).toContain('- Agent process crashed: Agent process died on SIGSEGV');
  });

  it('does not render spawning/ready status noise', () => {
    const markdown = renderTranscript(
      [event('client/prompt', { text: 'go' }), event('client/agent_status', { status: 'ready' })],
      META,
    );
    expect(markdown).not.toContain('ready');
  });

  it('marks an interrupted session, by truncated tail or by status', () => {
    const events = [event('client/prompt', { text: 'go' }), chunk('agent_message_chunk', 'half')];
    expect(renderTranscript(events, META, { truncatedTail: true })).toContain('interrupted');
    expect(renderTranscript(events, { ...META, status: 'interrupted' })).toContain('interrupted');
    expect(renderTranscript(events, META)).not.toContain('interrupted');
  });

  it('renders a sensible minimal transcript for a session with no turns', () => {
    const markdown = renderTranscript([event('client/session_created', {})], {
      ...META,
      title: undefined,
    });
    expect(markdown).toContain('# sess-1');
    expect(markdown).toContain('_No turns recorded._');
  });

  it('renders a fork header from lineage', () => {
    const markdown = renderTranscript([], { ...META, parentSessionId: 'sess-0' });
    expect(markdown).toContain('- Forked from: `sess-0`');
  });

  it('closes an unfinished turn and starts a new one at the next prompt', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'first' }),
        chunk('agent_message_chunk', 'partial'),
        // No `client/stop`: the app died. The next prompt still opens Turn 2.
        event('client/prompt', { text: 'second' }),
        event('client/stop', { stopReason: 'end_turn' }),
      ],
      META,
    );
    expect(markdown).toContain('## Turn 1');
    expect(markdown).toContain('## Turn 2');
    expect(markdown).toContain('first');
    expect(markdown).toContain('second');
  });

  it('tolerates unknown kinds, unknown update kinds, and malformed payloads', () => {
    const markdown = renderTranscript(
      [
        event('client/prompt', { text: 'go' }),
        event('client/some_future_kind', { anything: true }),
        update({ sessionUpdate: 'session_info_update', info: {} }),
        update({ sessionUpdate: 'plan', entries: [] }),
        event('acp/session_update', 'not an object'),
        event('acp/session_update', null),
        event('client/prompt', 42),
        event('client/stop', undefined),
        event('client/permission_decision', 'nope'),
        event('client/fs_write_text_file', {}),
        event('client/agent_status', []),
      ],
      META,
    );
    expect(markdown).toContain('## Turn 1');
    // A prompt whose payload is unusable still opens a turn, visibly empty.
    expect(markdown).toContain('(empty prompt)');
  });

  it('accepts both the wrapped notification and the bare update body', () => {
    const wrapped = renderTranscript(
      [event('client/prompt', { text: 'go' }), event('acp/session_update', {
        sessionId: 'acp-1',
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hello' } },
      })],
      META,
    );
    const bare = renderTranscript([event('client/prompt', { text: 'go' }), chunk('agent_message_chunk', 'hello')], META);
    expect(wrapped).toContain('hello');
    expect(bare).toContain('hello');
  });
});

describe('renderTranscript determinism (property)', () => {
  /** Envelopes drawn from the real vocabulary plus junk the reader must survive. */
  const eventArb = fc.record({
    seq: fc.nat({ max: 10_000 }),
    ts: fc.constant('2026-01-01T00:00:01.000Z'),
    protocolVersion: fc.nat({ max: 3 }),
    kind: fc.constantFrom(
      'client/prompt',
      'client/stop',
      'client/permission_decision',
      'client/fs_write_text_file',
      'client/session_closed',
      'client/harness_reaped',
      'client/agent_status',
      'acp/session_update',
      'client/totally_unknown',
    ),
    payload: fc.oneof(
      fc.jsonValue(),
      fc.record({
        sessionUpdate: fc.constantFrom(
          'agent_message_chunk',
          'agent_thought_chunk',
          'user_message_chunk',
          'tool_call',
          'tool_call_update',
          'plan',
          'who_knows',
        ),
        toolCallId: fc.string({ maxLength: 8 }),
        title: fc.string({ maxLength: 16 }),
        status: fc.constantFrom('pending', 'in_progress', 'completed', 'failed'),
        content: fc.record({ type: fc.constant('text'), text: fc.string({ maxLength: 32 }) }),
      }),
      fc.record({ text: fc.string({ maxLength: 32 }) }),
      fc.record({ stopReason: fc.constantFrom('end_turn', 'cancelled', 'error') }),
    ),
  }) as fc.Arbitrary<SessionEvent>;

  it('is a pure function of (events, meta): repeated renders are byte-identical', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 60 }), (events) => {
        const first = renderTranscript(events, META);
        const second = renderTranscript(events, META);
        // A fresh structural copy, so nothing can be carried between renders.
        const third = renderTranscript(JSON.parse(JSON.stringify(events)) as SessionEvent[], { ...META });
        expect(second).toBe(first);
        expect(third).toBe(first);
      }),
      { numRuns: 200 },
    );
  });

  it('never throws and always ends in exactly one newline', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 60 }), (events) => {
        const markdown = renderTranscript(events, META, { truncatedTail: events.length % 2 === 0 });
        expect(markdown.endsWith('\n')).toBe(true);
        expect(markdown.endsWith('\n\n')).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('does not mutate the events it renders', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 40 }), (events) => {
        const before = JSON.stringify(events);
        renderTranscript(events, META);
        expect(JSON.stringify(events)).toBe(before);
      }),
      { numRuns: 100 },
    );
  });
});
