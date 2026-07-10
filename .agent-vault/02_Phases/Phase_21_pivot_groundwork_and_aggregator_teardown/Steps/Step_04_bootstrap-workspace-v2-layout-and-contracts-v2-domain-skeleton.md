---
note_type: step
template_version: 2
contract_version: 1
title: Bootstrap workspace v2 layout and contracts v2 domain skeleton
step_id: STEP-21-04
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-21-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Bootstrap workspace v2 layout and contracts v2 domain skeleton

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Bootstrap workspace v2 layout and contracts v2 domain skeleton.
- Parent phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]].
- Exact outcome: workspace bootstrap creates the v2 layout (`projects/`, `groups/templates/`, `harnesses.json`, `settings.json`) instead of the PARA aggregator dirs; `packages/contracts` gains the v2 domain skeleton — Project, Session (with `kind`, `parentSessionId`, status enum), SessionEvent envelope, HarnessDefinition — written against `effect/Schema`, with the deprecated `@effect/schema` dependency removed repo-wide.
- Starting files: `packages/runtime/src/workspace/bootstrap.ts` (+ tests listing the old expected dirs); `packages/contracts/src/` (new domain modules; delete aggregator entities); every `package.json` referencing `@effect/schema`.
- Validate: bootstrap tests assert the v2 layout; contracts decode/encode tests for each schema incl. unknown-field tolerance on SessionEvent; `rg '@effect/schema'` returns nothing.

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
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (workspace v2 layout + domain model sections)

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

- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Validation_Plan|Validation Plan]].
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
