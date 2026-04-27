---
note_type: step
template_version: 2
contract_version: 1
title: Implement Capability Policy And Approval Model
step_id: STEP-03-02
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-03-01
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-capability-policy-and-approval-model-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement Capability Policy And Approval Model

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Give skills, connectors, and later terminal launches one policy engine for capability checks and approval requirements.
- Make trust boundaries inspectable instead of hiding them in prompts or UI copy.

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_02_implement-capability-policy-and-approval-model/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If a policy cannot be expressed in manifest metadata, the contract probably needs tightening before more runtime code lands.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-capability-policy-and-approval-model-opencode|SESSION-2026-03-22-170211 opencode session for Implement Capability Policy And Approval Model]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
