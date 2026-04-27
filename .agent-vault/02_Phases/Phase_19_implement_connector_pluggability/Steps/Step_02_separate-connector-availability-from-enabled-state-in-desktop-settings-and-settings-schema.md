---
note_type: step
template_version: 2
contract_version: 1
title: Separate connector availability from enabled state in desktop settings and settings schema
step_id: STEP-19-02
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Separate connector availability from enabled state in desktop settings and settings schema

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: persist connector installation explicitly in desktop settings while keeping connector availability derived from the bundled catalog.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: reviewer
- Last touched: 2026-04-16
- Next action: Route reviewed settings migration work to tester and continue Phase 19 validation.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If the implementation is tempted to keep both the old booleans and the new install record indefinitely, stop and document why; Phase 19 needs one honest persisted model.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
