---
note_type: session
template_version: 2
contract_version: 1
title: OpenCode session for Harden Previews Approvals And Run Logs
session_id: SESSION-2026-03-29-183813
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
- 18:38 - Created session note.
- 18:38 - Linked related step [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]].
<!-- AGENT-END:session-execution-log -->
- 13:56 - Fixed a regression where the packaged renderer CSP blocked Ghostty's WASM bootstrap from a `data:` URL, breaking terminal sessions.
- 13:59 - Added a Playwright regression test that opens the Terminal view and fails on CSP/WASM bootstrap console errors.
- 14:02 - Continued the next hardening pass by trimming unused methods from the preload bridge and updating tests/specs to match the narrower renderer API surface.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- None yet.
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: not run yet
- Result: not run
- Notes: 
<!-- AGENT-END:session-validation-run -->
- Command: `pnpm test:e2e && pnpm test:e2e:packaged:linux`
- Result: passed
- Notes: confirmed the terminal view opens without CSP bootstrap failures after allowing Ghostty's inline WASM `data:` fetch.

- Command: `pnpm --filter @srgnt/desktop test && pnpm --filter @srgnt/desktop typecheck && pnpm test:e2e && pnpm test:e2e:packaged:linux`
- Result: passed
- Notes: confirmed the narrower preload API did not break desktop behavior or packaged Linux startup.

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
- Completed a project-wide security review focused on the Electron trust boundary and dependency posture.
- Hardened terminal IPC so renderer callers cannot supply arbitrary command/cwd/env through the raw spawn path, added main-process request validation for previously weak handlers, sanitized persisted markdown filenames, blocked window/webview navigation pivots, and added a packaged-renderer CSP without remote font fetches.
- Upgraded Electron to `35.7.5`, Electron Builder to `26.8.1`, aligned `electron-builder-squirrel-windows`, and pinned vulnerable transitive `esbuild`/`picomatch` versions through pnpm overrides.
- Remaining risk is architectural rather than immediate: the preload API is still broad, so any future renderer compromise would retain meaningful local privileges. Further reduction would require a deliberate API-surface review rather than an emergency patch.
