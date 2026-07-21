---
note_type: step
template_version: 2
contract_version: 1
title: Assemble release checklist and updated E2E coverage matrix
step_id: STEP-29-05
phase: '[[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-29-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Assemble release checklist and updated E2E coverage matrix

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Assemble release checklist and updated E2E coverage matrix.
- Parent phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]].
- Exact outcome: the release pipeline (`release:check:repo` lineage) is updated for the new product — build, typecheck, unit, chat/persistence/group/pipeline E2E, packaged smoke — and a release checklist documents the full path from clean checkout to published artifacts; one complete end-to-end release rehearsal passes.
- Starting files: root `package.json` release scripts; `.github/workflows/` Desktop E2E; `TESTING.md` coverage matrix section.
- Validate: full pipeline green end to end on CI; checklist executed once for a tagged release candidate.

## Why This Step Exists

- This is the phase (and project) exit gate: releasable = `release:check:repo` green across the updated coverage matrix. The existing gate only covers pre-pivot specs.
- Ensures "green CI" actually proves the shipped product (chat/persistence/groups/pipelines + packaged harness session) works, not just the old shell.

## Prerequisites

- STEP-29-01..04 merged; in particular STEP-29-03's packaged harness-session smoke is the linchpin of the packaged gate. Phases 23-28 E2E specs must exist to wire in.

## Relevant Code Paths

- Root `package.json`: `release:check:repo` (icons → pack → test → test:e2e → test:e2e:packaged:linux), `release:artifacts:linux`, `release:rc:linux`. `packages/desktop/package.json` `test:e2e`/`test:e2e:full` — add Phase 23-28 specs (chat/persistence/groups/pipelines).
- `packages/desktop/e2e/` specs; `playwright.config.ts` (`retries: 2` in CI = the PR #14 gfm auto-retry fix); `.github/workflows/desktop-release.yml` (`v*` + `workflow_dispatch` only). Re-audit the 3 baseline failures (app.spec PTY `posix_spawnp`; gfm ATX `.cm-header-*`; bug-0013-visual Linux binary off-Linux).

## Required Reading

- [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]

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

- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix/Validation_Plan|Validation Plan]].
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
