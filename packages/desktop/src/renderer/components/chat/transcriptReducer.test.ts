import { describe, expect, it } from 'vitest';
import {
  initialTranscriptState,
  transcriptReducer,
  type Segment,
  type TextSegment,
  type ToolCallSegment,
  type TranscriptState,
} from './transcriptReducer.js';

/**
 * The reducer is the contract every later Phase-23 step builds on, so these
 * tests script update sequences shaped like the STEP-22-05 spike's measured mix
 * (interleaved thought/message/tool frames plus kinds nobody scripted).
 */

const chunk = (sessionUpdate: string, text: string): unknown => ({
  sessionId: 'acp-1',
  update: { sessionUpdate, content: { type: 'text', text } },
});

const agent = (text: string): unknown => chunk('agent_message_chunk', text);
const thought = (text: string): unknown => chunk('agent_thought_chunk', text);

const toolCall = (toolCallId: string, overrides: Record<string, unknown> = {}): unknown => ({
  sessionId: 'acp-1',
  update: { sessionUpdate: 'tool_call', toolCallId, title: 'Read file', kind: 'read', status: 'in_progress', ...overrides },
});

const toolCallUpdate = (toolCallId: string, overrides: Record<string, unknown> = {}): unknown => ({
  sessionId: 'acp-1',
  update: { sessionUpdate: 'tool_call_update', toolCallId, ...overrides },
});

function feed(notifications: readonly unknown[], from: TranscriptState = initialTranscriptState): TranscriptState {
  return notifications.reduce<TranscriptState>(
    (state, notification) => transcriptReducer(state, { type: 'update', notification }),
    from,
  );
}

const texts = (segments: readonly Segment[]): string[] =>
  segments.map((segment) => (segment.kind === 'tool_call' ? `[tool:${segment.toolCallId}]` : segment.text));

const kinds = (segments: readonly Segment[]): string[] => segments.map((segment) => segment.kind);

describe('transcriptReducer — chunk coalescing', () => {
  it('coalesces a run of same-kind chunks into one segment', () => {
    const state = feed([agent('Hello '), agent('from '), agent('the agent.')]);
    expect(state.segments).toHaveLength(1);
    expect((state.segments[0] as TextSegment).text).toBe('Hello from the agent.');
    expect((state.segments[0] as TextSegment).open).toBe(true);
  });

  it('keeps thought and message runs in separate segments in arrival order', () => {
    const state = feed([thought('Planning.'), agent('Answer.'), thought('More thinking.')]);
    expect(kinds(state.segments)).toEqual(['thought', 'agent_message', 'thought']);
    expect(texts(state.segments)).toEqual(['Planning.', 'Answer.', 'More thinking.']);
  });
});

describe('transcriptReducer — segment boundaries', () => {
  it('does NOT merge message chunks across an intervening tool_call', () => {
    const state = feed([agent('Before. '), toolCall('t1'), agent('After.')]);
    expect(kinds(state.segments)).toEqual(['agent_message', 'tool_call', 'agent_message']);
    expect(texts(state.segments)).toEqual(['Before. ', '[tool:t1]', 'After.']);
    // The first message must be closed — it can never receive more chunks.
    expect((state.segments[0] as TextSegment).open).toBe(false);
    expect((state.segments[2] as TextSegment).open).toBe(true);
  });

  it('does NOT merge message chunks across an intervening thought chunk', () => {
    const state = feed([agent('Before. '), thought('Hmm.'), agent('After.')]);
    expect(kinds(state.segments)).toEqual(['agent_message', 'thought', 'agent_message']);
    expect(texts(state.segments)).toEqual(['Before. ', 'Hmm.', 'After.']);
  });

  it('closes an open message run when a tool_call_update for a known call arrives', () => {
    const state = feed([toolCall('t1'), agent('Before. '), toolCallUpdate('t1', { status: 'completed' }), agent('After.')]);
    expect(kinds(state.segments)).toEqual(['tool_call', 'agent_message', 'agent_message']);
    expect(texts(state.segments)).toEqual(['[tool:t1]', 'Before. ', 'After.']);
  });

  it('a locally added user prompt closes the preceding open run', () => {
    const streamed = feed([agent('Previous answer.')]);
    const state = transcriptReducer(streamed, { type: 'user_prompt', text: 'next question' });
    expect(kinds(state.segments)).toEqual(['agent_message', 'user_message']);
    expect((state.segments[0] as TextSegment).open).toBe(false);
    // The user turn is complete on arrival, so a stray echo cannot append to it.
    expect((state.segments[1] as TextSegment).open).toBe(false);
  });
});

