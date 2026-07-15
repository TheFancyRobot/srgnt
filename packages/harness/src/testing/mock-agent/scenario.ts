import { Either, Schema } from 'effect';

/**
 * Scenario schema for the scriptable mock ACP agent.
 *
 * A scenario is an ordered list of *directives* the mock agent replays during a
 * single prompt turn (plus a few pre-turn ones executed on `initialize` /
 * `session/new`). It is deliberately test tooling — it lives in `testing/`, not
 * `@srgnt/contracts`, because it models the *agent* side we script against, not
 * a durable app contract (see ARCH-0009). The same JSON is used both in-process
 * and by the standalone stdio bin, so it is validated with an Effect Schema and
 * a tolerant reader.
 *
 * Directive → ACP mapping (SDK `AgentSideConnection`):
 * - `emit_chunks`       → one `session/update` per chunk (`agent_message_chunk`,
 *                         `agent_thought_chunk`, or `user_message_chunk`).
 * - `tool_call`         → `session/update` `tool_call`.
 * - `tool_call_update`  → `session/update` `tool_call_update`.
 * - `plan`              → `session/update` `plan` (full entry list, per spec).
 * - `advertise_commands`→ `session/update` `available_commands_update`.
 * - `set_mode`          → `session/update` `current_mode_update`.
 * - `request_permission`→ `session/request_permission` (agent→client request).
 * - `use_terminal`      → `terminal/create` + output + wait + release.
 * - `read_file`         → `fs/read_text_file` (agent→client request).
 * - `sleep`             → wall-clock delay (streaming realism).
 * - `crash`             → abrupt process death mid-turn (exit N / stream close).
 * - `emit_malformed`    → raw non-JSON-RPC bytes on the wire (stdio bin only).
 * - `expect_prompt`     → assertion on the incoming prompt text.
 * - `expect_cancel`     → block the turn until `session/cancel` arrives.
 */

// ─── Shared enums (mirror the SDK's zod-generated literals) ───

export const SChunkChannel = Schema.Literal('agent', 'thought', 'user');
export type ChunkChannel = Schema.Schema.Type<typeof SChunkChannel>;

export const SToolKind = Schema.Literal(
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
);

export const SToolCallStatus = Schema.Literal('pending', 'in_progress', 'completed', 'failed');

export const SPlanEntryPriority = Schema.Literal('high', 'medium', 'low');
export const SPlanEntryStatus = Schema.Literal('pending', 'in_progress', 'completed');

export const SStopReason = Schema.Literal(
  'end_turn',
  'cancelled',
  'max_tokens',
  'max_turn_requests',
  'refusal',
);
export type StopReason = Schema.Schema.Type<typeof SStopReason>;

const SPermissionOption = Schema.Struct({
  optionId: Schema.String,
  name: Schema.String,
  kind: Schema.optionalWith(Schema.Literal('allow_once', 'allow_always', 'reject_once', 'reject_always'), {
    default: () => 'allow_once' as const,
  }),
});

const SPlanEntry = Schema.Struct({
  content: Schema.String,
  priority: Schema.optionalWith(SPlanEntryPriority, { default: () => 'medium' as const }),
  status: Schema.optionalWith(SPlanEntryStatus, { default: () => 'pending' as const }),
});

const SCommand = Schema.Struct({
  name: Schema.String,
  description: Schema.optionalWith(Schema.String, { default: () => '' }),
});

// ─── Directives (tagged union on `type`) ───

const SEmitChunks = Schema.Struct({
  type: Schema.Literal('emit_chunks'),
  channel: Schema.optionalWith(SChunkChannel, { default: () => 'agent' as const }),
  chunks: Schema.Array(Schema.String),
  /** Delay between chunks (ms) — streaming realism; keep small in tests. */
  delayMs: Schema.optionalWith(Schema.Number, { default: () => 0 }),
});

const SToolCallDirective = Schema.Struct({
  type: Schema.Literal('tool_call'),
  toolCallId: Schema.String,
  title: Schema.String,
  kind: Schema.optionalWith(SToolKind, { default: () => 'other' as const }),
  status: Schema.optionalWith(SToolCallStatus, { default: () => 'pending' as const }),
  /** Free-form ACP tool-call content blocks (diffs, terminal refs, text). */
  content: Schema.optional(Schema.Array(Schema.Unknown)),
  rawInput: Schema.optional(Schema.Unknown),
});

const SToolCallUpdateDirective = Schema.Struct({
  type: Schema.Literal('tool_call_update'),
  toolCallId: Schema.String,
  status: Schema.optional(SToolCallStatus),
  title: Schema.optional(Schema.String),
  content: Schema.optional(Schema.Array(Schema.Unknown)),
  rawOutput: Schema.optional(Schema.Unknown),
});

const SPlanDirective = Schema.Struct({
  type: Schema.Literal('plan'),
  entries: Schema.Array(SPlanEntry),
});

const SAdvertiseCommands = Schema.Struct({
  type: Schema.Literal('advertise_commands'),
  commands: Schema.Array(SCommand),
});

