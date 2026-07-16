import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
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
  type ClientPorts,
  type FileSystemPort,
  type PermissionPort,
  type SpawnedAgent,
  type TerminalPort,
} from '../acp/connection.js';
import { piDefinition } from './builtins.js';

/**
 * STEP-22-05 Pi adapter spike. Drives the pinned `pi-acp` adapter over real ACP
 * and *measures* the four open questions the decision gate needs answered:
 *
 *   Probe 1 — permissions:  does `session/request_permission` round-trip over
 *             ACP, or does pi-acp self-approve tool calls?
 *   Probe 2 — MCP passthrough:  is a stdio MCP server injected via
 *             `session/new.mcpServers` actually forwarded to the underlying pi?
 *   Probe 3 — loadSession/resume:  what do the negotiated capabilities say, and
 *             what happens when we actually call `session/load` / `session/resume`?
 *   Probe 4 — fs/terminal delegation:  with client `fs`+`terminal` capabilities
 *             advertised, does the adapter ever call them, or execute in-process?
 *
 * Gated behind `SRGNT_IT_PI=1` (real `pi` CLI on PATH + live `npx pi-acp`), so
 * CI without pi skips it cleanly. It uses TRIVIAL prompts against pi's default
 * model on purpose — the spike must not burn tokens. Run with:
 *
 *   SRGNT_IT_PI=1 SPIKE_OUT=/abs/evidence/dir \
 *     pnpm --filter @srgnt/harness test pi-spike
 *
 * Every JSON-RPC frame (both directions) is captured and written under
 * `SPIKE_OUT` as evidence; interesting frames are promoted to committed fixtures
 * and excerpted in the spike report note.
 */

const RUN_PI_IT = process.env.SRGNT_IT_PI === '1';
const describePi = RUN_PI_IT ? describe : describe.skip;

const IT_TIMEOUT_MS = 180_000;

const ECHO_SERVER = fileURLToPath(new URL('../testing/fixtures/mcp-echo-server.mjs', import.meta.url));

const OUT_DIR = process.env.SPIKE_OUT ?? mkdtempSync(join(tmpdir(), 'pi-spike-'));

interface Frame {
  readonly dir: 'out' | 'in'; // out = client→agent, in = agent→client
  readonly t: number;
  readonly msg: AnyMessage;
}

/**
 * Wraps a spawner so every ACP JSON-RPC frame is teed into `frames`.
 *
 * Recording is done with **zero-argument** Streams constructors only — an
 * inbound `readable.tee()` (one branch drained to record, the other passed
 * through) and an identity `new TransformStream()` on the outbound side whose
 * frames we read, record, and forward by hand. A `new TransformStream({ transform })`
 * (or its 3-arg variant) is correct WHATWG usage, but CodeQL's `TransformStream`
 * extern models the constructor as taking no parameters and flags any argument as
 * a "superfluous trailing argument" — its suggestions to add, then remove, the
 * arguments contradict each other. Passing no constructor arguments sidesteps the
 * false positive without weakening the recording. Do not "simplify" this back into
 * a transformer-object constructor.
 */
function recordingSpawner(inner: AgentSpawner, frames: Frame[]): AgentSpawner {
  return async (launch): Promise<SpawnedAgent> => {
    const spawned = await inner(launch);
    const start = Date.now();

    // Inbound (agent → client): tee, drain one branch to record, pass the other.
    const [inPass, inTap] = spawned.stream.readable.tee();
    void (async () => {
      const reader = inTap.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          frames.push({ dir: 'in', t: Date.now() - start, msg: value });
        }
      } catch {
        /* stream ended/aborted — recording is best-effort */
      }
    })();

    // Outbound (client → agent): identity transform; read its readable, record
    // each frame, then forward it to the real writable.
    const outIdentity = new TransformStream<AnyMessage, AnyMessage>();
    void (async () => {
      const reader = outIdentity.readable.getReader();
      const writer = spawned.stream.writable.getWriter();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          frames.push({ dir: 'out', t: Date.now() - start, msg: value });
          await writer.write(value);
        }
        await writer.close();
      } catch {
        /* stream ended/aborted — best-effort */
      }
    })();

    return {
      stream: { writable: outIdentity.writable, readable: inPass },
      kill: spawned.kill,
    };
  };
}

