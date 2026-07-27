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

// ─── Tool-call value types (STEP-23-02) ───

/** ACP tool-call lifecycle. `completed`/`failed` are terminal. */
export const TOOL_CALL_STATUSES = ['pending', 'in_progress', 'completed', 'failed'] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

const TERMINAL_STATUSES: readonly ToolCallStatus[] = ['completed', 'failed'];

/** Every ACP tool kind (protocol v1). Unknown kinds normalize to `other`. */
export const TOOL_KINDS = [
  'read',
  'edit',
  'delete',
  'move',
  'search',
  'execute',
  'think',
  'fetch',
  'switch_mode',
  'other',
] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];

/** A file the call touched. `line` is 1-based when the agent supplies one. */
export interface ToolCallLocation {
  readonly path: string;
  readonly line: number | null;
}

/**
 * One parsed tool-call content block. The three ACP shapes we render are text,
 * `diff`, and `terminal`; anything else is preserved verbatim as `unsupported`
 * so the card can say "we received something we don't render" instead of
 * silently dropping evidence of agent activity (ARCH-0009 tolerant reader).
 */
export type ToolCallContent =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'diff';
      readonly path: string;
      /** `null` for a new file — there is no previous revision. */
      readonly oldText: string | null;
      readonly newText: string;
    }
  | { readonly type: 'terminal'; readonly terminalId: string }
  | { readonly type: 'unsupported'; readonly raw: unknown };

/** A run of text chunks from one speaker. `open` while more chunks may append. */
export interface TextSegment extends SegmentBase {
  readonly kind: 'user_message' | 'agent_message' | 'thought';
  readonly text: string;
  readonly open: boolean;
  /**
   * Set on a user prompt whose turn never ran. The composer hands the text back
   * so it can be retried, and the retry appends a second identical message —
   * without this the two are indistinguishable and the transcript reads as if
   * the user said the same thing twice.
   */
  readonly failed?: boolean;
}

/**
 * A tool call, folded from its opening `tool_call` frame plus every
 * `tool_call_update` that follows (24 updates for one file write is the measured
 * Pi cadence — see the STEP-22-05 spike). Identity is `toolCallId`; the segment
 * keeps its position and `id` across every merge so the card never jumps.
 */
export interface ToolCallSegment extends SegmentBase {
  readonly kind: 'tool_call';
  readonly toolCallId: string;
  readonly title: string;
  readonly status: ToolCallStatus;
  readonly toolKind: ToolKind;
  /** Parsed content blocks. Replaced wholesale by any update that carries them. */
  readonly content: readonly ToolCallContent[];
  readonly locations: readonly ToolCallLocation[];
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
  /** Marks the newest user prompt as never-run, so a retry is not a duplicate. */
  | { readonly type: 'prompt_failed' }
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

// ─── Tool-call parsing (STEP-23-02) ───

function asToolCallStatus(value: unknown): ToolCallStatus | null {
  return typeof value === 'string' && (TOOL_CALL_STATUSES as readonly string[]).includes(value)
    ? (value as ToolCallStatus)
    : null;
}

function asToolKind(value: unknown): ToolKind {
  // Unknown kinds are not an error: the protocol may grow kinds we predate, and
  // `other` is exactly the bucket the spec provides for them.
  return typeof value === 'string' && (TOOL_KINDS as readonly string[]).includes(value)
    ? (value as ToolKind)
    : 'other';
}

/**
 * Parses one tool-call content block. ACP wraps ordinary content in
 * `{ type: 'content', content: <ContentBlock> }`, but adapters in the wild also
 * emit the bare content block, so both are accepted. Anything unrecognized is
 * kept as `unsupported` rather than dropped.
 */
function parseContentBlock(raw: unknown): ToolCallContent {
  if (!isRecord(raw)) return { type: 'unsupported', raw };
  switch (raw['type']) {
    case 'content': {
      const inner = raw['content'];
      if (isRecord(inner) && inner['type'] === 'text' && typeof inner['text'] === 'string') {
        return { type: 'text', text: inner['text'] };
      }
      return { type: 'unsupported', raw };
    }
    case 'text':
      return typeof raw['text'] === 'string'
        ? { type: 'text', text: raw['text'] }
        : { type: 'unsupported', raw };
    case 'diff': {
      const path = raw['path'];
      const newText = raw['newText'];
      // A diff with no `newText` is not renderable as a diff; keep it visible as
      // an unsupported block instead of pretending the file became empty.
      if (typeof path !== 'string' || typeof newText !== 'string') {
        return { type: 'unsupported', raw };
      }
      return {
        type: 'diff',
        path,
        oldText: typeof raw['oldText'] === 'string' ? raw['oldText'] : null,
        newText,
      };
    }
    case 'terminal': {
      const terminalId = raw['terminalId'];
      return typeof terminalId === 'string'
        ? { type: 'terminal', terminalId }
        : { type: 'unsupported', raw };
    }
    default:
      return { type: 'unsupported', raw };
  }
}

function parseContent(value: unknown): readonly ToolCallContent[] | null {
  if (!Array.isArray(value)) return null;
  return value.map(parseContentBlock);
}

function parseLocations(value: unknown): readonly ToolCallLocation[] | null {
  if (!Array.isArray(value)) return null;
  const locations: ToolCallLocation[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const path = entry['path'];
    if (typeof path !== 'string' || path === '') continue;
    const line = entry['line'];
    locations.push({ path, line: typeof line === 'number' && Number.isFinite(line) ? line : null });
  }
  return locations;
}

/**
 * Terminal status wins. A late frame that arrives after the turn ended — or an
 * out-of-order `in_progress` behind a `completed` — must not walk a finished
 * call backwards into a spinner that never resolves. Terminal→terminal
 * transitions (`completed` → `failed`) still apply: that is new information.
 */
function mergeStatus(existing: ToolCallStatus, incoming: ToolCallStatus | null): ToolCallStatus {
  if (incoming === null) return existing;
  if (TERMINAL_STATUSES.includes(existing) && !TERMINAL_STATUSES.includes(incoming)) return existing;
  return incoming;
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
    status: asToolCallStatus(body['status']) ?? 'pending',
    toolKind: asToolKind(body['kind']),
    content: parseContent(body['content']) ?? [],
    locations: parseLocations(body['locations']) ?? [],
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
    status: mergeStatus(existing.status, asToolCallStatus(body['status'])),
    title: typeof body['title'] === 'string' ? body['title'] : existing.title,
    // Per spec an update carries the FULL content list, so a present list
    // replaces rather than appends; an absent one leaves what we already have.
    content: parseContent(body['content']) ?? existing.content,
    locations: parseLocations(body['locations']) ?? existing.locations,
    // `kind` is normally set once, but an adapter that only learns the kind
    // mid-call must be able to correct it.
    toolKind: typeof body['kind'] === 'string' ? asToolKind(body['kind']) : existing.toolKind,
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
    case 'prompt_failed': {
      // The newest user message, not the newest segment: a failed turn may still
      // have streamed agent output before it died.
      let index = state.segments.length - 1;
      while (index >= 0 && state.segments[index]!.kind !== 'user_message') index -= 1;
      if (index < 0) return state;
      const segments = [...state.segments];
      segments[index] = { ...(segments[index] as TextSegment), failed: true };
      return { ...state, segments };
    }
    case 'close_open':
      return { ...state, segments: closeTrailing(state.segments) };
    case 'reset':
      return initialTranscriptState;
    default:
      return state;
  }
}
