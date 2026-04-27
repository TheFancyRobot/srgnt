---
note_type: step
template_version: 2
contract_version: 1
title: Run real machine release validation
step_id: STEP-11-01
phase: '[[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]]'
status: planned
owner: ''
created: '2026-03-29'
updated: '2026-04-21'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead|SESSION-2026-04-21-014952 team-lead session for Run real machine release validation]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-21-014952
active_session_id: 05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead
context_status: active
context_summary: Advance [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation|STEP-11-01 Run real machine release validation]].
---

# Step 01 - Run real machine release validation

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Execute the platform validation runbooks on real machines and fold the results back into the release recommendation.
- Parent phase: [[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]].

## Required Reading

- [[02_Phases/Phase_11_real_machine_validation/Phase|PHASE-11 Real Machine Validation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]]
- [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]

## Companion Notes

- [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start the first real-machine validation run using [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Prefer conservative release calls. A clean repo-side gate is not enough to ignore installer or trust-surface regressions on real machines.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-21 - [[05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead|SESSION-2026-04-21-014952 team-lead session for Run real machine release validation]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
