---
note_type: step
template_version: 2
contract_version: 1
title: Slim runtime unbundle search model and modularize desktop main services
step_id: STEP-21-03
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: completed
owner: claude-fable-5-worker
created: '2026-07-10'
updated: '2026-07-12'
depends_on:
  - STEP-21-02
related_sessions:
  - '[[05_Sessions/2026-07-12-181229-slim-runtime-unbundle-search-model-and-modularize-desktop-main-services-claude-fable-5-worker|SESSION-2026-07-12-181229 claude-fable-5-worker session for Slim runtime unbundle search model and modularize desktop main services]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-12-181229
active_session_id: 05_Sessions/2026-07-12-181229-slim-runtime-unbundle-search-model-and-modularize-desktop-main-services-claude-fable-5-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03 Slim runtime unbundle search model and modularize desktop main services]].
---

# Step 03 - Slim runtime unbundle search model and modularize desktop main services

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Slim runtime unbundle search model and modularize desktop main services.
- Parent phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]].
- Exact outcome: `packages/runtime` drops workflows/daily-briefing, connector loaders, query engine, launch templates, and runs-history (keeping workspace, store, logs, approvals + policy, semantic-search source); the bundled embedding model leaves electron-builder `extraResources`; `packages/desktop/src/main/index.ts` becomes a thin composition root delegating to per-service modules (settings, notes, pty, updater, workspace).
- Starting files: `packages/runtime/src/{workflows,loaders,query,launch,runs}`; `packages/desktop/package.json` (`build.extraResources`); `packages/desktop/src/main/index.ts` (1,340 lines / 45 IPC handlers pre-deletion).
- Validate: suites green; packaged artifact no longer contains the model; `index.ts` reduced to service registration (target ≲200 lines); no orphaned runtime exports.

## Why This Step Exists

- Explain why this step matters to the parent phase.
- Call out the risk reduced, capability added, or knowledge gained.

## Prerequisites

- List the notes, approvals, tooling, branch state, or prior steps required before starting.
- Include blocking commands or setup steps if they are easy to forget.

## Relevant Code Paths

- List the most likely files, directories, packages, tests, commands, or docs to inspect.
- Include only the paths that help a new engineer get oriented quickly.

## Required Reading

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]] (what stays parked and why)

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

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Import audit reconciled against the post-STEP-21-02 tree: `runs/` was already gone; `createRunLogService` lives in `logs/run-log.ts` and stays. Deleted runtime `workflows/`, `artifacts/` (only consumed by workflows), `launch/`, `loaders/`, `query/`, `store/`. Runtime root now exports `logs`, `approvals`, `semantic-search`; `policy/` and `workspace/` kept as parked unexported source.
- `CanonicalStore` removal cascaded into deleting the dead aggregator IPC surface (no live renderer consumers): `entitiesList`, `briefingSave/List`, `skillList/Run/Cancel`, `approvalRequest/Resolve`, `runHistoryList/Get`, `runLogSave` — removed from contracts channels + schemas, preload inline map + API, env.d.ts, renderer test mocks, and the e2e briefing round-trip. The BUG-0002 preload sync guards force this to be bidirectional.
- `main/index.ts`: 811 -> 137 lines. New modules under `src/main/services/`: window, workspace (hook-based root-change lifecycle: beforeRootChanged/prepareWorkspace/afterRootChanged), settings, updater, terminal (pty + launch approvals + run-log persistence), semantic-search, crash, shell. Preload/renderer paths injected from index.ts because dist/main mirrors src/main and `__dirname` shifts inside services/.
- `extraResources` model entry removed from `packages/desktop/package.json`. Note: `../assets/model` did not exist in the tree, so the entry was already vestigial — artifact size is unchanged; the worker's `fs.access(modelAssetPath)` fail-soft path (fallback keyword search) was already in place and is what the packaged smoke exercises.
- `semantic-search/ipc-handlers.test.ts` reads main source for structural assertions — repointed from `main/index.ts` to `services/semantic-search.ts` with the new identifier names.
- Stale `dist/` in contracts/runtime made the preload sync tests fail on first run after the contracts edit; clean rebuild (`rm -rf dist` + build) fixed it. Worth remembering for any step that edits contracts channels.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-12 - [[05_Sessions/2026-07-12-181229-slim-runtime-unbundle-search-model-and-modularize-desktop-main-services-claude-fable-5-worker|SESSION-2026-07-12-181229 claude-fable-5-worker session for Slim runtime unbundle search model and modularize desktop main services]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
- Completed 2026-07-12. Runtime slimmed to `approvals/`, `logs/`, `policy/`, `semantic-search/`, `workspace/` (root exports: logs, approvals, semantic-search). Embedding model unbundled from electron-builder `extraResources`. Desktop main is a 137-line composition root delegating to eight `services/` modules. Dead aggregator IPC (entities/briefing/skill/approval-request/run-history/run-log-save) removed across contracts, preload, and main.
- Validation: `pnpm typecheck` green; `pnpm test` green — contracts 181/181, runtime 283/283, desktop 756/756; `pnpm test:e2e` 68 passed / 3 failed, all three the known pre-existing baseline (app.spec PTY posix_spawnp, gfm-compliance `.cm-header-*`, bug-0013-visual Linux-only binary). Packaged `electron-builder --dir` artifact (mac-arm64, 589M) contains no `model` directory; ad-hoc packaged macOS boot smoke passed (onboarding renders, `isPackaged: true`, `modelBundled: false`). `test:e2e:packaged:linux` is Linux-only and could not run on this macOS host.
- Follow-up: contracts still carries aggregator-era `entities/`, `skills/`, and fixtures modules (now only self-referenced) — teardown/replacement belongs to STEP-21-04/05.