const SSetMode = Schema.Struct({
  type: Schema.Literal('set_mode'),
  modeId: Schema.String,
});

const SRequestPermission = Schema.Struct({
  type: Schema.Literal('request_permission'),
  toolCallId: Schema.String,
  title: Schema.optionalWith(Schema.String, { default: () => 'Permission required' }),
  options: Schema.Array(SPermissionOption),
  /** Assert the client's decision kind for this round-trip. */
  expectOutcome: Schema.optional(Schema.Literal('selected', 'cancelled')),
  /** Assert the specific option the client selected (when `selected`). */
  expectOptionId: Schema.optional(Schema.String),
});

const SUseTerminal = Schema.Struct({
  type: Schema.Literal('use_terminal'),
  command: Schema.String,
  args: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  /** Assert the client's terminal output contains this substring. */
  expectOutputContains: Schema.optional(Schema.String),
});

const SReadFile = Schema.Struct({
  type: Schema.Literal('read_file'),
  path: Schema.String,
  expectContentContains: Schema.optional(Schema.String),
});

const SSleep = Schema.Struct({
  type: Schema.Literal('sleep'),
  ms: Schema.Number,
});

const SCrash = Schema.Struct({
  type: Schema.Literal('crash'),
  /** Exit code for the stdio bin; the in-process path closes the stream instead. */
  exitCode: Schema.optionalWith(Schema.Number, { default: () => 1 }),
});

const SEmitMalformed = Schema.Struct({
  type: Schema.Literal('emit_malformed'),
  /** Raw bytes written verbatim between frames (no trailing newline added). */
  raw: Schema.String,
});

const SExpectPrompt = Schema.Struct({
  type: Schema.Literal('expect_prompt'),
  /** The incoming prompt's concatenated text must contain this substring. */
  contains: Schema.String,
});

const SExpectCancel = Schema.Struct({
  type: Schema.Literal('expect_cancel'),
  /** Safety valve so a mis-scripted scenario cannot hang the turn forever. */
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 5_000 }),
});

export const SDirective = Schema.Union(
  SEmitChunks,
  SToolCallDirective,
  SToolCallUpdateDirective,
  SPlanDirective,
  SAdvertiseCommands,
  SSetMode,
  SRequestPermission,
  SUseTerminal,
  SReadFile,
  SSleep,
  SCrash,
  SEmitMalformed,
  SExpectPrompt,
  SExpectCancel,
);
export type Directive = Schema.Schema.Type<typeof SDirective>;
export type DirectiveType = Directive['type'];

/** Every directive tag, for exhaustiveness checks and coverage assertions. */
export const DIRECTIVE_TYPES = [
  'emit_chunks',
  'tool_call',
  'tool_call_update',
  'plan',
  'advertise_commands',
  'set_mode',
  'request_permission',
  'use_terminal',
  'read_file',
  'sleep',
  'crash',
  'emit_malformed',
  'expect_prompt',
  'expect_cancel',
] as const satisfies readonly DirectiveType[];

// ─── Capability knobs the scenario can advertise at initialize ───

const SInitCapabilities = Schema.Struct({
  loadSession: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  resumeSession: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  images: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  // Note: slash commands are not an `initialize` capability in ACP — they are
  // discovered mid-session via `available_commands_update` (drive them with the
  // `advertise_commands` directive), so there is deliberately no knob here.
  /** Advertised session modes (drives `set_mode` acceptance). */
  modes: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  agentName: Schema.optionalWith(Schema.String, { default: () => 'srgnt-mock-agent' }),
  agentVersion: Schema.optionalWith(Schema.String, { default: () => '0.1.0' }),
});

export const SScenario = Schema.Struct({
  name: Schema.String,
  /** ACP session id the mock returns from `session/new`. */
  sessionId: Schema.optionalWith(Schema.String, { default: () => 'mock-session-1' }),
  initialize: Schema.optionalWith(SInitCapabilities, {
    default: () => SInitCapabilities.make({}),
  }),
  /** Stop reason for the turn once directives finish (default `end_turn`). */
  stopReason: Schema.optionalWith(SStopReason, { default: () => 'end_turn' as const }),
  directives: Schema.Array(SDirective),
});
export type Scenario = Schema.Schema.Type<typeof SScenario>;
export type InitCapabilities = Scenario['initialize'];

const decodeScenario = Schema.decodeUnknownEither(SScenario, { onExcessProperty: 'ignore' });

/** Parse + validate an untrusted scenario payload. Never throws. */
export function readScenario(
  value: unknown,
): { success: true; scenario: Scenario } | { success: false; error: string } {
  return Either.match(decodeScenario(value), {
    onLeft: (error) => ({ success: false, error: String(error) }) as const,
    onRight: (scenario) => ({ success: true, scenario }) as const,
  });
}

/** Parse + validate, throwing on failure. Used by the stdio bin (fail fast). */
export function parseScenario(value: unknown): Scenario {
  const result = readScenario(value);
  if (!result.success) {
    throw new Error(`Invalid mock-agent scenario: ${result.error}`);
  }
  return result.scenario;
}
