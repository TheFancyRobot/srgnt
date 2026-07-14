import { type HarnessDefinition, type HarnessesFile, SHarnessesFile } from '@srgnt/contracts';
import { Either, Schema } from 'effect';
import { applyCapabilityOverrides, type NegotiatedCapabilities } from '../acp/capabilities.js';
import { BUILTIN_HARNESSES } from './builtins.js';

/**
 * The harness registry turns definition *data* (built-ins + a workspace
 * `harnesses.json`) into a lookup the rest of the app consumes. It never
 * contains per-harness protocol logic — that is the ARCH-0009 invariant this
 * whole package defends.
 */

/** Raised when a lookup targets an id no definition provides. */
export class UnknownHarness extends Error {
  readonly _tag = 'UnknownHarness';
  constructor(readonly id: string) {
    super(`No harness definition registered for id '${id}'`);
    this.name = 'UnknownHarness';
  }
}

/** Result of parsing a workspace `harnesses.json` payload. */
export type LoadWorkspaceResult =
  | { readonly ok: true; readonly file: HarnessesFile }
  | { readonly ok: false; readonly error: string };

const decodeHarnessesFile = Schema.decodeUnknownEither(SHarnessesFile);

/**
 * Validates an untrusted `harnesses.json` payload against the contract schema.
 * Returns a typed failure instead of throwing so the caller (registry build /
 * settings UI) can surface a readable error and fall back to built-ins.
 */
export function loadWorkspaceHarnesses(raw: unknown): LoadWorkspaceResult {
  return Either.match(decodeHarnessesFile(raw), {
    onLeft: (error) => ({ ok: false, error: String(error) }),
    onRight: (file) => ({ ok: true, file }),
  });
}

export interface RegistryOptions {
  /** Built-in definitions; defaults to everything srgnt ships. */
  readonly builtins?: readonly HarnessDefinition[];
  /** Parsed workspace file (see {@link loadWorkspaceHarnesses}). Absent → built-ins only. */
  readonly workspace?: HarnessesFile;
}

/**
 * Immutable, deduplicated view over the merged definition set.
 *
 * Merge precedence (lowest → highest):
 *   1. built-ins (in declared order)
 *   2. workspace `harnesses.json` entries (in file order)
 *
 * A later entry sharing an `id` *replaces* the earlier one wholesale — so a
 * workspace entry can customize or shadow a built-in (e.g. repin Pi's adapter
 * version or override its launch command), and a later workspace entry wins
 * over an earlier duplicate. Order within each source is preserved for `list()`.
 */
export class HarnessRegistry {
  private readonly byId: ReadonlyMap<string, HarnessDefinition>;

  private constructor(byId: ReadonlyMap<string, HarnessDefinition>) {
    this.byId = byId;
  }

  static create(options: RegistryOptions = {}): HarnessRegistry {
    const merged = new Map<string, HarnessDefinition>();
    const sources = [...(options.builtins ?? BUILTIN_HARNESSES), ...(options.workspace?.harnesses ?? [])];
    for (const definition of sources) {
      // Delete-then-set so a replacement moves to the end of iteration order,
      // keeping `list()` stable and "last write wins" observable.
      merged.delete(definition.id);
      merged.set(definition.id, definition);
    }
    return new HarnessRegistry(merged);
  }

  /** All merged definitions, in effective order (built-ins first, then workspace additions). */
  list(): readonly HarnessDefinition[] {
    return [...this.byId.values()];
  }

  /** Definition for `id`, or `undefined` if none is registered. */
  get(id: string): HarnessDefinition | undefined {
    return this.byId.get(id);
  }

  /** Whether any definition is registered under `id`. */
  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Definition for `id`, or throws {@link UnknownHarness}. Use when absence is a bug. */
  require(id: string): HarnessDefinition {
    const definition = this.byId.get(id);
    if (definition === undefined) throw new UnknownHarness(id);
    return definition;
  }

  /**
   * Effective capabilities the UI consumes: live `initialize` negotiation with
   * the definition's overrides layered on. Delegates to the acp-layer
   * {@link applyCapabilityOverrides} so the merge stays single-sourced — a
   * definition override can clamp a negotiated capability off (e.g. Pi's
   * `mcpServers: false`); it never invents a protocol feature the transport
   * lacks.
   */
  effectiveCapabilities(id: string, negotiated: NegotiatedCapabilities): NegotiatedCapabilities {
    return effectiveCapabilities(this.require(id), negotiated);
  }
}

/**
 * Layers a definition's `capabilityOverrides` onto live negotiated capabilities.
 * Standalone twin of {@link HarnessRegistry.effectiveCapabilities} for callers
 * that already hold a definition.
 */
export function effectiveCapabilities(
  definition: HarnessDefinition,
  negotiated: NegotiatedCapabilities,
): NegotiatedCapabilities {
  return applyCapabilityOverrides(negotiated, definition.capabilityOverrides);
}
