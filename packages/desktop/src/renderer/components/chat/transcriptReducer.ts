/**
 * Pure reducer folding raw ACP `session/update` notifications into an ordered
 * transcript. No React, no IPC — everything here is deterministic and testable
 * from a scripted update array (PHASE-23, STEP-23-01).
 *
 * Two rules dominate the design and are load-bearing for every later step:
 *
 * 1. **Arrival order IS transcript order.** Segments are appended in the order
 *    their updates arrive and are never regrouped by kind. A run of chunks
 *    coalesces into the trailing segment ONLY while that segment is open and of
 *    the same kind; any recognized update of a different kind closes the
 *    trailing segment, so `message → tool_call → message` yields two distinct
 *    message segments with the tool call between them — never one merged
 *    message wrapped around the call.
 *
 * 2. **Tolerant reader (ARCH-0009).** Unknown `sessionUpdate` kinds, malformed
 *    frames, and missing fields are ignored, never thrown. The STEP-22-05 spike
 *    observed `session_info_update`, which the mock does not even script.
 *    Deliberately, an ignored update does NOT close the trailing segment: the
 *    spike saw unknown frames interleaved mid-message, and closing on them would
 *    shred one agent message into several bubbles for no user-visible reason.
 *
 * Segment ids are assigned from a monotonic counter and are never reused or
 * renumbered, so they are stable React keys across appends.
 */

export type SegmentKind = 'user_message' | 'agent_message' | 'thought' | 'tool_call';

interface SegmentBase {
  /** Stable logical id (`seg-<n>`). Never reused, never renumbered. */
  readonly id: string;
  readonly kind: SegmentKind;
}

/** A run of text chunks from one speaker. `open` while more chunks may append. */
export interface TextSegment extends SegmentBase {
  readonly kind: 'user_message' | 'agent_message' | 'thought';
  readonly text: string;
  readonly open: boolean;
}

/**
 * A tool call. STEP-23-02 owns the rich card (diffs, terminal embeds); this step
 * stores the raw fields and renders a minimal placeholder so ordering is right.
 */
export interface ToolCallSegment extends SegmentBase {
  readonly kind: 'tool_call';
  readonly toolCallId: string;
  readonly title: string;
  readonly status: string;
  readonly toolKind: string | null;
  readonly content: unknown;
  readonly rawInput: unknown;
  readonly rawOutput: unknown;
}

export type Segment = TextSegment | ToolCallSegment;

export interface TranscriptState {
  readonly segments: readonly Segment[];
  /** Next logical id to hand out. Monotonic; never decreases within a session. */
  readonly nextSegmentId: number;
  /** Latest `plan` payload. Rendered by STEP-23-02's plan panel. */
  readonly plan: unknown;
  /** Latest `available_commands_update` payload. Consumed by STEP-23-04. */
  readonly availableCommands: unknown;
  /** Latest `current_mode_update` mode id. Consumed by STEP-23-04. */
  readonly currentModeId: string | null;
  /** How many updates the tolerant reader ignored. Diagnostics only. */
  readonly ignoredUpdateCount: number;
}

export const initialTranscriptState: TranscriptState = {
  segments: [],
  nextSegmentId: 1,
  plan: null,
  availableCommands: null,
  currentModeId: null,
  ignoredUpdateCount: 0,
};

export type TranscriptAction =
  /** One raw ACP `session/update` notification, exactly as it crossed IPC. */
  | { readonly type: 'update'; readonly notification: unknown }
  /** Several notifications at once (rAF-coalesced batches from the view). */
  | { readonly type: 'updates'; readonly notifications: readonly unknown[] }
  /** Locally appended user turn — the user's own text never arrives as a frame. */
  | { readonly type: 'user_prompt'; readonly text: string }
  /** Closes any open segment (turn ended, cancelled, or interrupted). */
  | { readonly type: 'close_open' }
  /** New session: drop everything, including the id counter. */
  | { readonly type: 'reset' };

