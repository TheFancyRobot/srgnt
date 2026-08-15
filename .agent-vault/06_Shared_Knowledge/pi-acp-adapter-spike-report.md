---
note_type: shared_knowledge
title: Pi ACP Adapter Spike Report (STEP-22-05)
created: '2026-07-15'
updated: '2026-07-15'
tags:
  - acp
  - pi
  - spike
  - phase-22
---

# Pi ACP Adapter Spike Report (STEP-22-05)

## Purpose

Measured findings from driving the pinned `pi-acp@0.0.31` adapter over real ACP,
answering the four questions the Pi-strategy decision gate ([[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]])
depends on: permission routing, MCP passthrough, `loadSession`/`resume`, and
fs/terminal delegation. Evidence is raw JSON-RPC frames captured during a live
run; this note is the source of truth the gate cites, not assumptions.

## Environment (ground truth, 2026-07-15)

- `pi --version` → 0.80.6; `pi-acp` pinned at `0.0.31` (`npx pi-acp@0.0.31`); node v24.15.0.
- SDK: `@agentclientprotocol/sdk` 1.2.1; ACP protocol version **1** negotiated.
- Active model during the spike: `cathulu/unsloth/gemma-4-31B-it-GGUF:Q5_K_M` — a
  **local LAN llama-server** (reachable, free). **Zero cloud tokens spent**; every
  probe used a trivial prompt (cost-control rule honored).
- Harness driver: `packages/harness/src/registry/pi-spike.integration.test.ts`
  (gated behind `SRGNT_IT_PI=1`; `describe.skip` otherwise, so normal suites stay green).
  A recording spawner tees every JSON-RPC frame in both directions.
- Curated, redacted frame excerpts committed at
  `packages/harness/src/testing/fixtures/pi-spike/spike-frames.json` (full untrimmed
  dumps written to a scratch dir at run time; the model catalog was trimmed out —
  `session/load` returns ~100 models inline).

## Baseline: negotiated capabilities (confirms STEP-22-03)

The `initialize` payload is byte-consistent with the STEP-22-03 capture:

```json
{
  "protocolVersion": 1, "agentName": "pi-acp", "agentVersion": "0.0.31",
  "loadSession": true, "resumeSession": false, "modes": false,
  "slashCommands": false, "images": true, "audio": false,
  "embeddedContext": false, "mcpServers": true, "mcpHttp": false, "mcpSse": false
}
```

New detail the raw `initialize` result surfaced beyond the normalized model:

- `agentInfo.title`: "pi ACP adapter".
- `authMethods`: one entry `pi_terminal_login` (type `terminal`, args `--terminal-login`) —
  the adapter advertises an interactive terminal login flow for unconfigured pi.
- `agentCapabilities.sessionCapabilities.list = {}` → **`session/list` IS supported**
  (not modeled in our `NegotiatedCapabilities` yet); `resume` is absent from
  `sessionCapabilities`, matching `resumeSession: false`.

`mcpServers: true` is the protocol baseline; the built-in Pi definition clamps it
to effective **false** via `capabilityOverrides` — probe 2 confirms that clamp is correct.

## Probe 1 — Permissions: does `session/request_permission` round-trip?

**Finding: NO. pi-acp self-approves; permission never reaches the client over ACP.**

- Setup: client advertised a permission port that records + denies every request;
  prompt asked pi to create `spike.txt` with a marker using its file-writing tool.
- Result: `session/request_permission` calls received = **0**. The turn ran to
  `end_turn` and pi executed the tool anyway (see probe 4 — the file was written).
- Confirms the `permission-routing-gaps` quirk. For Pi, there is **no client-side
  permission gate over ACP** — approvals happen inside pi's own process/config.

## Probe 2 — MCP passthrough: does `session/new.mcpServers` reach pi?

**Finding: NO. Injected stdio MCP servers are not forwarded to the underlying pi.**

- Setup: passed a valid stdio MCP echo server in `session/new.mcpServers`
  (`packages/harness/src/testing/fixtures/mcp-echo-server.mjs`, which logs every
  inbound line); prompt explicitly asked pi to call the `echo` tool. `session/new`
  succeeded.
- Result: the echo server process was **never launched** (no log file created), and
  pi never called the tool (turn ran to `end_turn` using only pi's own built-in
  tools). Injected MCP servers do **not** reach the underlying agent.
