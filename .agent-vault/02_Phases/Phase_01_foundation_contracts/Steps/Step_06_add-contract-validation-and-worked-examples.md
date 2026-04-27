---
note_type: step
template_version: 2
contract_version: 1
title: Add Contract Validation And Worked Examples
step_id: STEP-01-06
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-03
  - STEP-01-04
  - STEP-01-05
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Add Contract Validation And Worked Examples

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Create the minimal repeatable verification path for the Phase 01 contracts.
- Ensure the example entity, skill, connector, and executor artifacts validate together.

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]]
- [[01_Architecture/Code_Map|Code Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Integrity risk: if validation depends on live connectors or manual interpretation, the contract surface will rot before runtime work begins.
- Prefer one small repeatable command over a broad test suite at this stage.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
