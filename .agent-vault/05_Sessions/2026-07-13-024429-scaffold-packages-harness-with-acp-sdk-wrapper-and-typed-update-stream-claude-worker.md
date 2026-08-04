---
note_type: session
template_version: 2
contract_version: 1
title: claude-worker session for Scaffold packages/harness with ACP SDK wrapper and typed update stream
session_id: SESSION-2026-07-13-024429
date: '2026-07-13'
status: completed
owner: claude-worker
branch: ''
phase: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]'
related_bugs: []
related_decisions: []
created: '2026-07-13'
updated: '2026-07-13'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-13-024429
  status: completed
  updated_at: '2026-07-13T02:44:29.677Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]].
    target: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]'
    section: Context Handoff
  last_action:
    type: saved
context_status: completed
---

# claude-worker session for Scaffold packages/harness with ACP SDK wrapper and typed update stream

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 02:44 - Created session note.
- 02:44 - Linked related step [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]].
<!-- AGENT-END:session-execution-log -->
- Read step note, Execution_Brief, Validation_Plan, contracts v2 (`harness.ts`, `session.ts`), and ACP architecture note; confirmed readiness gate.
- Scaffolded `packages/harness` as `@srgnt/harness` mirroring `packages/runtime` shape; pinned `@agentclientprotocol/sdk` at exact `1.2.1` (no caret).
- Made the package ESM (`"type": "module"`, tsconfig `module: NodeNext`) — deviation from runtime's CommonJS because the SDK is ESM-only; a CJS build would `require()` ESM and crash on Node 20.
- Implemented `src/acp/errors.ts` (5 Schema.TaggedError tags), `capabilities.ts` (NegotiatedCapabilities + overrides), `stream.ts` (SessionUpdateHub: per-session unbounded queues + warning channel + Effect Stream adapter), `connection.ts` (AcpAgentConnection wrapping ClientSideConnection; injected spawner; client-service ports; default childProcessSpawner).
- Added `scripts/check-harness-boundary.mjs` wired into the package `lint` script (root `pnpm lint` runs it via `pnpm -r`); proved it exits 1 on a deliberate `import 'electron'` (both tsc and the script caught it), then removed the violation.
- Wrote 25 tests across 3 files incl. in-process client↔agent pair, cancel mid-turn, slow-consumer no-deadlock, unknown-session warning drop, garbage-frame tolerance (pinned SDK behavior), and full error-taxonomy construction through wrapper paths.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- SDK 1.2.1 is ESM-only; harness is the workspace's first ESM package (runtime/contracts stay CJS — Node ESM imports their CJS dist fine).
- SDK 1.2.1 deprecates `ClientSideConnection`/`AgentSideConnection` in favor of a new `client()`/`agent()` app-builder API. The deprecated classes are fully functional and match the step spec; consider migrating when the SDK is next bumped.
- Pinned SDK behavior: `ndJsonStream` tolerates garbage stdout lines between frames (skips with console log; connection survives) — test asserts tolerance, not ProtocolError.
- SDK augments the initialize request's `clientCapabilities` with an `auth` block on the wire; wire-shape assertions must use subset matching.
- Modes and slash commands are not advertised at `initialize` time (they surface via `session/new` response / `available_commands_update`), so NegotiatedCapabilities defaults them false; overrides can force them.
- MCP stdio injection is protocol baseline, so `mcpServers` negotiates true by default; the pi-acp `mcp-passthrough-gaps` quirk should force it off via overrides (registry step).

## Context Handoff

- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.
- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.
- Next step (STEP-22-02, supervisor) builds on `AgentSpawner`/`SpawnedAgent` in `packages/harness/src/acp/connection.ts` — replace `childProcessSpawner`'s naive kill with kill-tree lifecycle there, not in acp/.
- Public API surface exported from `@srgnt/harness` root: AcpAgentConnection, childProcessSpawner, ports interfaces, SessionUpdateHub, NegotiatedCapabilities helpers, five tagged errors + AcpWrapperError union.
- Test substrate pattern for later steps: in-process `AgentSideConnection` + `TransformStream<AnyMessage>` pair (message level) and `ndJsonStream` over byte TransformStreams (wire level) — see `connection.test.ts`.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- Recorded below, outside the block.
<!-- AGENT-END:session-changed-paths -->
- `packages/harness/package.json` — new package `@srgnt/harness`, ESM, SDK pinned `1.2.1`.
- `packages/harness/tsconfig.json` — extends `@srgnt/tsconfig/base.json`, NodeNext.
- `packages/harness/src/index.ts`, `src/acp/index.ts` — exports.
- `packages/harness/src/acp/{errors,capabilities,stream,connection}.ts` — wrapper implementation.
- `packages/harness/src/acp/{errors→covered in connection,capabilities,stream,connection}.test.ts` — 3 test files, 25 tests.
- `packages/harness/scripts/check-harness-boundary.mjs` — boundary enforcement.
- `pnpm-lock.yaml` — SDK 1.2.1 added.

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: recorded below, outside the block
- Result: recorded below, outside the block
- Notes: The commands and results are recorded below this block, outside it.
<!-- AGENT-END:session-validation-run -->
- `pnpm --filter @srgnt/harness test`: 25 passed / 0 failed (3 files: connection 11, stream 7, capabilities 7... actual split: capabilities 6, stream 7, connection 12).
- `pnpm --filter @srgnt/harness typecheck`: clean. Boundary script: passed clean; exit 1 with deliberate electron import.
- Root `pnpm lint`: all 5 packages green, harness boundary check included automatically.
- Root `pnpm build`: green, `packages/harness/dist/acp/*` emitted.
- Root `pnpm test`: contracts 127, harness 25, runtime 287, desktop 758 — all passed, 0 failed.
- Correction (exact per-file split): capabilities.test.ts 5, stream.test.ts 7, connection.test.ts 13 = 25 total.

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [x] Closed. [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]] is in a terminal state.
<!-- AGENT-END:session-follow-up-work -->
- STEP-22-02 (supervisor) should own real process spawning/kill-trees; `childProcessSpawner` here is the minimal default (stderr inherited, `child.kill()` only — no kill-tree).
- Consider migrating from deprecated `ClientSideConnection` to the SDK's `client()` app API on the next SDK bump (re-run fixture tests per pin policy).
- `SessionUpdateHub` is single-consumer per session; fan-out (UI + persistence) will need a tee layer when Phase 23/24 consume it.
- Electron-side implementations of `PermissionPort`/`FileSystemPort`/`TerminalPort` arrive in Phase 23.

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
STEP-22-01 complete. `packages/harness` exists as `@srgnt/harness` (pure Node ESM, SDK pinned 1.2.1, boundary-enforced) with the full acp/ wrapper: `AcpAgentConnection.connect` (injected spawner → ClientSideConnection → initialize negotiation), typed session methods returning Effects with tagged errors (SpawnFailed/InitializeFailed/TurnFailed/ConnectionLost/ProtocolError), per-session backpressure-safe update streams (async iterable + Effect Stream), and NegotiatedCapabilities with contracts-driven overrides. All validation green: harness 25/25, root lint/build green, full workspace tests 1197 passed (127+25+287+758). Orchestrator owns git; working tree holds the new package plus lockfile and vault updates.
