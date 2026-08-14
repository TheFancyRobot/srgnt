import { Schema } from 'effect';
import { StringRecord } from './shared-schemas.js';

/**
 * HarnessDefinition is *data* — ACP is the only integration surface, and all
 * per-harness knowledge lives in these records, never in protocol code
 * (ARCH-0009 invariant).
 */

/** How the agent process is spawned. Always JSON-RPC 2.0 over stdio. */
export const SLaunchSpec = Schema.Struct({
  command: Schema.String,
  args: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  env: Schema.optionalWith(StringRecord, { default: () => ({}) }),
  cwd: Schema.optional(Schema.String),
});
export type LaunchSpec = Schema.Schema.Type<typeof SLaunchSpec>;

/**
 * Known behavioral quirks a definition can declare so the UI degrades visibly:
 * - adapter-mediated: speaks ACP through a community adapter, not natively (e.g. pi-acp)
 * - permission-routing-gaps: session/request_permission may not round-trip fully
 * - mcp-passthrough-gaps: MCP servers injected via session/new may not reach the agent
 * - no-session-load: session/load replay unsupported; resume falls back to read-only + fork
 */
export const SHarnessQuirk = Schema.Literal(
  'adapter-mediated',
  'permission-routing-gaps',
  'mcp-passthrough-gaps',
  'no-session-load',
);
export type HarnessQuirk = Schema.Schema.Type<typeof SHarnessQuirk>;

/**
 * Optional per-definition overrides on top of live `initialize` negotiation.
 * Absent fields mean "trust the negotiated capability"; a boolean forces the
 * capability on or off regardless of what the agent advertises.
 */
export const SHarnessCapabilityOverrides = Schema.Struct({
  loadSession: Schema.optional(Schema.Boolean),
  resumeSession: Schema.optional(Schema.Boolean),
  modes: Schema.optional(Schema.Boolean),
  slashCommands: Schema.optional(Schema.Boolean),
  images: Schema.optional(Schema.Boolean),
  mcpServers: Schema.optional(Schema.Boolean),
});
export type HarnessCapabilityOverrides = Schema.Schema.Type<typeof SHarnessCapabilityOverrides>;

export const SHarnessDefinition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  source: Schema.optionalWith(Schema.Literal('builtin', 'custom'), { default: () => 'custom' as const }),
  launch: SLaunchSpec,
  /**
   * Binary probed by installation detection, when it differs from
   * `launch.command`. Pi launches via `npx pi-acp@…` but its real prerequisite
   * is the `pi` CLI; opencode needs none because its launch command IS the
   * binary. Absent → probe `launch.command`.
   */
  detectCommand: Schema.optional(Schema.String),
  quirks: Schema.optionalWith(Schema.Array(SHarnessQuirk), { default: () => [] }),
  capabilityOverrides: Schema.optionalWith(SHarnessCapabilityOverrides, { default: () => ({}) }),
  docsUrl: Schema.optional(Schema.String),
});
export type HarnessDefinition = Schema.Schema.Type<typeof SHarnessDefinition>;

/** Shape of the workspace `harnesses.json` file (user-configured definitions). */
export const SHarnessesFile = Schema.Struct({
  version: Schema.Number.pipe(Schema.int(), Schema.positive()),
  harnesses: Schema.optionalWith(Schema.Array(SHarnessDefinition), { default: () => [] }),
});
export type HarnessesFile = Schema.Schema.Type<typeof SHarnessesFile>;

/**
 * One harness's last-negotiated capabilities, cached for display between runs
 * (STEP-25-01). Capability shape is opaque here for the same reason the IPC
 * contract keeps it opaque: the model is owned by `@srgnt/harness`, and
 * contracts must not fork it.
 */
export const SHarnessCapabilityEntry = Schema.Struct({
  /** Live `initialize` negotiation, merged with session-discovered fields. */
  negotiated: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  /** The same after the definition's `capabilityOverrides` were applied. */
  effective: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  agentVersion: Schema.optional(Schema.String),
  /** Human-readable provenance ("measured 2h ago"). Never used to order writes. */
  capturedAt: Schema.String,
  /**
   * Hash of the *effective* definition this was measured against. A mismatch
   * means the definition changed under the same id, so the entry is stale.
   */
  definitionFingerprint: Schema.String,
});
export type HarnessCapabilityEntry = Schema.Schema.Type<typeof SHarnessCapabilityEntry>;

/** Shape of the workspace `harness-capabilities.json` file (generated, not user-edited). */
export const SHarnessCapabilitiesFile = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.optionalWith(Schema.Record({ key: Schema.String, value: SHarnessCapabilityEntry }), {
    default: () => ({}),
  }),
});
export type HarnessCapabilitiesFile = Schema.Schema.Type<typeof SHarnessCapabilitiesFile>;
