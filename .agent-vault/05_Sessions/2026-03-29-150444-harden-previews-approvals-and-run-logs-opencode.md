---
note_type: session
template_version: 2
contract_version: 1
title: OpenCode session for Harden Previews Approvals And Run Logs
session_id: SESSION-2026-03-29-150444
date: '2026-03-29'
status: completed
owner: OpenCode
branch: ''
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
related_bugs: []
related_decisions: []
created: '2026-03-29'
updated: '2026-03-29'
tags:
  - agent-vault
  - session
---

# OpenCode session for Harden Previews Approvals And Run Logs

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 15:04 - Created session note.
- 15:04 - Linked related step [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]].
<!-- AGENT-END:session-execution-log -->
- 15:16 - Traced approved-launch disconnect bug to `packages/desktop/src/main/index.ts`.
- 15:17 - Fixed the approval path to gate on main-window existence only; it no longer treats `webContents.send(...)` as a boolean success value.
- 15:18 - Updated stale renderer test mocks and Today View expectation so focused desktop validation reflects the current approval-first launch behavior.
- 15:22 - Traced duplicate approval modal to `TerminalPanel` re-running its setup effect when `isConnected` changed.
- 15:23 - Removed `isConnected` from the terminal measurement callback dependency so the launch effect stays stable through the first approved connection.
- 15:24 - Added `TerminalPanel.test.tsx` to verify an approval-required launch only calls `terminalLaunchWithContext` once.
- 15:26 - Traced blank active session to the approval UI swapping out the terminal host DOM while the Ghostty instance was already attached.
- 15:27 - Changed approval handling to render as an overlay instead of replacing the whole terminal panel, keeping the terminal host mounted through approval.
- 15:28 - Added a regression assertion that the terminal host is still mounted while the approval modal is visible.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- `ghostty-web` already exposes `Terminal.focus()`. The missing UX step was re-focusing the terminal after the approval button stole focus during the overlay flow.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- None yet.
<!-- AGENT-END:session-changed-paths -->
- `packages/desktop/src/renderer/components/TerminalPanel.tsx`
- `packages/desktop/src/renderer/components/TerminalPanel.test.tsx`
- `packages/desktop/src/renderer/components/TerminalPanel.tsx`
- `packages/desktop/src/renderer/components/TerminalPanel.test.tsx`

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: not run yet
- Result: not run
- Notes: 
<!-- AGENT-END:session-validation-run -->
- Command: `pnpm --filter @srgnt/desktop test -- src/renderer/components/TodayView.test.tsx src/renderer/components/CalendarView.test.tsx src/main/terminal/terminal-ipc.test.ts`
- Result: passed
- Notes: 63 tests passed.
- Command: `pnpm --filter @srgnt/desktop typecheck`
- Result: passed
- Notes: main, preload, and renderer TypeScript projects all compile.
- Command: `pnpm --filter @srgnt/desktop build`
- Result: passed
- Notes: desktop main, preload, and renderer builds succeeded.
- Command: `pnpm --filter @srgnt/desktop test -- src/renderer/components/TerminalPanel.test.tsx src/renderer/components/TodayView.test.tsx src/renderer/components/CalendarView.test.tsx src/main/terminal/terminal-ipc.test.ts`
- Result: passed
- Notes: 64 tests passed after keeping the terminal host mounted under the approval overlay.
- Command: `pnpm --filter @srgnt/desktop typecheck`
- Result: passed
- Notes: renderer/main/preload TypeScript projects compile cleanly.
- Command: `pnpm --filter @srgnt/desktop build:renderer`
- Result: passed
- Notes: renderer bundle compiled successfully.

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
- [ ] Continue [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]].
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
- Terminal view now renders edge-to-edge within the main content pane while the other views keep the existing centered layout.
- Renderer build is green; full desktop typecheck remains blocked by unrelated test mock updates already needed for the approval IPC additions.
ovals And Run Logs]].
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
the existing centered layout.
- Renderer build is green; full desktop typecheck remains blocked by unrelated test mock updates already needed for the approval IPC additions.
ovals And Run Logs]].
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.


## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
