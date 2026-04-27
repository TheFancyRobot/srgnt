---
note_type: step
template_version: 2
contract_version: 1
title: Implement connector install/uninstall and availability APIs in main process
step_id: STEP-19-03
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-02
related_sessions:
  - '[[05_Sessions/2026-04-16-225955-implement-connector-install-uninstall-and-availability-apis-in-main-process-executor-1|SESSION-2026-04-16-225955 executor-1 session for Implement connector install/uninstall and availability APIs in main process]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Implement connector install/uninstall and availability APIs in main process

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: add explicit install/uninstall control in the main process and make runtime connector state derive from **catalog + installed settings + live connection state**.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Add install/uninstall handlers and guard connect/disconnect behind installation.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If this step uncovers a missing reusable helper for “derive connector runtime state from catalog + settings”, add the helper here rather than scattering the logic further.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-225955-implement-connector-install-uninstall-and-availability-apis-in-main-process-executor-1|SESSION-2026-04-16-225955 executor-1 session for Implement connector install/uninstall and availability APIs in main process]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
