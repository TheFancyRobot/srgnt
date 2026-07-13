---
note_type: step
template_version: 2
contract_version: 1
title: Rewrite repo docs and re-point vault architecture notes
step_id: STEP-21-05
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: completed
owner: claude-fable-5-worker
created: '2026-07-10'
updated: '2026-07-12'
depends_on:
  - STEP-21-03
  - STEP-21-04
related_sessions:
  - '[[05_Sessions/2026-07-13-015439-rewrite-repo-docs-and-re-point-vault-architecture-notes-claude-fable-5-worker|SESSION-2026-07-13-015439 claude-fable-5-worker session for Rewrite repo docs and re-point vault architecture notes]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-13-015439
active_session_id: 05_Sessions/2026-07-13-015439-rewrite-repo-docs-and-re-point-vault-architecture-notes-claude-fable-5-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes|STEP-21-05 Rewrite repo docs and re-point vault architecture notes]].
---

# Step 05 - Rewrite repo docs and re-point vault architecture notes

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Rewrite repo docs and re-point vault architecture notes.
- Parent phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]].
- Exact outcome: README.md and AGENTS.md describe the ACP command-center product (structure, dev workflow, harness quick start) with all connector/aggregator instructions removed; vault architecture home notes (System_Overview, Integration_Map, Domain_Model, Code_Map) are re-pointed to the new architecture via bounded vault mutations; stale aggregator architecture notes are marked historical rather than deleted.
- Starting files: `README.md`, `AGENTS.md`, `TESTING.md`; `.agent-vault/01_Architecture/*`; `.agent-vault/00_Home/*` (Roadmap/Active_Context already updated at planning time).
- Validate: `vault_validate` clean; README quick start executes on a fresh clone; no doc references deleted packages or views.

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
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (the source of truth the docs must reflect)

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

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-fable-5-worker
- Last touched: 2026-07-12
- Next action: None — step complete. Phase 21 exit: see [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase note]]; next milestone is PHASE-22 (`@srgnt/harness`).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- 2026-07-12: executed; durable findings recorded in [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Implementation_Notes|Implementation Notes companion]]. Key facts: repo is 4 packages today (`@srgnt/harness` is Phase 22, docs mark it upcoming); `fred-workflow-design.md` needed frontmatter added before `vault_mutate` could append; `docs/flagship-workflow-walkthrough.md` banner-marked historical rather than deleted.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-13 - [[05_Sessions/2026-07-13-015439-rewrite-repo-docs-and-re-point-vault-architecture-notes-claude-fable-5-worker|SESSION-2026-07-13-015439 claude-fable-5-worker session for Rewrite repo docs and re-point vault architecture notes]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
- Complete (2026-07-12). README/AGENTS/TESTING rewritten for the ACP command-center product; connector-plugin guide and `srgnt-connectors` CLI docs removed; Pi Team Workflow and agent-vault block preserved. Re-pointed with bounded mutations: ARCH-0001/0004/0005/0008 (Purpose pointer + `reviewed_on: 2026-07-12`) and 06_Shared_Knowledge sync-architecture / fred-workflow-design / conflict-resolution-design (historical pointer); ARCH-0009 Related Notes back-links all seven. Validation: `pnpm typecheck` + `pnpm test` green (desktop 758/758); doc grep clean of unintentional aggregator references; `vault_refresh` + `vault_validate` run at close. Details in [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_05_rewrite-repo-docs-and-re-point-vault-architecture-notes/Outcome|Outcome companion]].