- Confirms the `mcp-passthrough-gaps` quirk and validates the definition's
  `capabilityOverrides: { mcpServers: false }` clamp — the console/UI correctly reports
  MCP injection as unavailable for Pi.

## Probe 3 — loadSession / resume

**Finding: `session/load` WORKS (and is rich); `session/resume` is unsupported.**

- `session/load` on a just-created session **succeeded**, returning a payload with:
  - `configOptions`: a `model` selector (currentValue `cathulu/...gemma-4-31B...`, ~100
    options across deepseek/github-copilot/openai-codex/minimax/openadapter/cathulu/
    synthetic providers) and a `thought_level` selector (off → xhigh).
  - `models`: `{ availableModels: [...], currentModelId }`.
  - `modes`: thinking levels (`off, minimal, low, medium, high, xhigh`) with
    `currentModeId: high` — i.e. pi-acp exposes **thinking level as an ACP session mode**.
  - `_meta.piAcp.startupInfo`.
- `session/resume` → JSON-RPC error `-32601 "Method not found": session/resume`
  (matches `resumeSession: false`).
- Downstream value: model selection and reasoning-effort are reachable over ACP via
  `session/load` config + `session/set_mode` — useful for Phase 24 per-project defaults
  and Phase 23 session controls without bespoke pi wiring.

## Probe 4 — fs/terminal delegation

**Finding: NO delegation. pi executes tools in-process; client fs/terminal ports are never called.**

- Setup: client advertised both `fs` and `terminal` capabilities with recording ports;
  same file-creation prompt as probe 1.
- Result: `fs/*` calls = **0**, `terminal/*` calls = **0**, but the file **was written
  directly** by pi (`agentWroteFileDirectly: true`). The turn streamed 1 `tool_call`
  + 24 `tool_call_update` frames — pi runs its own tools inside the adapter process.
- Confirms adapter-mediated in-process execution: the client cannot mediate or sandbox
  Pi's file/terminal I/O over ACP. Tool activity is still *observable* via
  `tool_call`/`tool_call_update` updates (good for the UI), just not *delegated*.

## Streamed-update shape (for Phase 23 UI)

A single trivial prompt produced these `session/update` kinds (probe 4 turn):
`agent_thought_chunk` (37), `tool_call_update` (24), `agent_message_chunk` (23),
`session_info_update` (2), `tool_call` (1), `available_commands_update` (1). So thought
streaming, message streaming, tool cards, and a commands advertisement all arrive over
the normal update stream — the mock agent's scenario coverage matches real Pi shape.

## Implications for downstream phases

- **Phase 23 (chat UI):** the permission "trust badge" for Pi must communicate
  *self-approving / no client gate* — do not imply srgnt is gating Pi's tool use.
  fs/terminal embeds cannot rely on client delegation for Pi (render from
  `tool_call` content instead).
- **Phase 27 (groups + bus):** the bus design injects a stdio MCP server via
  `session/new.mcpServers`. **That mechanism will not work for Pi members as-is**
  (probe 2). Pi group members need the adapter fix (native `--mode acp` / fork) or a
  non-MCP bus tier (prompt-nudge / mailbox fallback). This is the single biggest
  cross-phase consequence.
- **Phase 24/25:** model + thinking-level selection is available over ACP for Pi via
  `session/load` config options and `session/set_mode`.

## Raw evidence pointers

- Curated frames (committed): `packages/harness/src/testing/fixtures/pi-spike/spike-frames.json`.
- Reproduce: `SRGNT_IT_PI=1 SPIKE_OUT=<dir> pnpm --filter @srgnt/harness test pi-spike`.
- MCP echo probe server: `packages/harness/src/testing/fixtures/mcp-echo-server.mjs`.

## Related Notes

- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|PHASE-22 ACP Core Package and Pi Integration Spike]]
- Decision gate: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]]
- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]
- Boundary decision: [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]
- Contrast capture: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]]
- Consumer: [[06_Shared_Knowledge/cross-harness-lessons-learned|Cross-Harness Lessons Learned (STEP-25-04)]] — probes 1, 2 and 4 here are the direct evidence for REQ-26-09, REQ-26-10 and REQ-26-11 (the conformance runner's behavioral checks).
