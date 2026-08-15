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
 * - no-client-delegation: the agent runs its tools in its own process and never
 *   calls the client's `fs/*` or `terminal/*` services, so srgnt sees no file
 *   reads, writes or command output it could scope, show or embed
 */
export const SHarnessQuirk = Schema.Literal(
  'adapter-mediated',
  'permission-routing-gaps',
  'mcp-passthrough-gaps',
  'no-session-load',
  'no-client-delegation',
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
   *
   * Non-empty when present: `detectHarness` falls back with `??`, which only
   * catches `undefined`, so an empty string would reach the probe and throw
   * `ERR_INVALID_ARG_VALUE` instead of detecting. STEP-25-02's editor lets a
   * user clear this field, and clearing it must mean absent, not `''`.
   */
  detectCommand: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
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

/** An external login command, reconstructed from an auth method's own metadata. */
export const SAuthMethodCommand = Schema.Struct({
  command: Schema.String,
  args: Schema.Array(Schema.String),
  env: StringRecord,
});
export type AuthMethodCommand = Schema.Schema.Type<typeof SAuthMethodCommand>;

/**
 * One advertised auth method, normalized to what srgnt can actually *do* about
 * it (STEP-25-03). `kind` is the only thing the auth panel branches on — never a
 * harness id, never a match on the method's name.
 *
 * The three kinds are measured, not hypothetical:
 * - `external-command` — the method carries an executable + args (pi-acp's
 *   `pi_terminal_login`: `type: 'terminal'`, `args: ['--terminal-login']`), so a
 *   copyable command can be BUILT from its own data.
 * - `rpc-authenticate` — the method names a mechanism srgnt cannot turn into a
 *   command, but it named one, so calling `authenticate(id)` is the honest try.
 * - `docs-only` — the method is `{id, name, description}` and nothing else, so
 *   the login instructions exist only as prose (opencode's `opencode-login`:
 *   the real command lives inside its `description`). Load-bearing for a
 *   shipped harness, not a defensive fallback.
 *
 * No separate `instructions` field: `description` is the only prose a method
 * carries, and copying it into a second field would let the two disagree.
 */
export const SAuthMethod = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  kind: Schema.Literal('external-command', 'rpc-authenticate', 'docs-only'),
  /** Present for `external-command` only, and always derived from the method. */
  command: Schema.optional(SAuthMethodCommand),
});
export type AuthMethod = Schema.Schema.Type<typeof SAuthMethod>;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * Raw SDK auth-method metadata → {@link SAuthMethod}. Pure, so it is the one
 * place the kind is decided and the one thing the tests have to pin.
 *
 * `fallbackCommand` is the harness's own binary (`detectCommand ?? launch.command`),
 * used when a method supplies `args` but no executable — pi-acp's does exactly
 * that, because the executable it means is the harness itself. Without it such a
 * method degrades to `docs-only` rather than to a guessed command name.
 *
 * Returns `undefined` for anything without an `id`: an entry that cannot be
 * named cannot be retried, authenticated with, or told apart from its siblings.
 */
export function normalizeAuthMethod(raw: unknown, fallbackCommand?: string): AuthMethod | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const method = raw as Record<string, unknown>;
  const id = asString(method['id']);
  if (id === undefined) return undefined;
  const name = asString(method['name']) ?? id;
  const description = asString(method['description']);
  const base = { id, name, ...(description !== undefined ? { description } : {}) };

  const args = Array.isArray(method['args'])
    ? method['args'].filter((value): value is string => typeof value === 'string')
    : undefined;
  const type = asString(method['type']);
  // An explicit executable wins over the harness binary; `type: 'terminal'` with
  // only `args` means "run the harness itself like this".
  const executable = asString(method['command']) ?? (type === 'terminal' ? fallbackCommand : undefined);
  if (executable !== undefined) {
    const env = method['env'];
    return {
      ...base,
      kind: 'external-command',
      command: {
        command: executable,
        args: args ?? [],
        env:
          env !== null && typeof env === 'object'
            ? Object.fromEntries(
                Object.entries(env as Record<string, unknown>).filter(
                  (entry): entry is [string, string] => typeof entry[1] === 'string',
                ),
              )
            : {},
      },
    };
  }
  // A declared type srgnt cannot turn into a command is still a declared
  // mechanism, so the protocol call is the honest attempt. Prose alone is not,
  // and guessing a login command out of a description is exactly what the
  // no-hardcoding rule forbids. `terminal` with nothing to run is the third
  // case: an external flow whose command we cannot name — calling `authenticate`
  // for it would be answering a question the agent did not ask.
  return { ...base, kind: type === undefined || type === 'terminal' ? 'docs-only' : 'rpc-authenticate' };
}

/** Shape of the workspace `harness-capabilities.json` file (generated, not user-edited). */
export const SHarnessCapabilitiesFile = Schema.Struct({
  version: Schema.Literal(1),
  entries: Schema.optionalWith(Schema.Record({ key: Schema.String, value: SHarnessCapabilityEntry }), {
    default: () => ({}),
  }),
});
export type HarnessCapabilitiesFile = Schema.Schema.Type<typeof SHarnessCapabilitiesFile>;
