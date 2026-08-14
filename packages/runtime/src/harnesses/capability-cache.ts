import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SHarnessCapabilitiesFile,
  safeParse,
  workspaceFiles,
  type HarnessCapabilitiesFile,
  type HarnessCapabilityEntry,
  type HarnessDefinition,
} from '@srgnt/contracts';
import { writeJsonAtomic } from '../shared/atomic-json.js';

/**
 * Last-negotiated harness capabilities, persisted for *display* between runs
 * (STEP-25-01).
 *
 * Boundary: `@srgnt/harness` speaks ACP and never touches disk, so the file
 * lives here. The capability payloads stay opaque records — their shape is
 * owned by the harness package and must not be forked into a second model.
 *
 * This is display data only. A live session always uses its own fresh
 * negotiation, so a wrong or missing entry can never change session behavior —
 * it only changes what Settings renders between runs.
 */

/** What one connect observed, ready to cache. */
export interface CapabilityCapture {
  /** Live `initialize` negotiation, plus any session-discovered fields merged in. */
  readonly negotiated: Record<string, unknown>;
  /** The same after the definition's `capabilityOverrides` were applied. */
  readonly effective: Record<string, unknown>;
}

/** A cached entry plus whether it still describes the current definition. */
export type CachedCapabilities =
  | { readonly status: 'measured'; readonly entry: HarnessCapabilityEntry }
  /** Definition changed under the same id — present the row as not-yet-measured. */
  | { readonly status: 'stale'; readonly entry: HarnessCapabilityEntry }
  | { readonly status: 'missing' };

const EMPTY: HarnessCapabilitiesFile = { version: 1, entries: {} };

/** Key-sorted JSON, so a fingerprint depends on values rather than field order. */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

/**
 * Stable hash of the *effective* definition (post-workspace-shadow,
 * post-override). Keying cache entries by `harnessId` alone would make an old
 * negotiation look current after the definition changed under the same id —
 * e.g. shadowing `pi` with a different launch spec.
 */
export function harnessDefinitionFingerprint(definition: HarnessDefinition): string {
  return createHash('sha256').update(stableStringify(definition)).digest('hex').slice(0, 16);
}

export function harnessCapabilitiesPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, workspaceFiles.harnessCapabilities);
}

/**
 * Store for `harness-capabilities.json` at the workspace root.
 *
 * ponytail: last-write-wins; this file is display-only. All writes go through
 * one in-process queue so two connects can never tear the file, but nothing
 * orders them — whichever connect finishes last owns the entry. If concurrent
 * reconnects ever show a stale row that matters, add a monotonic per-harness
 * generation reserved inside this same queue. Not `capturedAt`: wall-clock ties
 * at ms resolution and can move backwards, so timestamp ordering is worse than
 * none.
 */
export class HarnessCapabilityCache {
  /** Serializes writes. Same shape as ProjectStore's lock chain. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly workspaceRoot: string) {}

  /**
   * The whole cache. Tolerant: a missing, unreadable, corrupt, or
   * different-version file decodes to an empty cache and is rewritten by the
   * next connect — a stale display file must never fail startup.
   */
  async read(): Promise<HarnessCapabilitiesFile> {
    let raw: string;
    try {
      raw = await fs.readFile(harnessCapabilitiesPath(this.workspaceRoot), 'utf8');
    } catch {
      return EMPTY;
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return EMPTY;
    }
    const parsed = safeParse(SHarnessCapabilitiesFile, value);
    return parsed.success ? parsed.data : EMPTY;
  }

  /** The entry for a definition, and whether it still matches it. */
  async get(definition: HarnessDefinition): Promise<CachedCapabilities> {
    const entry = (await this.read()).entries[definition.id];
    if (entry === undefined) return { status: 'missing' };
    return entry.definitionFingerprint === harnessDefinitionFingerprint(definition)
      ? { status: 'measured', entry }
      : { status: 'stale', entry };
  }

  /** Write-through after a successful connect. Serialized; last write wins. */
  async record(definition: HarnessDefinition, capture: CapabilityCapture): Promise<void> {
    const agentVersion = capture.negotiated.agentVersion;
    const entry: HarnessCapabilityEntry = {
      negotiated: capture.negotiated,
      effective: capture.effective,
      ...(typeof agentVersion === 'string' ? { agentVersion } : {}),
      capturedAt: new Date().toISOString(),
      definitionFingerprint: harnessDefinitionFingerprint(definition),
    };
    const run = async (): Promise<void> => {
      const current = await this.read();
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      await writeJsonAtomic(harnessCapabilitiesPath(this.workspaceRoot), {
        version: 1,
        entries: { ...current.entries, [definition.id]: entry },
      } satisfies HarnessCapabilitiesFile);
    };
    // `then(run, run)`: a failed predecessor must not poison later writers.
    const next = this.queue.then(run, run);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

export const createHarnessCapabilityCache = (workspaceRoot: string): HarnessCapabilityCache =>
  new HarnessCapabilityCache(workspaceRoot);
