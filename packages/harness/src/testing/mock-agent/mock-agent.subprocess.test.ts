import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LaunchSpec } from '@srgnt/contracts';
import { Effect } from 'effect';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AcpAgentConnection, ConnectionLost, type PermissionPort } from '../../acp/index.js';
import { HarnessRegistry } from '../../registry/index.js';
import { Supervisor } from '../../supervisor/index.js';
import type { Scenario } from './scenario.js';

/**
 * The honest, slow path: compile the mock agent's bin and drive it as a real OS
 * subprocess over stdio — launched exactly as production launches an agent, via
 * a {@link HarnessRegistry} custom definition and the {@link Supervisor}. Covers
 * the byte-level concerns the in-process matrix cannot (raw malformed frames,
 * real process death) and proves the bin speaks valid ACP standalone.
 */

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');
const here = dirname(fileURLToPath(import.meta.url));
// dist/testing/mock-agent — matches the acceptance-check path
// `node dist/testing/mock-agent/bin.js --scenario <file>`.
const outDir = join(here, '..', '..', '..', 'dist', 'testing', 'mock-agent');
const BIN = join(outDir, 'bin.js');

function transpile(name: string): void {
  const source = readFileSync(join(here, `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    // ESNext (not NodeNext) so transpileModule reliably emits ESM — it cannot
    // detect the package's "type": "module" from a bare fileName and would
    // otherwise fall back to CommonJS. Import specifiers keep their `.js`.
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: `${name}.ts`,
  });
  writeFileSync(join(outDir, `${name}.js`), outputText);
}

const scratch = mkdtempSync(join(tmpdir(), 'mock-agent-'));
const scenarioFile = (name: string, scenario: Partial<Scenario> & { directives: Scenario['directives'] }): string => {
  const path = join(scratch, `${name}.json`);
  writeFileSync(path, JSON.stringify({ name, ...scenario }));
  return path;
};

const supervisor = new Supervisor({ processOptions: { killGraceMs: 1_000 } });
const cancelPermissions: PermissionPort = {
  requestPermission: () => Promise.resolve({ outcome: { outcome: 'cancelled' } }),
};

/** Registers a `mock` custom definition and returns a connection to its subprocess. */
async function connectViaRegistry(id: string, launch: LaunchSpec): Promise<AcpAgentConnection> {
  const registry = HarnessRegistry.create({
    workspace: {
      version: 1,
      harnesses: [
        { id, name: 'Mock', source: 'custom', launch, quirks: [], capabilityOverrides: {}, description: 'test' },
      ],
    },
  });
  const definition = registry.require(id);
  expect(definition.source).toBe('custom');
  supervisor.register(id, definition.launch);
  return Effect.runPromise(
    AcpAgentConnection.connect({
      launch: definition.launch,
      spawn: supervisor.spawnerFor(id),
      ports: { permission: cancelPermissions },
    }),
  );
}

const launchFor = (file: string): LaunchSpec => ({
  command: process.execPath,
  args: [BIN, '--scenario', file],
  env: {},
});

beforeAll(() => {
  mkdirSync(outDir, { recursive: true });
  // bin depends only on runner + scenario (+ external SDK/effect resolved up-tree).
  for (const name of ['scenario', 'runner', 'bin']) {
    transpile(name);
  }
});

afterAll(async () => {
  await supervisor.disposeAll();
});

describe('standalone bin over stdio (registry custom definition + supervisor)', () => {
  it('speaks valid ACP: initialize, session/new, and a streamed prompt turn', async () => {
    const file = scenarioFile('stream', {
      directives: [{ type: 'emit_chunks', chunks: ['Hello', ' from', ' stdio'] }],
    });
    const connection = await connectViaRegistry('mock-stream', launchFor(file));
    expect(connection.capabilities.agentName).toBe('srgnt-mock-agent');

    const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
    const iterator = connection.updates(session.sessionId);
    const response = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'hi' }] }),
    );
    expect(response.stopReason).toBe('end_turn');

    const received: string[] = [];
    for (let i = 0; i < 3; i++) {
      const update = (await iterator.next()).value.update;
      if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
        received.push(update.content.text);
      }
    }
    expect(received).toEqual(['Hello', ' from', ' stdio']);
  }, 30_000);

  it('emits raw malformed bytes mid-turn and the wrapper skips-and-continues', async () => {
    const file = scenarioFile('malformed', {
      directives: [
        { type: 'emit_chunks', chunks: ['before'] },
        { type: 'emit_malformed', raw: 'this is not json-rpc at all\n' },
        { type: 'emit_chunks', chunks: ['after'] },
      ],
    });
    const connection = await connectViaRegistry('mock-malformed', launchFor(file));
    const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
    const iterator = connection.updates(session.sessionId);
    const response = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );
    expect(response.stopReason).toBe('end_turn');
    const chunks: string[] = [];
    for (let i = 0; i < 2; i++) {
      const update = (await iterator.next()).value.update;
      if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
        chunks.push(update.content.text);
      }
    }
    // Despite the garbage line between them, both valid frames still arrive.
    expect(chunks).toEqual(['before', 'after']);
  }, 30_000);

  it('crashes mid-turn (process.exit) and the wrapper surfaces ConnectionLost', async () => {
    const file = scenarioFile('crash', {
      directives: [{ type: 'emit_chunks', chunks: ['partial'] }, { type: 'crash', exitCode: 7 }],
    });
    const connection = await connectViaRegistry('mock-crash', launchFor(file));
    const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
    const error = await Effect.runPromise(
      Effect.flip(
        connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
      ),
    );
    expect(error).toBeInstanceOf(ConnectionLost);
    await connection.closed;
  }, 30_000);

  // The only channel an out-of-process driver (the desktop E2E suite) has for
  // agent-side assertions: without it a client that renders a permission prompt
  // correctly but answers it with the wrong option would look like a pass.
  it('writes expect_* failures to --assertions before the turn response', async () => {
    const file = scenarioFile('assertions', {
      directives: [
        { type: 'expect_prompt', contains: 'never sent' },
        {
          type: 'request_permission',
          toolCallId: 'p1',
          title: 'Do a thing',
          kind: 'edit',
          locations: [{ path: '/w/answer.ts' }],
          options: [{ optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' }],
          expectOutcome: 'selected',
        },
      ],
    });
    const assertionsFile = join(scratch, 'assertions.json');
    const connection = await connectViaRegistry('mock-assertions', {
      command: process.execPath,
      args: [BIN, '--scenario', file, '--assertions', assertionsFile],
      env: {},
    });
    const session = await Effect.runPromise(connection.newSession({ cwd: scratch, mcpServers: [] }));
    await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );

    // The file exists the moment the prompt resolves — no polling, no sleep.
    const failures = JSON.parse(readFileSync(assertionsFile, 'utf8')) as string[];
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain('expect_prompt');
    // `cancelPermissions` answers every request `cancelled`, so the scenario's
    // `expectOutcome: 'selected'` is the second recorded failure.
    expect(failures[1]).toContain('expected outcome selected but got cancelled');
  }, 30_000);
});
