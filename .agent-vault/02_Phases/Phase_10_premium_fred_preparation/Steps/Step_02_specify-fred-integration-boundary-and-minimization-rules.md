---
note_type: step
template_version: 2
contract_version: 1
title: Specify Fred Integration Boundary And Minimization Rules
step_id: STEP-10-02
phase: '[[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-04-16'
depends_on:
  - STEP-10-01
related_sessions:
  - '[[05_Sessions/2026-04-16-212212-specify-fred-integration-boundary-and-minimization-rules-coordinator|SESSION-2026-04-16-212212 coordinator session for Specify Fred Integration Boundary And Minimization Rules]]'
  - '[[05_Sessions/2026-04-16-225023-specify-fred-integration-boundary-and-minimization-rules-executor-1|SESSION-2026-04-16-225023 executor-1 session for Specify Fred Integration Boundary And Minimization Rules]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Specify Fred Integration Boundary And Minimization Rules

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Set the data minimization and integration rules for future Fred-powered flows.
- Preserve local-first and privacy constraints even when premium AI enters the stack.

## Required Reading

- [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
- [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Companion Notes

- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: partial
- Current owner:
- Last touched: 2026-03-22
- Next action: Close the remaining implementation and validation gaps before marking this complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If a premium use case needs broad raw workspace access, challenge the product design rather than expanding the boundary casually.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-212212-specify-fred-integration-boundary-and-minimization-rules-coordinator|SESSION-2026-04-16-212212 coordinator session for Specify Fred Integration Boundary And Minimization Rules]] - Session created.
- 2026-04-16 - [[05_Sessions/2026-04-16-225023-specify-fred-integration-boundary-and-minimization-rules-executor-1|SESSION-2026-04-16-225023 executor-1 session for Specify Fred Integration Boundary And Minimization Rules]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
