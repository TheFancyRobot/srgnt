---
note_type: step
template_version: 2
contract_version: 1
title: Align preload bridge and renderer contracts with new connector pluggability model
step_id: STEP-19-05
phase: '[[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]'
status: completed
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - STEP-19-03
  - STEP-19-04
related_sessions:
  - '[[05_Sessions/2026-04-16-232215-align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model-executor-1|SESSION-2026-04-16-232215 executor-1 session for Align preload bridge and renderer contracts with new connector pluggability model]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Align preload bridge and renderer contracts with new connector pluggability model

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: wire the new install/uninstall lifecycle cleanly through preload and renderer orchestration so the UI can use real desktop APIs without type drift or stale semantics.
- Parent phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]].

## Required Reading

- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04]]
- [[01_Architecture/Integration_Map|Integration Map]]
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`

## Companion Notes

- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-16
- Next action: Wire install/uninstall through preload and renderer orchestration, then remove stale toggle-first assumptions.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If the renderer currently mixes connector state into generic settings state too deeply, favor a small explicit connector action layer rather than another round of implicit boolean patches.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-232215-align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model-executor-1|SESSION-2026-04-16-232215 executor-1 session for Align preload bridge and renderer contracts with new connector pluggability model]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
