# Execution Brief

## Why

- The GroupBroker + injected MCP server are tier 1 of the bus — structured agent-to-agent messaging (`group_send`/`group_inbox`/`group_wait`/`group_status`) instead of prose-in-prompts. Tier 1 is what makes pipelines (Phase 28) mechanically checkable later.
- **Spike-measured constraint that shapes this whole step:** `pi-acp@0.0.31` never forwards `session/new.mcpServers` (probe 2; `mcp-passthrough-gaps` quirk; `capabilityOverrides: { mcpServers: false }` in `packages/harness/src/registry/builtins.ts`). Unless the phase entry gate (see STEP-27-01 brief / DEC-0018) resolved to upstream-landed or fork-built, **Pi members never get tier 1** — this step must be built and validated against the mock agent (and opencode when available), with per-member eligibility read from *effective* capabilities, never assumed.

## Prerequisites

- STEP-27-01 merged (member specs, `GroupSessionController`, member channels). Entry-gate outcome recorded in DEC-0018.
- Read: `packages/harness/src/acp/connection.ts` (`newSession(params: NewSessionRequest)` passes `mcpServers` through verbatim — the dev console already passes `mcpServers: []` at `dev-console/session-controller.ts:175`); `packages/harness/src/acp/capabilities.ts` (`NegotiatedCapabilities.mcpServers` + `applyCapabilityOverrides` — this boolean IS the tier-1 eligibility signal); ARCH-0009 Data Flow "Group message" + Failure Modes "MCP bus socket loss".
- **Two concrete prerequisite tasks on the mock agent (the test substrate cannot exercise tier 1 today — verified against current source):**
  - (a) `MockAgent.newSession(_params)` in `packages/harness/src/testing/mock-agent/runner.ts` **ignores its params**: it must capture `params.mcpServers` and actually spawn the declared stdio MCP server(s) as child processes so injection is end-to-end real.
  - (b) The scenario schema (`packages/harness/src/testing/mock-agent/scenario.ts`) has **no MCP directive** (current set: emit_chunks … expect_cancel). Add a `call_mcp_tool` directive `{ type, server, tool, args?, expectResultContains? }` that drives a minimal MCP client (initialize → tools/call) against the spawned server, mirroring how `use_terminal`/`read_file` drive client-service round-trips. Keep `DIRECTIVE_TYPES` and its exhaustiveness checks updated.
  - Budget these as the first two checklist items — they are real work, not test glue.
- New dependency: an MCP server/client SDK (default `@modelcontextprotocol/sdk`; executor verifies the current package + version and records it). Used by the bus-server bin (server side) and the mock agent's `call_mcp_tool` (client side).

## Likely Code Paths

- `packages/harness/src/groups/broker.ts` (new dir) — `GroupBroker`, pure Node: member registry (`role`, auth token, tier-1 eligibility, connected-state), per-member inbox queues, `group_wait` long-poll resolvers, routing (targeted + broadcast). **Boundary rule (ARCH-0009): `harness` never touches disk layout** — the broker persists nothing; it emits typed events (`message`, `member-connected`, `member-disconnected`, …) that desktop main taps and STEP-27-03 wires into the runtime store. Bus delivery order: persist-then-fan-out is the STEP-27-03 contract; design the emit API so the tap can be awaited before fan-out.
- `packages/harness/src/groups/socket.ts` — local socket transport: `net.createServer` on a unix socket at a **short** tmp path (`join(os.tmpdir(), 'srgnt-bus-<id>.sock')` — macOS `sun_path` caps ~104 chars, do NOT put it under the workspace) / named pipe `\\\\.\\pipe\\srgnt-bus-<id>` on win32. NDJSON frames `{ id, method, params }` / `{ id, result | error }`. First frame must be `{ method: 'hello', params: { role, token } }`; wrong/missing token → error frame + immediate socket destroy.
- `packages/harness/src/groups/bus-server/bin.ts` — the injected stdio MCP server executable: registers the five tools (`group_send`, `group_inbox`, `group_wait`, `group_status`, `memory_search`), each handler = one request over the socket, response mapped straight back. Zero business logic in the child (phase note rule). `memory_search` is registered now but returns a graceful `{ available: false }` until STEP-27-05 wires the broker side. Reconnect with capped backoff on socket loss (ARCH failure mode); tool calls during disconnection return a retryable error, never hang forever.
- Injection point — `GroupSessionController` (desktop main): for members whose **effective** `connection.capabilities.mcpServers === true`, build `session/new` with `mcpServers: [{ name: 'srgnt-group-bus', command: process.execPath, args: [busServerBinJs], env: { ELECTRON_RUN_AS_NODE: '1', SRGNT_BUS_SOCKET, SRGNT_BUS_TOKEN, SRGNT_BUS_ROLE } }]` (executor verifies the SDK's stdio `McpServer` field names against `@agentclientprotocol/sdk` 1.2.x). Bin path resolved via `require.resolve('@srgnt/harness')` + join — the exact recipe `mockLaunchSpec()` in `dev-console/session-controller.ts` already uses for the mock bin. For ineligible members, pass `mcpServers: []` — never inject and hope.
- **How the broker knows a member's tier:** the controller registers every member with its eligibility flag (from effective capabilities); the broker marks a member tier-1-*live* only after an authenticated `hello` arrives on the socket. Eligible-but-never-connected (e.g. harness silently drops the server) degrades to tier 2 after a connect-timeout — visibly, via a roster badge event, never silently (capability-driven-UI invariant).
- Packaging note: the bus-server bin ships inside the app like the mock-agent bin does (plain built JS in the harness package). Recorded assumption: no electron-builder change needed in dev; verifying reachability inside the packaged/asar app belongs to Phase 29 packaging — leave a pointer in Implementation Notes when done.

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- One broker + one socket per group session, created on group start, closed on group dispose; tokens are per-member random 32-byte hex, minted at member spawn, never persisted.
- `group_send` `{ to?, text }` — absent `to` = broadcast (`to: '*'`); unknown `to` → tool error naming valid roles. `group_inbox` `{ max? }` drains FIFO. `group_wait` `{ timeoutMs }` (default 30 000, cap 120 000) resolves early on arrival, returns `{ timedOut: true }` otherwise — never an error. `group_status` returns roster: role, harness name, live tier, busy/idle.
- Inbox depth capped (default 200/member, drop-oldest + system event) so a chatty member cannot balloon memory.
- Broker is transport-agnostic and test-injectable: unit tests drive it with an in-memory duplex pair, no real sockets needed.

## Execution Checklist

1. Mock-agent prerequisite (a): capture + spawn `mcpServers` from `session/new`; subprocess test proving the declared server process starts.
2. Mock-agent prerequisite (b): `call_mcp_tool` directive + minimal MCP client; scenario-schema tests.
3. Add the MCP SDK dependency (record exact version); build `bus-server/bin.ts` with the five tools as socket relays.
4. Implement `broker.ts` + `socket.ts` with token auth, inbox/wait semantics, and typed event emission; unit tests via in-memory transport.
5. Wire injection + tier registration into `GroupSessionController` (eligibility from effective capabilities; connect-timeout downgrade).
6. Integration test: two mock members, A `call_mcp_tool group_send`, B `call_mcp_tool group_wait`/`group_inbox` — full round trip through real bin + real socket.
7. Run the Validation Plan; record deviations (esp. SDK field names, packaged-path findings) in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server|STEP-27-02 Implement GroupBroker and injected bus MCP server]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Gate + evidence: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]], [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 2)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (group message data flow, socket-loss failure mode, harness/runtime boundary)
