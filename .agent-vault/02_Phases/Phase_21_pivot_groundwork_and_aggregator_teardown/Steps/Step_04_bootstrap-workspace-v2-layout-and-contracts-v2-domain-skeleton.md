---
note_type: step
template_version: 2
contract_version: 1
title: Bootstrap workspace v2 layout and contracts v2 domain skeleton
step_id: STEP-21-04
phase: '[[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]'
status: completed
owner: claude-fable-5-worker
created: '2026-07-10'
updated: '2026-07-12'
depends_on:
  - STEP-21-02
related_sessions:
  - '[[05_Sessions/2026-07-12-182319-bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton-claude-fable-5-worker|SESSION-2026-07-12-182319 claude-fable-5-worker session for Bootstrap workspace v2 layout and contracts v2 domain skeleton]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-12-182319
active_session_id: 05_Sessions/2026-07-12-182319-bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton-claude-fable-5-worker
context_status: completed
context_summary: Advance [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton|STEP-21-04 Bootstrap workspace v2 layout and contracts v2 domain skeleton]].
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
- Status: completed
- Current owner: claude-fable-5-worker
- Last touched: 2026-07-12
- Next action: None — step complete. See [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Outcome|Outcome]]; continue with STEP-21-05 (docs rewrite).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- See [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Implementation_Notes|Implementation Notes]] for the durable findings (layout source of truth, seed-file `wx` semantics, desktop settings.json move + legacy fallback, tolerant SessionEvent reader semantics, stale contracts dist gotcha).

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-12 - [[05_Sessions/2026-07-12-182319-bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton-claude-fable-5-worker|SESSION-2026-07-12-182319 claude-fable-5-worker session for Bootstrap workspace v2 layout and contracts v2 domain skeleton]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Complete (2026-07-12). Bootstrap creates the v2 layout (`projects/`, `groups/templates/`, seeded `harnesses.json` + `settings.json`) in runtime and desktop main, strictly additively; contracts gained `project.ts`/`session.ts`/`harness.ts` on `effect/Schema` with a tolerant SessionEvent envelope; `@effect/schema` removed repo-wide (zero rg hits, lockfile clean). Validation: contracts 127/127, runtime 287/287, desktop 758/758, typecheck clean; e2e 68 passed with only the 3 documented pre-existing baseline failures. Details and follow-ups in [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton/Outcome|Outcome]].
