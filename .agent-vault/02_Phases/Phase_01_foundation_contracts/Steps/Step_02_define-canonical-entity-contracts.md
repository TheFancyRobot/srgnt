---
note_type: step
template_version: 2
contract_version: 1
title: Define Canonical Entity Contracts
step_id: STEP-01-02
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Define Canonical Entity Contracts

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Define the `EntityRecord`-style shared envelope and the v1 canonical entities used across the product.
- Produce concrete entity contracts for the highest-value v1 entities without coupling them to one provider.

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]

## Companion Notes

- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Integrity risk: if canonical fields mirror one provider too closely, every later connector and skill will inherit that lock-in.
- Prefer semantically stable fields and allow partial population where providers differ.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
