---
note_type: step
template_version: 2
contract_version: 1
title: Add Connector Status And Freshness UI
step_id: STEP-04-05
phase: '[[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-02
  - STEP-04-03
  - STEP-04-04
related_sessions: '[[05_Sessions/2026-03-22-170211-add-connector-status-and-freshness-ui-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Add Connector Status And Freshness UI

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Make connector trust visible to users and to later workflow validation.
- Give Today and Calendar surfaces the context they need when upstream data is stale or disconnected.

## Required Reading

- [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Prefer explicit stale/disconnected states over silent fallback behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-add-connector-status-and-freshness-ui-opencode|SESSION-2026-03-22-170211 opencode session for Add Connector Status And Freshness UI]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
