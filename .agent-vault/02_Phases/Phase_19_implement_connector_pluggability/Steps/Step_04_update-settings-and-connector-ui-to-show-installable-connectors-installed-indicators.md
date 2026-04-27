---
note_type: step
template_version: 2
contract_version: 1
title: Update Settings and connector UI to show installable connectors + installed indicators
step_id: STEP-19-04
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-03
related_sessions:
  - '[[05_Sessions/2026-04-16-231002-update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators-executor-1|SESSION-2026-04-16-231002 executor-1 session for Update Settings and connector UI to show installable connectors + installed indicators]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Update Settings and connector UI to show installable connectors + installed indicators

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: refactor presentational connector and settings components so they communicate the new **Available / Installed / Connected** model instead of a boolean enable/disable toggle.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Refactor connector and settings components to show installability explicitly before renderer wiring lands.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If Step 04 reveals that top-level app state assumptions are too baked into presentational components, document the pressure clearly for Step 05 rather than hiding it in ad hoc UI workarounds.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-231002-update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators-executor-1|SESSION-2026-04-16-231002 executor-1 session for Update Settings and connector UI to show installable connectors + installed indicators]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