describe('transcriptReducer — segment id stability', () => {
  it('keeps ids stable as later chunks and segments are appended', () => {
    const first = feed([agent('One. '), toolCall('t1')]);
    const idsBefore = first.segments.map((segment) => segment.id);

    const later = feed([agent('Two. '), agent('Three.'), toolCall('t2')], first);
    const idsAfter = later.segments.map((segment) => segment.id);

    expect(idsAfter.slice(0, idsBefore.length)).toEqual(idsBefore);
    expect(new Set(idsAfter).size).toBe(idsAfter.length);
  });

  it('never reuses an id, even after a segment is closed and a new one opens', () => {
    const state = feed([agent('a'), thought('b'), agent('c'), thought('d')]);
    expect(state.segments.map((segment) => segment.id)).toEqual(['seg-1', 'seg-2', 'seg-3', 'seg-4']);
  });

  it('resets the counter only on an explicit reset', () => {
    const state = transcriptReducer(feed([agent('a'), thought('b')]), { type: 'reset' });
    expect(state).toEqual(initialTranscriptState);
  });
});

describe('transcriptReducer — tool call updates', () => {
  it('mutates the existing call in place instead of appending', () => {
    const state = feed([toolCall('t1'), toolCallUpdate('t1', { status: 'completed', title: 'Read src/index.ts' })]);
    expect(state.segments).toHaveLength(1);
    const call = state.segments[0] as ToolCallSegment;
    expect(call.id).toBe('seg-1');
    expect(call.status).toBe('completed');
    expect(call.title).toBe('Read src/index.ts');
  });

  it('appends an update for a call whose opening frame was never seen', () => {
    const state = feed([toolCallUpdate('orphan', { status: 'completed' })]);
    expect(state.segments).toHaveLength(1);
    expect((state.segments[0] as ToolCallSegment).toolCallId).toBe('orphan');
  });

  it('ignores a tool frame with no toolCallId rather than crashing', () => {
    const state = feed([{ sessionId: 'acp-1', update: { sessionUpdate: 'tool_call', title: 'nameless' } }]);
    expect(state.segments).toHaveLength(0);
    expect(state.ignoredUpdateCount).toBe(1);
  });
});

describe('transcriptReducer — tolerant reader (ARCH-0009)', () => {
  it('ignores unknown sessionUpdate kinds without crashing or closing a run', () => {
    // The spike observed `session_info_update` interleaved mid-message; closing
    // the run on it would split one agent message into two bubbles.
    const state = feed([
      agent('Before '),
      { sessionId: 'acp-1', update: { sessionUpdate: 'session_info_update', info: { tokens: 12 } } },
      agent('after.'),
    ]);
    expect(state.segments).toHaveLength(1);
    expect((state.segments[0] as TextSegment).text).toBe('Before after.');
    expect(state.ignoredUpdateCount).toBe(1);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'nonsense'],
    ['an empty object', {}],
    ['a frame with no sessionUpdate', { sessionId: 'acp-1', update: {} }],
    ['a frame with a non-string sessionUpdate', { sessionId: 'acp-1', update: { sessionUpdate: 7 } }],
  ])('ignores %s', (_label, notification) => {
    const state = feed([notification]);
    expect(state.segments).toHaveLength(0);
    expect(state.ignoredUpdateCount).toBe(1);
  });

  it('accepts a bare update body as well as a wrapped notification', () => {
    const state = feed([{ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'bare' } }]);
    expect(texts(state.segments)).toEqual(['bare']);
  });

  it('ignores non-text content blocks and empty chunks so no empty bubble appears', () => {
    const state = feed([
      { sessionId: 'acp-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'image', data: 'x' } } },
      { sessionId: 'acp-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '' } } },
      { sessionId: 'acp-1', update: { sessionUpdate: 'agent_message_chunk' } },
    ]);
    expect(state.segments).toHaveLength(0);
    expect(state.ignoredUpdateCount).toBe(3);
  });

  it('preserves whitespace-only chunks inside an open run (they separate words)', () => {
    const state = feed([agent('one'), agent(' '), agent('two')]);
    expect((state.segments[0] as TextSegment).text).toBe('one two');
  });
});

