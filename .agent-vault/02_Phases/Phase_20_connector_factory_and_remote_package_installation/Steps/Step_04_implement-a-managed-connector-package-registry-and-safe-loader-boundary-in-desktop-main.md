---
note_type: step
template_version: 2
contract_version: 1
title: Implement a managed connector package registry and safe loader boundary in desktop main
step_id: STEP-20-04
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: completed
owner: claude-opus
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-02
  - STEP-20-03
related_sessions: '[[05_Sessions/2026-04-19-193808-implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main-claude-opus|SESSION-2026-04-19-193808 claude-opus session for Implement a managed connector package registry and safe loader boundary in desktop main]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Implement a managed connector package registry and safe loader boundary in desktop main

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: add the host-side package registry and loading path that turns remote package metadata into safely loadable connector instances.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`

## Companion Notes

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-19
- Next action: Build the host-side registry and loader after contract + install design settle.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If a subprocess/worker boundary is needed for safety, that is no longer optional for third parties; it is the default path per [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]].

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-193808-implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main-claude-opus|SESSION-2026-04-19-193808 claude-opus session for Implement a managed connector package registry and safe loader boundary in desktop main]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
