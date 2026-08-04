---
note_type: session
template_version: 2
contract_version: 1
title: claude-fable-5-worker session for Slim runtime unbundle search model and modularize desktop main services
session_id: SESSION-2026-07-12-181229
date: '2026-07-12'
status: completed
owner: claude-fable-5-worker
branch: ''
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
related_bugs: []
related_decisions: []
created: '2026-07-12'
updated: '2026-07-12'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-12-181229
  status: completed
  updated_at: '2026-07-12T18:12:29.045Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]].
    target: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]]'
    section: Context Handoff
  last_action:
    type: saved
---

# claude-fable-5-worker session for Slim runtime unbundle search model and modularize desktop main services

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 18:12 - Created session note.
- 18:12 - Linked related step [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]].
<!-- AGENT-END:session-execution-log -->
- Re-ran the import audit: STEP-21-02 had already deleted runtime `src/runs/`; `createRunLogService` lives in `logs/run-log.ts` and stays. Desktop main imported `CanonicalStore, createRunLogService, createApprovalService, redactEnv, truncateOutput, DEFAULT_REDACTION_POLICY` only in `src/main/index.ts`.
- Deleted `packages/runtime/src/{workflows,artifacts,launch,loaders,query,store}` (artifacts was only consumed by workflows/daily-briefing; store only by desktop's dead `entitiesList` handler). Root `index.ts` now exports only `logs`, `approvals`, `semantic-search`. `policy/` and `workspace/` kept as parked, unexported source per the Execution Brief.
- Removed dead aggregator IPC surface end to end (no live renderer consumers, verified by grep): channels `skillList/skillRun/skillCancel`, `approvalRequest/approvalResolve`, `runHistoryList/runHistoryGet`, `runLogSave`, `entitiesList`, `briefingSave/briefingList` from contracts `ipcChannels` + their request/response schemas, the preload inlined map + `saveBriefing/listBriefings` API, `env.d.ts`, and renderer test mocks (NotesView, NotesContext). Preload sync tests (BUG-0002 guards) enforce this bidirectionally.
- Modularized `packages/desktop/src/main/index.ts` (811 lines -> 137-line composition root) into `src/main/services/`: window.ts, workspace.ts (hook-based root-change lifecycle), settings.ts, updater.ts, terminal.ts (pty + launch approval + run-log-to-disk), semantic-search.ts, crash.ts, shell.ts. `__dirname`-relative preload/renderer paths are computed in index.ts and injected (dist layout mirrors src).
- Repointed `semantic-search/ipc-handlers.test.ts` source assertions from `main/index.ts` to `services/semantic-search.ts`.
- Removed the `extraResources` model entry from `packages/desktop/package.json` (`../assets/model` did not exist in the tree; entry was already vestigial). Annotated `SEMANTIC_SEARCH_VALIDATION.md` as PARKED.
- Rewrote the e2e "exercises preload APIs" test to drop briefing round-trip; now asserts run-log markdown lands in `.command-center/runs/` (still baseline-failing on macOS PTY posix_spawnp before those assertions).

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.

## Context Handoff

- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.
- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.
- STEP-21-03 is complete and validated; the orchestrator owns the commit. Next ready step is STEP-21-04 (workspace v2 layout + contracts v2 skeleton).
- Contracts still carries the aggregator-era domain modules (`entities/`, `skills/`, fixtures) — intentionally untouched here; they are STEP-21-04/05 territory.
- Runtime `policy/` and `workspace/` are kept as parked, unexported source per the Execution Brief; only `logs`, `approvals`, `semantic-search` are exported from the package root.
- The `test:e2e:packaged:linux` suite cannot run on macOS (spec self-skips); an ad-hoc packaged macOS boot smoke stood in and passed (booted to onboarding, no model in Resources).

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- Recorded below, outside the block.
<!-- AGENT-END:session-changed-paths -->
- Deleted: `packages/runtime/src/{workflows,artifacts,launch,loaders,query,store}/`
- Modified: `packages/runtime/src/index.ts` (exports logs, approvals, semantic-search only)
- Rewritten: `packages/desktop/src/main/index.ts` (811 -> 137 lines, composition root)
- Added: `packages/desktop/src/main/services/{window,workspace,settings,updater,terminal,semantic-search,crash,shell}.ts`
- Modified: `packages/contracts/src/ipc/contracts.ts` + `contracts.test.ts` (dead channels/schemas removed)
- Modified: `packages/desktop/src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/NotesView.test.tsx`, `src/renderer/components/notes/NotesContext.test.tsx`
- Modified: `packages/desktop/src/main/semantic-search/ipc-handlers.test.ts` (assertions repointed to services module)
- Modified: `packages/desktop/package.json` (extraResources model entry removed), `packages/desktop/e2e/app.spec.ts`, `packages/desktop/SEMANTIC_SEARCH_VALIDATION.md` (parked banner)

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: recorded below, outside the block
- Result: recorded below, outside the block
- Notes: The commands and results are itemized under this block.
<!-- AGENT-END:session-validation-run -->
- `pnpm typecheck`: green (contracts, runtime, desktop main/preload/renderer).
- `pnpm test`: contracts 181/181, runtime 283/283 (was 436 — delta is the deleted modules' own tests), desktop 756/756 (40 files). Required clean rebuild of contracts/runtime dist first (stale dist initially failed the 2 preload sync guards, then green).
- `pnpm test:e2e` (build + playwright): 68 passed / 3 failed — exactly the pre-existing baseline: app.spec "exercises preload APIs" (PTY posix_spawnp on macOS, confirmed same error), gfm-compliance `.cm-header-*`, bug-0013-visual (Linux-only binary).
- Packaged check: `electron-builder --dir` produced `release/mac-arm64` (589M); no `model` directory anywhere in the artifact. Ad-hoc packaged macOS boot smoke (mirror of Linux-only packaged.spec): booted to onboarding, `isPackaged: true`, `modelBundled: false`. `test:e2e:packaged:linux` not runnable on macOS (spec self-skips off Linux).
- `wc -l src/main/index.ts` = 137 (target was <=200).

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
- [x] Closed. [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]] is in a terminal state.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