function writeEvidence(name: string, value: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

function textPrompt(sessionId: string, text: string) {
  return { sessionId, prompt: [{ type: 'text' as const, text }] };
}

/** Consume a session's update stream in the background; returns a getter + stopper. */
function pumpUpdates(connection: AcpAgentConnection, sessionId: string) {
  const updates: unknown[] = [];
  const done = (async () => {
    try {
      for await (const update of connection.updates(sessionId)) updates.push(update);
    } catch {
      /* stream ends when the connection closes; not an error for the probe */
    }
  })();
  return { updates, done };
}

describePi('Pi adapter spike (integration, SRGNT_IT_PI=1)', () => {
  it(
    'measures permissions, MCP passthrough, loadSession/resume, and fs/terminal delegation',
    async () => {
      // eslint-disable-next-line no-console -- intentional evidence banner.
      console.log(`[SPIKE] evidence dir: ${OUT_DIR}`);
      const summary: Record<string, unknown> = { piAcpVersion: piDefinition.launch.args };

      // ───────────────────────────────────────────────────────────────────
      // Probe 3 — capabilities + loadSession/resume (no inference needed).
      // ───────────────────────────────────────────────────────────────────
      {
        const frames: Frame[] = [];
        const scratch = mkdtempSync(join(tmpdir(), 'pi-spike-p3-'));
        const connection = await Effect.runPromise(
          AcpAgentConnection.connect({
            launch: piDefinition.launch,
            spawn: recordingSpawner(childProcessSpawner, frames),
            ports: { permission: denyPermission() },
          }),
        );
        try {
          const negotiated = connection.capabilities;
          const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
          const sessionId = session.sessionId;

          const loadOutcome = await Effect.runPromise(
            Effect.either(connection.load({ sessionId, cwd: scratch, mcpServers: [] })),
          );
          const resumeOutcome = await Effect.runPromise(
            Effect.either(connection.resume({ sessionId, cwd: scratch })),
          );

          summary.probe3_capabilities = {
            negotiated,
            newSessionId: sessionId,
            load: describeEither(loadOutcome),
            resume: describeEither(resumeOutcome),
          };
          writeEvidence('probe3-frames.json', frames);
          // eslint-disable-next-line no-console -- evidence.
          console.log('[SPIKE][probe3] capabilities', JSON.stringify(negotiated));
          expect(negotiated.protocolVersion).toBeGreaterThan(0);
        } finally {
          connection.close();
          rmSync(scratch, { recursive: true, force: true });
        }
      }

      // ───────────────────────────────────────────────────────────────────
      // Probe 1 + 4 — permission routing and fs/terminal delegation.
      // One prompt turn that asks pi to create a file with its own tools.
      // ───────────────────────────────────────────────────────────────────
      {
        const frames: Frame[] = [];
        const scratch = mkdtempSync(join(tmpdir(), 'pi-spike-p14-'));
        const calls = { permission: [] as unknown[], fs: [] as unknown[], terminal: [] as unknown[] };
        const ports: ClientPorts = {
          permission: {
            requestPermission: (params) => {
              calls.permission.push(params);
              return Promise.resolve({ outcome: { outcome: 'cancelled' as const } });
            },
          },
          fs: recordingFs(calls.fs),
          terminal: recordingTerminal(calls.terminal),
        };
        const connection = await Effect.runPromise(
          AcpAgentConnection.connect({
            launch: piDefinition.launch,
            spawn: recordingSpawner(childProcessSpawner, frames),
            ports,
          }),
        );
        try {
          const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
          const sessionId = session.sessionId;
          const pump = pumpUpdates(connection, sessionId);
          const marker = 'SPIKE_OK_14';
          const promptOutcome = await Effect.runPromise(
            Effect.either(
              connection.prompt(
                textPrompt(
                  sessionId,
                  `Use your file-writing tool to create a file named spike.txt in the current directory ` +
                    `containing exactly the text ${marker}. Then stop.`,
                ),
              ),
            ),
          );
          await Promise.race([pump.done, delay(1500)]);

          const wroteDirectly = existsSync(join(scratch, 'spike.txt'));
          summary.probe1_permissions = {
            requestPermissionCalls: calls.permission.length,
            requestPermissionParams: calls.permission,
          };
          summary.probe4_delegation = {
            fsCalls: calls.fs,
            terminalCalls: calls.terminal,
            agentWroteFileDirectly: wroteDirectly,
            promptOutcome: describeEither(promptOutcome),
            updateKinds: summarizeUpdateKinds(pump.updates),
          };
          writeEvidence('probe1-4-frames.json', frames);
          writeEvidence('probe1-4-updates.json', pump.updates);
          // eslint-disable-next-line no-console -- evidence.
          console.log(
            `[SPIKE][probe1] request_permission calls: ${calls.permission.length}; ` +
              `[probe4] fs calls: ${calls.fs.length}, terminal calls: ${calls.terminal.length}, ` +
              `agent wrote file directly: ${wroteDirectly}`,
          );
        } finally {
          connection.close();
          rmSync(scratch, { recursive: true, force: true });
        }
      }

      // ───────────────────────────────────────────────────────────────────
      // Probe 2 — MCP passthrough via session/new.mcpServers (stdio echo).
      // ───────────────────────────────────────────────────────────────────
      {
        const frames: Frame[] = [];
        const scratch = mkdtempSync(join(tmpdir(), 'pi-spike-p2-'));
        const echoLog = join(OUT_DIR, 'probe2-echo-server.log');
        try {
          rmSync(echoLog, { force: true });
        } catch {
          /* first run: nothing to clean */
        }
        const connection = await Effect.runPromise(
          AcpAgentConnection.connect({
            launch: piDefinition.launch,
            spawn: recordingSpawner(childProcessSpawner, frames),
            ports: { permission: allowPermission() },
          }),
        );
        try {
          const mcpServers = [
            {
              name: 'spike-echo',
              command: process.execPath,
              args: [ECHO_SERVER],
              env: [{ name: 'MCP_ECHO_LOG', value: echoLog }],
            },
          ];
          const newSessionOutcome = await Effect.runPromise(
            Effect.either(connection.newSession({ cwd: scratch, mcpServers })),
          );
          let promptOutcome: unknown = 'skipped (session/new failed)';
          let updateKinds: unknown = [];
          if (newSessionOutcome._tag === 'Right') {
            const sessionId = newSessionOutcome.right.sessionId;
            const pump = pumpUpdates(connection, sessionId);
            const outcome = await Effect.runPromise(
              Effect.either(
                connection.prompt(
                  textPrompt(
                    sessionId,
                    'Call the `echo` tool with the message "hello-from-spike" and report exactly what it returns.',
                  ),
                ),
              ),
            );
            await Promise.race([pump.done, delay(1500)]);
            promptOutcome = describeEither(outcome);
            updateKinds = summarizeUpdateKinds(pump.updates);
            writeEvidence('probe2-updates.json', pump.updates);
          }

          const echoServerLaunched = existsSync(echoLog);
          summary.probe2_mcp_passthrough = {
            newSession: describeEither(newSessionOutcome),
            echoServerLaunched,
            promptOutcome,
            updateKinds,
            echoLogPath: echoLog,
          };
          writeEvidence('probe2-frames.json', frames);
          // eslint-disable-next-line no-console -- evidence.
          console.log(`[SPIKE][probe2] echo server launched (log exists): ${echoServerLaunched}`);
        } finally {
          connection.close();
          rmSync(scratch, { recursive: true, force: true });
        }
      }

      const summaryPath = writeEvidence('spike-summary.json', summary);
      // eslint-disable-next-line no-console -- final evidence pointer.
      console.log(`[SPIKE] summary written: ${summaryPath}`);
      console.log(`[SPIKE] evidence files: ${readdirSync(OUT_DIR).join(', ')}`);
    },
    IT_TIMEOUT_MS,
  );
});

// ─── helpers ───

function denyPermission(): PermissionPort {
  return { requestPermission: () => Promise.resolve({ outcome: { outcome: 'cancelled' as const } }) };
}

function allowPermission(): PermissionPort {
  return {
    requestPermission: (params) => {
      const option = params.options[0];
      return Promise.resolve(
        option
          ? { outcome: { outcome: 'selected' as const, optionId: option.optionId } }
          : { outcome: { outcome: 'cancelled' as const } },
      );
    },
  };
}

function recordingFs(sink: unknown[]): FileSystemPort {
  return {
    readTextFile: (params) => {
      sink.push({ method: 'fs/read_text_file', params });
      return Promise.resolve({ content: '' });
    },
    writeTextFile: (params) => {
      sink.push({ method: 'fs/write_text_file', params });
      return Promise.resolve({});
    },
  };
}

function recordingTerminal(sink: unknown[]): TerminalPort {
  return {
    createTerminal: (params) => {
      sink.push({ method: 'terminal/create', params });
      return Promise.resolve({ terminalId: 'spike-term-1' });
    },
    terminalOutput: (params) => {
      sink.push({ method: 'terminal/output', params });
      return Promise.resolve({ output: '', truncated: false });
    },
    releaseTerminal: (params) => {
      sink.push({ method: 'terminal/release', params });
      return Promise.resolve({});
    },
    waitForTerminalExit: (params) => {
      sink.push({ method: 'terminal/wait_for_exit', params });
      return Promise.resolve({ exitStatus: { exitCode: 0 } });
    },
    killTerminal: (params) => {
      sink.push({ method: 'terminal/kill', params });
      return Promise.resolve({});
    },
  };
}

function describeEither(either: { _tag: 'Left'; left: unknown } | { _tag: 'Right'; right: unknown }): unknown {
  if (either._tag === 'Right') return { ok: true, value: either.right };
  const error = either.left;
  return {
    ok: false,
    error:
      error !== null && typeof error === 'object'
        ? { tag: (error as { _tag?: string })._tag, message: (error as { message?: string }).message }
        : String(error),
  };
}

function summarizeUpdateKinds(updates: readonly unknown[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const update of updates) {
    const kind = (update as { update?: { sessionUpdate?: string } }).update?.sessionUpdate ?? 'unknown';
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
