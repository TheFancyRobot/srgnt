---
note_type: session
template_version: 2
contract_version: 1
title: opencode session for Wire Workflow Launch Actions And Artifact Context
session_id: SESSION-2026-03-28-194526
date: '2026-03-28'
status: completed
owner: opencode
branch: ''
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
related_bugs: []
related_decisions: []
created: '2026-03-28'
updated: '2026-03-28'
tags:
  - agent-vault
  - session
---

# opencode session for Wire Workflow Launch Actions And Artifact Context

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 19:45 - Created session note.
- 19:45 - Linked related step [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]].
- 19:50 - Reviewed Phase 07 notes against source and confirmed STEP-07-01 is real, STEP-07-02 is partial, and STEP-07-03 is still scaffolded.
- 20:00 - Fixed the broken Today View -> Terminal handoff so the terminal view launches the requested context-aware session instead of spawning an orphaned background PTY.
- 20:05 - Aligned `terminal:launch-with-context` implementation with the wrapped IPC contract and removed renderer reliance on `process.*`.
- 20:10 - Fixed PTY defaults so the terminal can open without an explicit command, added renderer/contract tests, and re-ran desktop/contracts validation.
<!-- AGENT-END:session-execution-log -->

## Findings

- The original STEP-07-02 launch button created a context-aware PTY session that the UI never attached to because the terminal view always spawned a separate default shell.
- `terminal:launch-with-context` had drifted from the contract: code passed a raw `LaunchContext`, while the schema expected `{ launchContext, rows, cols }`.
- The PTY service schema still required `command`, which contradicted the default-shell behavior used by the terminal panel.
- STEP-07-03 code remains helper-level scaffolding and should not be treated as implemented product behavior.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/pty/contracts.ts`
- `packages/desktop/src/main/terminal/terminal-ipc.test.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/components/TerminalPanel.tsx`
- `packages/desktop/src/renderer/components/TodayView.tsx`
- `packages/desktop/src/renderer/components/TodayView.test.tsx`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/contracts/src/ipc/contracts.test.ts`
- `.agent-vault/02_Phases/Phase_07_terminal_integration_hardening/Phase.md`
- `.agent-vault/02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts.md`
- `.agent-vault/02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context.md`
- `.agent-vault/02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs.md`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Commands:
  - `pnpm --filter @srgnt/contracts test`
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/desktop typecheck`
  - `pnpm --filter @srgnt/desktop build`
- Result: passed
- Notes: desktop build completes; Vite still emits the existing chunk-size warning during renderer build.
<!-- AGENT-END:session-validation-run -->

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
- [ ] Only resume [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]] if additional workflow surfaces or runtime traceability are explicitly requested.
- [ ] Leave [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]] scaffolded until approval/run-log work is intentionally started.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- Repaired the implemented Phase 07 work without advancing into unimplemented Step 03 scope: Today View launches now open the intended terminal session, the PTY service honors default-shell spawns, and the IPC contract matches the schema.
- Updated the vault so STEP-07-02 is treated as partial and STEP-07-03 stays scaffolded.
- Session ends in a clean handoff state with tests, typecheck, and desktop build passing.
