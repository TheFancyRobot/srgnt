---
note_type: shared_knowledge
title: opencode ACP Capture (STEP-25-01)
created: '2026-08-13'
updated: '2026-08-13'
tags:
  - acp
  - opencode
  - capture
  - phase-25
---

# opencode ACP Capture (STEP-25-01)

## Purpose

Measured baseline for opencode, srgnt's first **native** ACP harness — the
counterpart to the adapter-mediated [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]].
Everything below was observed at runtime; nothing is declared. This note is
STEP-25-04's primary input for the cross-harness lessons that drive Phase-26
generic-support requirements.

## Environment (ground truth, 2026-08-13)

- `opencode --version` → **1.18.18** (bare token, no banner — the existing
  `parseVersion` first-semver rule handles it unchanged). Installed at
  `~/.nvm/versions/node/v24.15.0/bin/opencode` (nvm-global: shares
  pi's PATH caveat — a GUI-launched Electron build will not see it without a
  login shell).
- Launch: `opencode acp` (native ACP mode, no adapter). ACP protocol version
  **1**; SDK `@agentclientprotocol/sdk` 1.2.1.
- Driver: `packages/harness/src/registry/opencode.integration.test.ts`, gated
  behind `SRGNT_IT_OPENCODE=1` (`describe.skip` otherwise, so CI stays green).
  The run *is* the capture — it writes the fixtures itself.
- Model during the capture: `opencode/big-pickle` (OpenCode Zen), one trivial
  prompt ("Reply with the single word: ok"). Cost rule honored.
- Committed evidence: `packages/harness/src/testing/fixtures/opencode/`
  (`initialize.json`, `simple-prompt.jsonl`, `README.md`). Home paths redacted;
  command/model/agent catalogs capped at 3 entries with the original count kept.

## Baseline: negotiated capabilities

Derived by `negotiateCapabilities` from the raw `initialize` result:

```json
{
  "protocolVersion": 1, "agentName": "OpenCode", "agentVersion": "1.18.18",
  "loadSession": true, "resumeSession": true, "sessionList": true,
  "authMethods": [{ "id": "opencode-login", "name": "Login with opencode",
                    "description": "Run `opencode auth login` in the terminal" }],
  "modes": false, "slashCommands": false,
  "images": true, "audio": false, "embeddedContext": true,
  "mcpServers": true, "mcpHttp": true, "mcpSse": true
}
```

Raw `agentCapabilities.sessionCapabilities` is `{ close: {}, fork: {}, list: {},
resume: {} }` — opencode advertises **two lifecycle capabilities srgnt does not
model at all**: `session/close` and `session/fork`. srgnt forks by replaying
into a fresh session (STEP-24-04); a native fork exists here and is invisible to
the model.

**Zero quirks, zero overrides** — the effective view equals the negotiated view
(asserted in the IT). Contrast with Pi, whose definition clamps `mcpServers`
off.

## Measured contrasts with Pi

| Question | pi (adapter) | opencode (native) |
| --- | --- | --- |
| ACP surface | `npx pi-acp@0.0.31` shim | `opencode acp` built in |
| `loadSession` / `resume` | true / false | true / **true** |
| `session/list` | advertised | advertised |
| `session/close`, `session/fork` | not advertised | **advertised (unmodeled)** |
| MCP transports | stdio only (`http:false`, `sse:false`), clamped off by quirk | stdio + **http + sse** |
| `embeddedContext` | false | **true** |
| Auth method metadata | `type: "terminal"`, `args: ["--terminal-login"]` | **id/name/description only** |
| Modes | `modes` block on `session/load` | **`configOptions`, no `modes` block** |
| Slash commands | none observed | **`available_commands_update`, 93 commands** |

## Findings (each one a STEP-25-04 input)

1. **Modes are exposed as `configOptions`, not `modes`.** `session/new` returns
   `configOptions: [{ id: "model", type: "select", … }, { id: "mode", type:
   "select", currentValue: "build", … }]` and **no** `modes`/`availableModes`
   block. srgnt's `readModes` (desktop `session-controller.ts`) only reads the
   latter, so opencode's mode *and model* selectors are invisible today, and
   `session/set_mode` is the wrong method for them (`session/set_config_option`
   is). This is the clearest code-not-data gap found: supporting it is a new
   generic surface (config options), not a new definition field.
2. **Slash commands are real and session-discovered.** The first turn emits
   `available_commands_update` with 93 commands. Nothing at `initialize` hints
   at this — direct confirmation of the merge rule this step establishes
   (`mergeSessionCapabilities`): capabilities discovered mid-session must fold
   into the negotiated baseline, or the matrix under-reports the agent.
3. **Auth metadata is prose, not data.** opencode's single method carries no
   `type`/`args`/`env`; the actual command (`opencode auth login`) exists only
   inside the human-readable `description`. Pi's method is machine-actionable.
   STEP-25-03's auth panel therefore cannot construct a login command from data
   for every harness — it must degrade to showing the description, and must not
   assume pi's shape. (Full method metadata is now preserved on
   `NegotiatedCapabilities.authMethods` precisely so this stays visible.)
4. **`agentInfo.name` is `"OpenCode"`, not the harness id.** Display names come
   from the agent, ids from the definition; STEP-25-02's settings UI must not
   conflate them.
5. **Not-installed is untested against reality here** (opencode *is* installed).
   The `not-installed` / `probe-failed` paths are covered with injected probes
   and the `hang-probe.mjs` fixture, never by uninstalling.

## Explicitly not measured in this step

Recorded so nobody reads silence as evidence:

- **Permission round-trip.** The trivial prompt triggered no tool call, so
  `session/request_permission` was never exercised (`permissionRequests=0` is
  *not* a finding about self-approval). The Pi contrast on permission routing
  remains open — it needs a tool-invoking probe, which STEP-25-03/Phase 26 can
  pay for.
- **`session/load` and `session/resume` behavior.** Both are *advertised*; only
  the advertisement was measured, not a live replay/resume round-trip.
- **MCP passthrough.** `mcpServers`/`mcpHttp`/`mcpSse` are advertised;
  no echo-server probe was run (the Pi spike's probe 2 equivalent).
- **Unauthenticated behavior.** The capture machine has a configured provider,
  so the auth-required failure shape was not observed.

## Reproduce

```bash
opencode --version                                   # expect 1.18.18
SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode
```

The run rewrites `packages/harness/src/testing/fixtures/opencode/`. Re-record
deliberately: the committed files are what STEP-25-03's matrix asserts against.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Contrast capture: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]]
