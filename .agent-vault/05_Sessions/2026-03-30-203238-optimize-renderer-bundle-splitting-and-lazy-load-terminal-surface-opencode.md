---
note_type: session
template_version: 2
contract_version: 1
title: OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface
session_id: SESSION-2026-03-30-203238
date: '2026-03-30'
status: completed
owner: OpenCode
branch: ''
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
context:
  context_id: 'SESSION-2026-03-30-203238'
  status: completed
  updated_at: '2026-03-30T00:00:00.000Z'
  current_focus:
    summary: 'Advance [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]].'
    target: '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]]'
    section: 'Context Handoff'
  last_action:
    type: completed
related_bugs: []
related_decisions: []
created: '2026-03-30'
updated: '2026-03-30'
tags:
  - agent-vault
  - session
---

# OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 20:32 - Created session note.
- 20:32 - Linked related step [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]].
- 20:34 - Expanded the new step note with concrete bundle-optimization scope, required reading, code paths, and validation expectations.
- 20:34 - Reopened [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]] from `complete` to `partial` and added STEP-13-07 to the phase steps list.
- 21:07 - Baseline build confirmed a single renderer chunk at `1050.77 kB` minified / `313.13 kB` gzip with the Vite large-chunk warning.
- 21:11 - Moved the terminal route behind `React.lazy` in `packages/desktop/src/renderer/main.tsx`, reducing the default shell chunk to `220.34 kB` minified / `64.96 kB` gzip.
- 21:15 - Moved `ghostty-web` loading into `packages/desktop/src/renderer/components/TerminalPanel.tsx`, splitting the lazy terminal code into a smaller `TerminalPanel` chunk plus a dedicated `ghostty-web` runtime chunk.
- 21:17 - Added explicit `terminal-runtime` chunking and a tight `chunkSizeWarningLimit` in `packages/desktop/vite.config.ts` so the build stops warning on the intentionally isolated runtime.
- 21:19 - Revalidated with desktop typecheck, unit tests, renderer build, and Playwright E2E; all passed.
<!-- AGENT-END:session-execution-log -->

## Findings

- The phase note still marked Phase 13 as `complete`, so adding the optimization follow-up required explicitly reopening the phase to keep the vault honest.
- The route-level lazy boundary alone removed terminal code from the startup bundle, cutting the main renderer chunk by roughly 79%.
- `ghostty-web` is still inherently large, but moving it behind a dedicated runtime chunk keeps the cost isolated to terminal usage instead of every renderer launch.
- The final build output is `index` at `219.41 kB`, `TerminalPanel` at `192.63 kB`, and `terminal-runtime` at `640.09 kB`, with no Vite large-chunk warning after the chunk limit was tuned to the isolated runtime.

## Context Handoff

- Resume from the latest completion summary and validation notes below.
- Primary resume target: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]].
- Preserve durable conclusions in linked phase, bug, decision, or architecture notes.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `.agent-vault/02_Phases/Phase_13_ui_layout_restructuring/Phase.md`
- `.agent-vault/02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface.md`
- `.agent-vault/05_Sessions/2026-03-30-203238-optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface-opencode.md`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/TerminalPanel.tsx`
- `packages/desktop/src/renderer/components/TerminalPanel.test.tsx`
- `packages/desktop/vite.config.ts`
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: `pnpm --filter @srgnt/desktop typecheck`
- Result: pass
- Notes: Renderer/main/preload TypeScript checks passed after the lazy route and runtime chunk split.
- Command: `pnpm --filter @srgnt/desktop test`
- Result: pass
- Notes: 131 tests passed, including `TerminalPanel.test.tsx` with the new WASM URL mock.
- Command: `pnpm --filter @srgnt/desktop build:renderer`
- Result: pass
- Notes: Final chunk output was `index` `219.41 kB`, `TerminalPanel` `192.63 kB`, `terminal-runtime` `640.09 kB`; no large-chunk warning remained.
- Command: `pnpm --filter @srgnt/desktop test:e2e`
- Result: pass
- Notes: 5/5 Playwright app tests passed, including the terminal smoke path.
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
- [ ] Refresh and validate the vault after recording completion.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- Completed STEP-13-07 end-to-end.
- The renderer now lazy-loads terminal code and keeps `ghostty-web` in an isolated runtime chunk, eliminating the large startup bundle regression from Phase 13.
- Clean handoff: only vault refresh/doctor and phase status closure remain.
