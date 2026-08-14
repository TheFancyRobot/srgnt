import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnyMessage } from '@agentclientprotocol/sdk';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  AcpAgentConnection,
  childProcessSpawner,
  type AgentSpawner,
  type PermissionPort,
  type SpawnedAgent,
} from '../acp/connection.js';
import { FrameRecorder, redactHomePaths } from '../testing/fixtures/recorder.js';
import { opencodeDefinition, OPENCODE_TESTED_VERSION } from './builtins.js';
import { effectiveCapabilities } from './registry.js';

/**
 * End-to-end check that the built-in opencode definition launches `opencode acp`,
 * completes ACP `initialize`, and drives one real prompt turn.
 *
 * Gated behind `SRGNT_IT_OPENCODE=1` because it needs the real `opencode` CLI on
 * PATH *and* a configured provider — CI without it skips cleanly:
 *
 *   SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode
 *
 * The run is also the capture: the raw `initialize` result and the turn's
 * `session/update` frames are written (redacted) under
 * `testing/fixtures/opencode/`, which is what STEP-25-01's capture note and
 * STEP-25-03's matrix assert against. Trivial prompts only — opencode bills the
 * user's own configured provider.
 */
const RUN_IT = process.env.SRGNT_IT_OPENCODE === '1';
const describeOpencode = RUN_IT ? describe : describe.skip;

const IT_TIMEOUT_MS = 120_000;

const FIXTURE_DIR = fileURLToPath(new URL('../testing/fixtures/opencode/', import.meta.url));

// opencode may ask for permission mid-turn; auto-deny so the probe never blocks
// on human input — and whether it asks at all is itself a finding.
let permissionRequests = 0;
const denyAllPermissions: PermissionPort = {
  requestPermission: () => {
    permissionRequests += 1;
    return Promise.resolve({ outcome: { outcome: 'cancelled' as const } });
  },
};

/**
 * Tees every JSON-RPC frame into `frames` (same technique as the Pi spike).
 * Returns the reader's completion promise through `done` so the caller can await
 * a fully drained tap before writing fixtures — otherwise the committed capture
 * varies run to run with however much the reader happened to consume.
 */
function recordingSpawner(
  inner: AgentSpawner,
  frames: AnyMessage[],
  done: { promise?: Promise<void> },
): AgentSpawner {
  return async (launch): Promise<SpawnedAgent> => {
    const spawned = await inner(launch);
    const [inPass, inTap] = spawned.stream.readable.tee();
    done.promise = (async () => {
      const reader = inTap.getReader();
      try {
        for (;;) {
          const { value, done: finished } = await reader.read();
          if (finished) break;
          frames.push(value);
        }
      } catch {
        /* stream ended — recording is best-effort */
      }
    })();
    return { stream: { writable: spawned.stream.writable, readable: inPass }, kill: spawned.kill };
  };
}

/**
 * opencode reports the *user's own* local catalogs over ACP: `configOptions`
 * carries their configured model and every model/agent available to them, and
 * `available_commands_update` carries their whole slash-command catalog (93
 * entries on the capture machine, including project-local agent descriptions).
 *
 * Capping those lists is not enough — the retained entries are still the
 * developer's configuration, and these fixtures are committed. What STEP-25-03
 * asserts against is the *shape* (which keys exist, how deep the catalog nests,
 * that the capability was observed at all), never the values. So every leaf
 * string is replaced with a positional placeholder and the true length is kept
 * beside it as evidence.
 */
const FIXTURE_COMMAND_LIMIT = 3;

/** Replaces a catalog entry's identifying strings, preserving which keys exist. */
function placeholderEntry(entry: unknown, kind: string, index: number): unknown {
  if (entry === null || typeof entry !== 'object') return entry;
  const source = entry as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = typeof value === 'string' ? `<${kind}-${index}-${key}>` : value;
  }
  return out;
}

function redactConfigOptions(session: unknown): unknown {
  const options = (session as { configOptions?: unknown }).configOptions;
  if (!Array.isArray(options)) return session;
  return {
    ...(session as Record<string, unknown>),
    configOptions: options.map((option, groupIndex) => {
      const group = option as Record<string, unknown>;
      const all = group.options;
      if (!Array.isArray(all)) return option;
      return {
        ...group,
        // The user's current selection is their configuration, not protocol shape.
        ...(typeof group.currentValue === 'string'
          ? { currentValue: `<group-${groupIndex}-currentValue>` }
          : {}),
        options: all
          .slice(0, FIXTURE_COMMAND_LIMIT)
          .map((entry, i) => placeholderEntry(entry, `group-${groupIndex}-option`, i)),
        optionsTrimmedFrom: all.length,
      };
    }),
  };
}

