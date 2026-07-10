---
note_type: step
template_version: 2
contract_version: 1
title: Land in-flight housekeeping diff and tag v0-aggregator-final
step_id: STEP-21-01
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: completed
owner: claude-worker
created: '2026-07-10'
updated: '2026-07-10'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-07-10-143410-land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final-claude-worker|SESSION-2026-07-10-143410 claude-worker session for Land in-flight housekeeping diff and tag v0-aggregator-final]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-10-143410
active_session_id: 05_Sessions/2026-07-10-143410-land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final-claude-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final|STEP-21-01 Land in-flight housekeeping diff and tag v0-aggregator-final]].
---

# Step 01 - Land in-flight housekeeping diff and tag v0-aggregator-final

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Land in-flight housekeeping diff and tag v0-aggregator-final.
- Parent phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]].
- Exact outcome: the five uncommitted working-tree files (onboarding `secondaryAction` support, connector catalog URL handling, `build:deps` script, connectors tsconfig) are committed to `main` as the final aggregator-era commit, and an annotated tag `v0-aggregator-final` marks that commit so the pre-pivot product stays findable forever.
- Starting files: `git status` list — `packages/connectors/tsconfig.json`, `packages/desktop/package.json`, `packages/desktop/src/main/index.ts`, `packages/desktop/src/renderer/components/Onboarding.tsx`, `packages/desktop/src/renderer/main.tsx`.
- Validate: `pnpm typecheck && pnpm test && pnpm test:e2e` green before tagging; `git tag -l v0-aggregator-final` shows the tag; working tree clean afterward.

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
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot decision]]

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

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Working tree verified to contain exactly the five expected files (`packages/connectors/tsconfig.json`, `packages/desktop/package.json`, `packages/desktop/src/main/index.ts`, `packages/desktop/src/renderer/components/Onboarding.tsx`, `packages/desktop/src/renderer/main.tsx`); diff matches the Execution Brief, no secrets or debug leftovers.
- e2e fallout was in the button label, not `Onboarding.test.tsx` (unit tests pass unchanged, 15/15). The onboarding workspace step now shows primary "Choose Workspace Directory" (native dialog, not e2e-drivable) and secondary "Use Default Location" (old `ensureDefaultWorkspace` handler). Renamed `getByRole('button', { name: 'Create Workspace' })` to `'Use Default Location'` in 6 e2e files / 18 occurrences: `e2e/fixtures.ts`, `e2e/app.spec.ts`, `e2e/gfm-compliance.spec.ts`, `e2e/bug-0013-visual.spec.ts`, `e2e/visual-validation-bug-0013.ts`, `e2e/semantic-search-packaged.e2e.spec.ts`.
- Known flake: `pnpm -r test` can crash `@srgnt/contracts` vitest workers with SIGABRT on Node v24.15.0 (native crash in CJS preparse); passes in isolation and on rerun.
- Pre-existing local e2e failures (verified identical on a clean HEAD baseline copy built in scratchpad, i.e. NOT caused by this diff): `app.spec.ts:166` PTY `posix_spawnp failed`; `gfm-compliance.spec.ts:41` `.cm-header-N` classes absent; `bug-0013-visual.spec.ts:7` requires `release/linux-unpacked/srgnt` which does not exist on macOS. `ui-coverage-matrix.spec.ts:337` is flaky (passed serial rerun).

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-10 - [[05_Sessions/2026-07-10-143410-land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final-claude-worker|SESSION-2026-07-10-143410 claude-worker session for Land in-flight housekeeping diff and tag v0-aggregator-final]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
- Validation: `pnpm typecheck` PASS (all packages); `pnpm test` PASS (contracts 315/315, desktop 971/971 incl. Onboarding.test.tsx; one flaky SIGABRT worker crash on first run, clean on rerun); `pnpm test:e2e` 77 passed / 4 failed where all 4 failures are pre-existing or environmental — verified against a HEAD baseline copy without the diff. The diff introduces zero regressions; all onboarding-sensitive specs pass after retargeting e2e clicks to "Use Default Location".
- Executed by worker session; git commit of the five files (plus the six e2e spec fixes) and annotated tag `v0-aggregator-final` are performed by the orchestrator immediately after this session per orchestration contract.
- Follow-up: three e2e tests fail locally on macOS independent of this change (`app.spec.ts:166` PTY spawn, `gfm-compliance.spec.ts:41` cm-header classes, `bug-0013-visual.spec.ts` Linux-only packaged binary). Consider a bug note or CI-only gating; may be mooted by Phase 21 teardown.
