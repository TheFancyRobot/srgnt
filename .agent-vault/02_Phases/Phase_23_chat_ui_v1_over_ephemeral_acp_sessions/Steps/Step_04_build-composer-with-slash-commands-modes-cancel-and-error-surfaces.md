---
note_type: step
template_version: 2
contract_version: 1
title: Build composer with slash commands modes cancel and error surfaces
step_id: STEP-23-04
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - STEP-23-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
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
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_04_build-composer-with-slash-commands-modes-cancel-and-error-surfaces/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
