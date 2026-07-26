---
note_type: step
template_version: 2
contract_version: 1
title: Build composer with slash commands modes cancel and error surfaces
step_id: STEP-23-04
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: completed
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-07-26'
depends_on:
  - STEP-23-01
related_sessions:
  - '[[05_Sessions/2026-07-26-142119-build-composer-with-slash-commands-modes-cancel-and-error-surfaces-claude-opus-5|SESSION-2026-07-26-142119 claude-opus-5 session for Build composer with slash commands modes cancel and error surfaces]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-26-142119
active_session_id: 05_Sessions/2026-07-26-142119-build-composer-with-slash-commands-modes-cancel-and-error-surfaces-claude-opus-5
context_status: completed
context_summary: 'STEP-23-04 complete: composer with slash commands, session modes, cancel and crash/error surfaces; full validation plan green.'
---

# Step 04 - Build composer with slash commands modes cancel and error surfaces

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build composer with slash commands modes cancel and error surfaces.
- Parent phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]].
- Exact outcome: the composer supports multiline input with submit, live busy/stop-reason states, cancellation wired to `session/cancel` (mid-turn safe), a slash-command menu populated from `available_commands_update`, a session-mode selector, and agent-crash surfaces with a recover/restart affordance — no white screens, no orphaned processes.
- Starting files: renderer `chat/Composer` (new; slash-menu interaction patterns exist in the notes editor's SlashCommands work); mode/commands state from the update stream.
- Validate: component tests for slash filtering and mode switching; E2E cancel-mid-stream and crash-recovery scenarios against the mock agent.

## Why This Step Exists

- Makes the session drivable and recoverable: cancel and crash handling are where the "no white screens, no zombie processes" acceptance criteria become real.
- Commands and modes must render from live agent data — the spike proved Pi advertises commands mid-session (`available_commands_update`) and exposes thinking levels (`off…xhigh`) as ACP session modes, so the mode selector doubles as Pi's reasoning-effort control with zero bespoke wiring.

## Prerequisites

- STEP-23-01 merged; STEP-23-03 coordination on cancel-vs-pending-permission (04 owns the affordance, 03 resolves pending prompts).
- Read `packages/harness/src/acp/errors.ts` (`TurnFailed`/`ConnectionLost`/`SpawnFailed`) and `supervisor/types.ts` `SupervisorEvent` — the crash-surface inputs.
- Mock directives for this step: `expect_cancel`, `crash`, `advertise_commands`, `set_mode`, `initialize.modes`.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/chat/Composer.tsx` (new) — plain textarea + custom slash popover (recorded assumption: NOT CodeMirror; reuse interaction patterns from `notes/SlashCommandsExtension.ts`, not code).
- `packages/contracts/src/ipc/contracts.ts` + preload — `chat:session:set-mode`, `chat:session:status` (supervisor events push).
- `packages/desktop/src/main/chat/` — controller cancel (exists from 01), `supervisor.onEvent` → status push, crash → recoverable state.
- Restart semantics (recorded assumption): ephemeral phase — recovery is dispose + fresh `session/new` with the dead transcript kept read-only; `session/load` restore is Phase 24.
- Stop reasons `SStopReason` (`end_turn|cancelled|max_tokens|max_turn_requests|refusal`) each get a distinct end-of-turn rendering.

## Required Reading

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 3: Pi modes = thinking levels; commands advertisement observed live)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: claude-opus-5
- Last touched: 2026-07-26
- Next action: None for this step. Proceed to [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]. Two manual verification passes remain owed against this step (mock walkthrough, real Pi) — see the session note's Follow-Up Work; they are verification, not unfinished implementation.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- `packages/desktop/src/renderer/components/chat/Composer.tsx` is the new surface: textarea + custom slash popover (plain `<textarea>`, NOT CodeMirror — the recorded assumption held), mode selector, Send/Stop, stop-reason notice, crash banner. It exports two pure helpers, `parseCommands` and `slashQuery`, which are unit-tested independently of React.
- `ChatView.tsx` now owns only session lifecycle and the transcript; its inline composer and its duplicate header Stop button are gone. The `chat-input`, `chat-send` and `chat-cancel` test ids moved into `Composer` unchanged, so STEP-23-01/02/03 tests still exercise the same controls.
- Send and Stop stay mounted together with exactly one enabled, rather than swapping. This preserves STEP-23-01's "send disabled while a turn is in flight" literally, and makes cancel-with-no-turn a disabled no-op.
- `ChatSessionContext.sendPrompt` now resolves `Promise<boolean>` (turn ran / turn failed). The composer clears the draft optimistically and restores it only when the turn failed and nothing new was typed — that is how "input NOT cleared on error/crash" is satisfied without stranding text after a successful send.
- The current mode has a single source of truth: `transcript.currentModeId` (set by `current_mode_update`) wins over the `session/new` advertisement. A user-driven `setMode` dispatches a synthetic `current_mode_update` with whatever the agent echoed back, so both paths converge.
- `ChatConnection` gained an optional `onSupervisorEvent(listener) => unsubscribe`. `defaultChatConnect` supplies it from the per-session `Supervisor`; in-process test connections omit it. Subscription happens after `connect` resolves, so the initial `spawning`/`ready` pair is deliberately not observed.
- `supervisorEventToStatus(sessionId, event, lastStderrTail)` is exported and pure — the crash mapping is provable without a dying process. `reaped` maps to `null` (our own teardown must never render as a failure). `gave-up` carries no `ExitInfo`, so the controller remembers the preceding `crashed` event's stderr tail and threads it in.
- A death status (`crashed`/`gave-up`/`exited`) also calls `permissions.cancelAll('cancelled')`: a dead agent cannot answer a prompt, and leaving one on screen would be worse than dismissing it.
- `dispose` unsubscribes the supervisor listener *before* the kill-tree, otherwise the reap would push a status frame for a session the renderer has already forgotten. Covered by a test.
- `MOCK_DEMO_SCENARIO` now sets `initialize.modes` (five Pi-like thinking levels) and leads with an `advertise_commands` directive, so the slash menu and mode selector are reachable in a manual `pnpm dev` run instead of only in tests. A test asserts both stay present.
- Real-process evidence for the crash path: a mock agent spawned under a real `Supervisor` with a `crash` directive emitted `spawning, ready, crashed`, failed the prompt with `ConnectionLost`, and left no surviving pid after dispose.
- The Execution Brief's "preload does `parseSync` on receive" is not accurate: the preload runs sandboxed and cannot import runtime values from `@srgnt/contracts` at all (BUG-0002, guarded by `preload-ipc-sync.test.ts`). The real pattern is the inlined channel-name allowlist plus `parseSync` at the main-process handler boundary, which both new channels follow.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-26 - [[05_Sessions/2026-07-26-142119-build-composer-with-slash-commands-modes-cancel-and-error-surfaces-claude-opus-5|SESSION-2026-07-26-142119 claude-opus-5 session for Build composer with slash commands modes cancel and error surfaces]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

**Complete.** The composer is built and the session is drivable and recoverable.

Delivered:

- `Composer.tsx` — multiline input with STEP-23-01's keymap preserved (Enter sends, Shift+Enter newlines, IME `isComposing` guard, submit disabled while a turn is in flight), plus draft preservation across a failed turn.
- Slash-command menu fed entirely by `available_commands_update`: `/`-at-line-start trigger, prefix filtering, arrow-key navigation, Enter/Tab/click insert, Escape close, and no menu at all when the agent advertises nothing or an update empties the list.
- Session-mode selector rendered only when the agent advertises modes, switching via a new typed `chat:session:set-mode` channel, and following agent-initiated `current_mode_update` without user action. An unadvertised `modeId` is rejected in the controller before any ACP call.
- A distinct end-of-turn rendering for every `StopReason` (`end_turn` intentionally silent).
- Crash surface: supervisor events → typed `chat:session:status` push → banner with message and stderr tail, transcript preserved read-only, working "New session" recovery (dispose + fresh `session/new`), and no `ErrorBoundary` involvement.

Validation (all run in the foreground, all passing): `pnpm --filter @srgnt/desktop test` (57 files / 1035 tests), `pnpm --filter @srgnt/contracts test` (7 files / 159 tests), `pnpm --filter @srgnt/harness test` (113 passed / 2 skipped, no harness changes needed), `pnpm --filter @srgnt/desktop typecheck`, `pnpm lint`, `pnpm --filter @srgnt/desktop build`. Additionally, a real spawned mock agent under a real `Supervisor` was crashed mid-turn: the supervisor emitted `spawning, ready, crashed`, the prompt failed `ConnectionLost`, and no pid survived dispose — the evidence behind the no-orphan acceptance check.

STEP-23-03's carry-forward is closed: the composer's Stop reaches `ChatSessionController.cancel` and a pending permission prompt visibly dismisses, asserted through the real provider and `ChatView` rather than only at the controller level.

Follow-up (verification, not implementation): the manual `pnpm dev` mock walkthrough and the manual real-Pi run were not performed in this session. Both are recorded in the session note's Follow-Up Work.
