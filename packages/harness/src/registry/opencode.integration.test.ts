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

/** Tees every JSON-RPC frame into `frames` (same technique as the Pi spike). */
function recordingSpawner(inner: AgentSpawner, frames: AnyMessage[]): AgentSpawner {
  return async (launch): Promise<SpawnedAgent> => {
    const spawned = await inner(launch);
    const [inPass, inTap] = spawned.stream.readable.tee();
    void (async () => {
      const reader = inTap.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
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
 * opencode's `available_commands_update` advertises the *user's* whole local
 * command catalog (90+ entries on the capture machine). The fixture only needs
 * to prove the shape and that the capability is observed, so the list is capped
 * — committing a developer's personal command names is noise and needless
 * exposure. The original count is preserved as evidence.
 */
const FIXTURE_COMMAND_LIMIT = 3;

/** Same cap for the `configOptions` catalogs on the session/new response. */
function trimConfigOptions(session: unknown): unknown {
  const options = (session as { configOptions?: unknown }).configOptions;
  if (!Array.isArray(options)) return session;
  return {
    ...(session as Record<string, unknown>),
    configOptions: options.map((option) => {
      const all = (option as { options?: unknown }).options;
      if (!Array.isArray(all)) return option;
      return {
        ...(option as Record<string, unknown>),
        options: all.slice(0, FIXTURE_COMMAND_LIMIT),
        optionsTrimmedFrom: all.length,
      };
    }),
  };
}

function trimCommandCatalog(jsonl: string): string {
  return `${jsonl
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const event = JSON.parse(line) as { payload?: { update?: Record<string, unknown> } };
      const update = event.payload?.update;
      if (!Array.isArray(update?.availableCommands)) return line;
      const all = update.availableCommands as unknown[];
      update.availableCommands = all.slice(0, FIXTURE_COMMAND_LIMIT);
      update.availableCommandsTrimmedFrom = all.length;
      return JSON.stringify(event);
    })
    .join('\n')}\n`;
}

describeOpencode('opencode definition (integration, SRGNT_IT_OPENCODE=1)', () => {
  it(
    'launches `opencode acp`, initializes, and completes one prompt turn',
    async () => {
      const cwd = mkdtempSync(join(tmpdir(), 'srgnt-opencode-it-'));
      const inbound: AnyMessage[] = [];
      const connection = await Effect.runPromise(
        AcpAgentConnection.connect({
          launch: { ...opencodeDefinition.launch, cwd },
          spawn: recordingSpawner(childProcessSpawner, inbound),
          ports: { permission: denyAllPermissions },
        }),
      );

      try {
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
        console.log('[SRGNT_IT_OPENCODE] session/new response:', JSON.stringify(session, null, 2));

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
              README: `STEP-25-01 opencode capture — raw ACP initialize result. opencode ${OPENCODE_TESTED_VERSION}, launched as \`opencode acp\`.`,
              agentVersion: OPENCODE_TESTED_VERSION,
              result: (initialize as { result?: unknown } | undefined)?.result,
              sessionNew: trimConfigOptions(session),
            }),
            null,
            2,
          )}\n`,
        );
        writeFileSync(join(FIXTURE_DIR, 'simple-prompt.jsonl'), trimCommandCatalog(recorder.toJsonl()));

        connection.close();
        await pump;
      } finally {
        connection.close();
        rmSync(cwd, { recursive: true, force: true });
      }
    },
    IT_TIMEOUT_MS,
  );
});
