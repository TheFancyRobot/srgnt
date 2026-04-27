---
note_type: step
template_version: 2
contract_version: 1
title: Implement Query Index Subsystem
step_id: STEP-03-05
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-04-02'
depends_on:
  - STEP-03-01
  - STEP-03-04
related_sessions:
  - '[[05_Sessions/2026-04-02-214830-implement-query-index-subsystem-opencode|SESSION-2026-04-02-214830 OpenCode session for Implement Query Index Subsystem]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Implement Query Index Subsystem

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Implement the derived metadata/index layer that Today, Calendar, dashboards, and saved views depend on.
- Deliver a working query API that can filter and sort workspace artifacts without blocking later UI phases.

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]] — read the feasibility verdict and DEC note first
- [[01_Architecture/Code_Map|Code Map]]
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]] plus any superseding decision created by STEP-03-04

## Companion Notes

- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-26
- Next action: None - SimpleQueryEngine implemented at packages/runtime/src/query/engine.ts with tests.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- This step was split from the original STEP-03-04 to separate the research spike (junior-executable with guidance) from the implementation (requires senior direction approval).

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-02 - [[05_Sessions/2026-04-02-214830-implement-query-index-subsystem-opencode|SESSION-2026-04-02-214830 OpenCode session for Implement Query Index Subsystem]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
