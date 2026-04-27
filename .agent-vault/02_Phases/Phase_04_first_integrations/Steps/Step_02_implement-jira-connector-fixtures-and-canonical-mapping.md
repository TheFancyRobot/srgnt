---
note_type: step
template_version: 2
contract_version: 1
title: Implement Jira Connector Fixtures And Canonical Mapping
step_id: STEP-04-02
phase: '[[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-01
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-jira-connector-fixtures-and-canonical-mapping-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement Jira Connector Fixtures And Canonical Mapping

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Prove the connector model on a task-heavy source system the wedge depends on.
- Establish how provider records, raw metadata, and canonical tasks coexist.

## Required Reading

- [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Resist the urge to mirror Jira's full schema in the canonical model.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-jira-connector-fixtures-and-canonical-mapping-opencode|SESSION-2026-03-22-170211 opencode session for Implement Jira Connector Fixtures And Canonical Mapping]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
