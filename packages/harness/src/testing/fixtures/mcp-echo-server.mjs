#!/usr/bin/env node
// Minimal MCP stdio server used as spike evidence (STEP-22-05, probe 2).
//
// It implements just enough of the Model Context Protocol over stdio —
// `initialize`, `notifications/initialized`, `tools/list`, `tools/call` — to
// expose a single `echo` tool. Every inbound JSON-RPC line is appended to the
// file named by MCP_ECHO_LOG (if set), so the spike can observe *whether the
// pi-acp adapter forwarded the injected MCP server to the underlying agent at
// all* — the initialize/tools handshake landing in the log is proof of
// passthrough even if the model never emits a `tools/call`.
//
// Deliberately dependency-free (no @modelcontextprotocol/sdk): it is test
// tooling, must launch under `npx`/`node` with zero install, and only needs to
// answer a fixed, tiny slice of the protocol.
import { appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const LOG = process.env.MCP_ECHO_LOG;
const log = (kind, payload) => {
  if (LOG === undefined) return;
  try {
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), kind, payload }) + '\n');
  } catch {
    /* evidence logging is best-effort; never crash the server over it */
  }
};

const send = (message) => {
  process.stdout.write(JSON.stringify(message) + '\n');
};

const PROTOCOL_VERSION = '2025-06-18';

const ECHO_TOOL = {
  name: 'echo',
  description: 'Echoes back the provided message. Spike probe tool.',
  inputSchema: {
    type: 'object',
    properties: { message: { type: 'string', description: 'Text to echo back.' } },
    required: ['message'],
  },
};

function handle(request) {
  const { id, method, params } = request;
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'srgnt-spike-echo', version: '0.0.1' },
        },
      };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: [ECHO_TOOL] } };
    case 'tools/call': {
      const message = params?.arguments?.message ?? '';
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: `echo: ${message}` }], isError: false },
      };
    }
    default:
      // Notifications (no id) get no response; unknown requests get an error.
      if (id === undefined || id === null) return undefined;
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

// Startup marker: create/append the log the instant the process starts, so the
// spike can tell "server was spawned but never received a line" (a passthrough
// failure) from "server was never spawned" — without it, existsSync(LOG) is a
// false negative for a process that launched but got no handshake.
log('start', { pid: process.pid });

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;
  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    log('parse_error', trimmed.slice(0, 200));
    return;
  }
  log('recv', request);
  const response = handle(request);
  if (response !== undefined) {
    log('send', response);
    send(response);
  }
});