describe('transcriptReducer — side-channel state for later steps', () => {
  it('stores plan, available commands, and current mode without polluting the transcript', () => {
    const state = feed([
      agent('working'),
      { sessionId: 'acp-1', update: { sessionUpdate: 'plan', entries: [{ content: 'step one', status: 'pending' }] } },
      { sessionId: 'acp-1', update: { sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'test' }] } },
      { sessionId: 'acp-1', update: { sessionUpdate: 'current_mode_update', currentModeId: 'plan' } },
    ]);
    expect(kinds(state.segments)).toEqual(['agent_message']);
    expect(state.plan).toEqual([{ content: 'step one', status: 'pending' }]);
    expect(state.availableCommands).toEqual([{ name: 'test' }]);
    expect(state.currentModeId).toBe('plan');
    expect(state.ignoredUpdateCount).toBe(0);
  });
});

describe('transcriptReducer — batching and turn end', () => {
  it('applies a batch identically to the same updates applied one by one', () => {
    const sequence = [thought('t1 '), thought('t2'), agent('a1 '), toolCall('t1'), agent('a2')];
    const oneByOne = feed(sequence);
    const batched = transcriptReducer(initialTranscriptState, { type: 'updates', notifications: sequence });
    expect(batched).toEqual(oneByOne);
  });

  it('close_open ends the trailing run so an interrupted turn cannot absorb later chunks', () => {
    const streaming = feed([agent('half a sentence')]);
    const ended = transcriptReducer(streaming, { type: 'close_open' });
    expect((ended.segments[0] as TextSegment).open).toBe(false);
    const resumed = feed([agent('new turn')], ended);
    expect(kinds(resumed.segments)).toEqual(['agent_message', 'agent_message']);
  });

  it('close_open on an empty transcript is a no-op', () => {
    expect(transcriptReducer(initialTranscriptState, { type: 'close_open' })).toEqual(initialTranscriptState);
  });

  it('handles the spike-shaped volume mix without dropping or reordering anything', () => {
    // 37 thought chunks + 23 message chunks + 1 tool_call + 24 tool_call_updates,
    // interleaved, plus unscripted kinds — the STEP-22-05 measured shape.
    const sequence: unknown[] = [];
    for (let index = 0; index < 37; index += 1) sequence.push(thought(`th${index} `));
    sequence.push(toolCall('t1'));
    for (let index = 0; index < 24; index += 1) sequence.push(toolCallUpdate('t1', { status: 'in_progress' }));
    for (let index = 0; index < 23; index += 1) {
      sequence.push(agent(`m${index} `));
      if (index % 5 === 0) sequence.push({ sessionId: 'acp-1', update: { sessionUpdate: 'session_info_update' } });
    }
    const state = feed(sequence);

    expect(kinds(state.segments)).toEqual(['thought', 'tool_call', 'agent_message']);
    expect((state.segments[0] as TextSegment).text.startsWith('th0 th1 ')).toBe(true);
    expect((state.segments[2] as TextSegment).text.startsWith('m0 m1 ')).toBe(true);
    expect((state.segments[2] as TextSegment).text.endsWith('m22 ')).toBe(true);
    expect(state.ignoredUpdateCount).toBe(5);
  });
});