function redactCommandCatalog(jsonl: string): string {
  return `${jsonl
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const event = JSON.parse(line) as { payload?: { update?: Record<string, unknown> } };
      const update = event.payload?.update;
      if (!Array.isArray(update?.availableCommands)) return line;
      const all = update.availableCommands as unknown[];
      update.availableCommands = all
        .slice(0, FIXTURE_COMMAND_LIMIT)
        .map((entry, i) => placeholderEntry(entry, 'command', i));
      update.availableCommandsTrimmedFrom = all.length;
      return JSON.stringify(event);
    })
    .join('\n')}\n`;
}

/** Logs a catalog's shape without its contents (see `redactConfigOptions`). */
function describeShape(session: {
  sessionId: string;
  modes?: unknown;
  configOptions?: unknown;
}): string {
  const groups = Array.isArray(session.configOptions) ? session.configOptions : [];
  return JSON.stringify({
    keys: Object.keys(session).sort(),
    hasModes: session.modes !== undefined,
    configOptionGroups: groups.map((g) => ({
      id: (g as { id?: unknown }).id,
      optionCount: Array.isArray((g as { options?: unknown }).options)
        ? ((g as { options: unknown[] }).options.length as number)
        : 0,
    })),
  });
}

describeOpencode('opencode definition (integration, SRGNT_IT_OPENCODE=1)', () => {
  it(
    'launches `opencode acp`, initializes, and completes one prompt turn',
    async () => {
      const cwd = mkdtempSync(join(tmpdir(), 'srgnt-opencode-it-'));
      const inbound: AnyMessage[] = [];
      const tap: { promise?: Promise<void> } = {};
      // `connect` inside the scope: a rejected connect must still remove the
      // temp workspace rather than leaving one behind in the system tmpdir.
      let connection: AcpAgentConnection | undefined;
      try {
        connection = await Effect.runPromise(
          AcpAgentConnection.connect({
            launch: { ...opencodeDefinition.launch, cwd },
            spawn: recordingSpawner(childProcessSpawner, inbound, tap),
            ports: { permission: denyAllPermissions },
          }),
        );
        const negotiated = connection.capabilities;
        const effective = effectiveCapabilities(opencodeDefinition, negotiated);

        // eslint-disable-next-line no-console -- intentional evidence for the capture note.
        console.log(
          `[SRGNT_IT_OPENCODE] opencode ${OPENCODE_TESTED_VERSION} negotiated capabilities:`,
          JSON.stringify(negotiated, null, 2),
        );

        expect(negotiated.protocolVersion).toBeGreaterThan(0);
        // Zero overrides: the effective view must be the measured one, untouched.
        expect(effective).toEqual(negotiated);

        const session = await Effect.runPromise(connection.newSession({ cwd, mcpServers: [] }));
        // eslint-disable-next-line no-console -- evidence: modes are session-discovered, not negotiated.
        // Shape only: the raw response carries the user's configured model and
        // their local agent catalog, and test logs are as public as fixtures.
        console.log('[SRGNT_IT_OPENCODE] session/new shape:', describeShape(session));

        const recorder = new FrameRecorder({ protocolVersion: negotiated.protocolVersion });
        const pump = (async () => {
          for await (const update of connection.updates(session.sessionId)) recorder.recordUpdate(update);
        })();

        const turn = await Effect.runPromise(
          connection.prompt({
            sessionId: session.sessionId,
            prompt: [{ type: 'text', text: 'Reply with the single word: ok' }],
          }),
        );
        // eslint-disable-next-line no-console -- evidence for the capture note.
        console.log(
          `[SRGNT_IT_OPENCODE] stopReason=${turn.stopReason} permissionRequests=${permissionRequests}`,
        );
        expect(turn.stopReason).toBe('end_turn');

        // Drain first, write second. Closing the connection ends the update
        // stream and the teed tap; writing before they settle commits whatever
        // each happened to have consumed, so the fixtures differ per run.
        connection.close();
        await pump;
        await tap.promise;

        // The capture: raw initialize + the turn's redacted update envelopes.
        const initialize = inbound.find(
          (msg) =>
            typeof (msg as { result?: { protocolVersion?: unknown } }).result?.protocolVersion === 'number',
        );
        mkdirSync(FIXTURE_DIR, { recursive: true });
        writeFileSync(
          join(FIXTURE_DIR, 'initialize.json'),
          `${JSON.stringify(
            redactHomePaths({
              README: `STEP-25-01 opencode capture — raw ACP initialize result. opencode ${OPENCODE_TESTED_VERSION}, launched as \`opencode acp\`. Catalog values are positional placeholders: these fixtures pin protocol shape, and the real values are the capture machine's own configuration.`,
              agentVersion: OPENCODE_TESTED_VERSION,
              result: (initialize as { result?: unknown } | undefined)?.result,
              sessionNew: redactConfigOptions(session),
            }),
            null,
            2,
          )}\n`,
        );
        writeFileSync(join(FIXTURE_DIR, 'simple-prompt.jsonl'), redactCommandCatalog(recorder.toJsonl()));
      } finally {
        connection?.close();
        rmSync(cwd, { recursive: true, force: true });
      }
    },
    IT_TIMEOUT_MS,
  );
});
