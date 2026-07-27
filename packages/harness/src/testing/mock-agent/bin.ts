#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { AgentSideConnection, ndJsonStream } from '@agentclientprotocol/sdk';
import { MockAgent } from './runner.js';
import { parseScenario } from './scenario.js';

/**
 * Standalone stdio entry for the mock ACP agent. Reads a scenario file, then
 * speaks JSON-RPC 2.0 ACP over stdin/stdout — the exact contract a real harness
 * satisfies, so the supervisor/registry can launch it as a custom definition
 * (`node dist/testing/mock-agent/bin.js --scenario <file>`).
 *
 * The transport is built by hand (rather than `ndJsonStream(Writable.toWeb(...))`)
 * so a single ordered writer serves both the SDK's framed output *and* the
 * `emit_malformed` directive's raw, un-framed bytes.
 */

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const flagIndex = argv.indexOf(`--${flag}`);
  if (flagIndex !== -1 && flagIndex + 1 < argv.length) {
    return argv[flagIndex + 1];
  }
  return argv.find((arg) => arg.startsWith(`--${flag}=`))?.slice(flag.length + 3);
}

function fail(message: string): never {
  process.stderr.write(`mock-agent: ${message}\n`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const scenarioPath = flagValue(argv, 'scenario') ?? process.env.MOCK_AGENT_SCENARIO;
if (scenarioPath === undefined) {
  fail('no scenario provided (use --scenario <path> or MOCK_AGENT_SCENARIO)');
}

/**
 * Where the turn's `expect_*` failures are written (JSON array, rewritten at the
 * end of every turn). This is the only channel an out-of-process driver has for
 * agent-side assertions: a UI that renders correctly but *answers* a permission
 * request wrongly is invisible from the renderer, and would otherwise pass.
 */
const assertionsPath = flagValue(argv, 'assertions');

let scenario;
try {
  scenario = parseScenario(JSON.parse(readFileSync(scenarioPath, 'utf8')));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

// A single serialized sink over fd 1 so SDK frames and raw malformed bytes
// never interleave mid-write. Directives are awaited in order, so ordering on
// the wire matches scenario order.
const encoder = new TextEncoder();
const writeStdout = (bytes: Uint8Array): Promise<void> =>
  new Promise((resolve, reject) => {
    process.stdout.write(bytes, (error) => (error ? reject(error) : resolve()));
  });

const writable = new WritableStream<Uint8Array>({ write: (chunk) => writeStdout(chunk) });
const readable = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
const stream = ndJsonStream(writable, readable);

new AgentSideConnection(
  (conn) =>
    new MockAgent(conn, scenario, {
      onCrash: (exitCode) => process.exit(exitCode),
      rawWrite: (raw) => writeStdout(encoder.encode(raw)),
      ...(assertionsPath !== undefined
        ? {
            // Synchronous on purpose: the runner awaits this before the
            // `PromptResponse` is framed, so a driver that sees the turn finish
            // is guaranteed to find the file already written.
            onTurnEnd: (errors: readonly string[]) =>
              writeFileSync(assertionsPath, JSON.stringify(errors)),
          }
        : {}),
    }),
  stream,
);
