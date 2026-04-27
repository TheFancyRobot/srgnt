---
note_type: step
template_version: 2
contract_version: 1
title: Introduce discoverable connector catalog with explicit installable manifest records
step_id: STEP-19-01
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: ''
created: '2026-04-16'
updated: '2026-04-16'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Introduce discoverable connector catalog with explicit installable manifest records

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: establish one bundled connector catalog source that describes every discoverable connector independently of workspace installation.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/index.ts`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-04-16
- Next action: Start STEP-19-02 planning and implementation handoff.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- The repo already contains partial Phase 19 groundwork (`installed` / `available` fields). Treat that as a baseline to normalize, not as a reason to skip the catalog cleanup.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
