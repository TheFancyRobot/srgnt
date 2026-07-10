---
note_type: step
template_version: 2
contract_version: 1
title: Delete aggregator packages UI IPC and CLI surfaces
step_id: STEP-21-02
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: completed
owner: claude-fable-5-worker
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-21-01
related_sessions:
  - '[[05_Sessions/2026-07-10-145042-delete-aggregator-packages-ui-ipc-and-cli-surfaces-claude-fable-5-worker|SESSION-2026-07-10-145042 claude-fable-5-worker session for Delete aggregator packages UI IPC and CLI surfaces]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-10-145042
active_session_id: 05_Sessions/2026-07-10-145042-delete-aggregator-packages-ui-ipc-and-cli-surfaces-claude-fable-5-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces|STEP-21-02 Delete aggregator packages UI IPC and CLI surfaces]].
---

# Step 02 - Delete aggregator packages UI IPC and CLI surfaces

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Delete aggregator packages UI IPC and CLI surfaces.
- Parent phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]].
- Exact outcome: `packages/connectors`, `packages/executors`, `packages/sync`, `packages/entitlements`, `packages/fred`, `examples/`, `packages/desktop/dev-connectors/`, `packages/desktop/src/main/{cli,connectors}`, the `srgnt-connectors` bin, connector IPC channels + preload surface, and aggregator views (TodayView, CalendarView, ConnectorStatus) with their unit/E2E specs are deleted; workspace file, lockfile, root scripts (`cli:connectors`), and imports are updated so nothing references the removed code.
- Starting files: the deletion list above; `pnpm-workspace.yaml`; root `package.json`; `packages/desktop/src/main/index.ts`; `packages/desktop/src/preload/index.ts`; `packages/contracts/src/{connectors,executors,entities}`; `e2e/*.spec.ts`.
- Validate: `rg '@srgnt/(connectors|executors|sync|entitlements|fred)|ConnectorStatus|TodayView|CalendarView'` returns nothing; `pnpm typecheck && pnpm test && pnpm test:e2e` green; app boots to the slim shell.

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
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot decision]] (Consequences section lists what dies and what carries forward)

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

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-fable-5-worker
- Last touched: 2026-07-10
- Next action: None — step complete. Continue with [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_03_slim-runtime-unbundle-search-model-and-modularize-desktop-main-services|STEP-21-03]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- See [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Implementation_Notes|Implementation Notes]] for durable findings (deletion order, STEP-21-03 slices pulled forward, legacy settings stripping, e2e Notes-default behavior shift, preload-sync tests vs stale contracts dist).

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-10 - [[05_Sessions/2026-07-10-145042-delete-aggregator-packages-ui-ipc-and-cli-surfaces-claude-fable-5-worker|SESSION-2026-07-10-145042 claude-fable-5-worker session for Delete aggregator packages UI IPC and CLI surfaces]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completed 2026-07-10. Aggregator packages (connectors/executors/sync/entitlements/fred), examples/, dev-connectors/, main cli/ + connectors/, connector IPC/preload/CLI surfaces, and aggregator views with their specs are deleted; workspace is tsconfig/contracts/runtime/desktop; app boots to the slim Notes/Settings/Terminal shell.
- Validation: sweep regex zero hits; `pnpm typecheck` green; `pnpm test` green (contracts 191, runtime 436, desktop 756); `pnpm test:e2e` 68 passed / 3 failed — all three are the pre-existing STEP-21-01 baseline failures (PTY posix_spawnp, gfm ATX-heading classes, bug-0013 Linux-only binary).
- Details in [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces/Outcome|Outcome]].