const TEXT_CHUNK_KINDS: Record<string, TextSegment['kind']> = {
  user_message_chunk: 'user_message',
  agent_message_chunk: 'agent_message',
  agent_thought_chunk: 'thought',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Unwraps the `update` body of a `session/update` notification. Accepts either
 * the full notification (`{ sessionId, update: {...} }`) or a bare update body,
 * because the dev console proved both shapes reach the renderer depending on how
 * the frame was constructed. Returns null when there is no usable body.
 */
function updateBody(notification: unknown): Record<string, unknown> | null {
  if (!isRecord(notification)) return null;
  const inner = notification['update'];
  if (isRecord(inner) && typeof inner['sessionUpdate'] === 'string') return inner;
  if (typeof notification['sessionUpdate'] === 'string') return notification;
  return null;
}

/** Extracts text from an ACP content block. Non-text blocks contribute nothing. */
function chunkText(body: Record<string, unknown>): string | null {
  const content = body['content'];
  if (!isRecord(content)) return null;
  if (content['type'] !== 'text') return null;
  const text = content['text'];
  return typeof text === 'string' ? text : null;
}

function closeTrailing(segments: readonly Segment[]): readonly Segment[] {
  const last = segments[segments.length - 1];
  if (last === undefined || last.kind === 'tool_call' || !last.open) return segments;
  return [...segments.slice(0, -1), { ...last, open: false }];
}

/**
 * Appends `text` to the trailing segment when it is an open segment of `kind`;
 * otherwise closes the trailing segment and starts a new one. This single
 * function is where rule (1) lives.
 */
function appendChunk(state: TranscriptState, kind: TextSegment['kind'], text: string): TranscriptState {
  const last = state.segments[state.segments.length - 1];
  if (last !== undefined && last.kind !== 'tool_call' && last.kind === kind && last.open) {
    const merged: TextSegment = { ...last, text: last.text + text };
    return { ...state, segments: [...state.segments.slice(0, -1), merged] };
  }
  const segment: TextSegment = {
    id: `seg-${state.nextSegmentId}`,
    kind,
    text,
    open: true,
  };
  return {
    ...state,
    segments: [...closeTrailing(state.segments), segment],
    nextSegmentId: state.nextSegmentId + 1,
  };
}

function applyToolCall(state: TranscriptState, body: Record<string, unknown>): TranscriptState {
  const toolCallId = typeof body['toolCallId'] === 'string' ? body['toolCallId'] : null;
  if (toolCallId === null) return ignore(state);
  const segment: ToolCallSegment = {
    id: `seg-${state.nextSegmentId}`,
    kind: 'tool_call',
    toolCallId,
    title: typeof body['title'] === 'string' ? body['title'] : toolCallId,
    status: typeof body['status'] === 'string' ? body['status'] : 'pending',
    toolKind: typeof body['kind'] === 'string' ? body['kind'] : null,
    content: body['content'] ?? null,
    rawInput: body['rawInput'] ?? null,
    rawOutput: body['rawOutput'] ?? null,
  };
  return {
    ...state,
    segments: [...closeTrailing(state.segments), segment],
    nextSegmentId: state.nextSegmentId + 1,
  };
}

/**
 * Mutates the matching call segment in place (status/title/content), preserving
 * its position and id so the card does not jump. An update for a call we never
 * saw is appended as a new segment — the tolerant reader must not drop a tool
 * call just because its opening frame went missing.
 */
function applyToolCallUpdate(state: TranscriptState, body: Record<string, unknown>): TranscriptState {
  const toolCallId = typeof body['toolCallId'] === 'string' ? body['toolCallId'] : null;
  if (toolCallId === null) return ignore(state);
  const index = state.segments.findIndex(
    (segment) => segment.kind === 'tool_call' && segment.toolCallId === toolCallId,
  );
  if (index === -1) return applyToolCall(state, body);
  const existing = state.segments[index] as ToolCallSegment;
  const merged: ToolCallSegment = {
    ...existing,
    status: typeof body['status'] === 'string' ? body['status'] : existing.status,
    title: typeof body['title'] === 'string' ? body['title'] : existing.title,
    content: body['content'] ?? existing.content,
    rawInput: body['rawInput'] ?? existing.rawInput,
    rawOutput: body['rawOutput'] ?? existing.rawOutput,
  };
  const segments = [...state.segments];
  segments[index] = merged;
  // Still a different-kind update: an open text run before it must be closed so
  // later chunks start a fresh bubble after the call.
  return { ...state, segments: closeTrailing(segments) };
}

function ignore(state: TranscriptState): TranscriptState {
  return { ...state, ignoredUpdateCount: state.ignoredUpdateCount + 1 };
}

function applyNotification(state: TranscriptState, notification: unknown): TranscriptState {
  const body = updateBody(notification);
  if (body === null) return ignore(state);
  const sessionUpdate = body['sessionUpdate'] as string;

  const textKind = TEXT_CHUNK_KINDS[sessionUpdate];
  if (textKind !== undefined) {
    const text = chunkText(body);
    // Whitespace still matters mid-run (it separates words), but a chunk with no
    // text block at all must not open an empty bubble.
    if (text === null || text === '') return ignore(state);
    return appendChunk(state, textKind, text);
  }

  switch (sessionUpdate) {
    case 'tool_call':
      return applyToolCall(state, body);
    case 'tool_call_update':
      return applyToolCallUpdate(state, body);
    case 'plan':
      return { ...state, segments: closeTrailing(state.segments), plan: body['entries'] ?? null };
    case 'available_commands_update':
      return { ...state, availableCommands: body['availableCommands'] ?? null };
    case 'current_mode_update':
      return {
        ...state,
        currentModeId: typeof body['currentModeId'] === 'string' ? body['currentModeId'] : null,
      };
    default:
      // Unknown kind (e.g. the spike's `session_info_update`): counted, ignored,
      // and deliberately NOT segment-closing. Never a throw.
      return ignore(state);
  }
}

export function transcriptReducer(state: TranscriptState, action: TranscriptAction): TranscriptState {
  switch (action.type) {
    case 'update':
      return applyNotification(state, action.notification);
    case 'updates':
      return action.notifications.reduce<TranscriptState>(applyNotification, state);
    case 'user_prompt': {
      if (action.text === '') return state;
      const withClosed = { ...state, segments: closeTrailing(state.segments) };
      const segment: TextSegment = {
        id: `seg-${withClosed.nextSegmentId}`,
        kind: 'user_message',
        text: action.text,
        // A locally added user turn is complete on arrival: no chunks follow it,
        // so leaving it open would let a stray `user_message_chunk` echo append
        // to the text the user actually typed.
        open: false,
      };
      return {
        ...withClosed,
        segments: [...withClosed.segments, segment],
        nextSegmentId: withClosed.nextSegmentId + 1,
      };
    }
    case 'close_open':
      return { ...state, segments: closeTrailing(state.segments) };
    case 'reset':
      return initialTranscriptState;
    default:
      return state;
  }
}
