---
note_type: step
template_version: 2
contract_version: 1
title: Specify remote connector package metadata and CLI install lifecycle
step_id: STEP-20-03
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: completed
owner: coordinator
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-01
related_sessions:
  - '[[05_Sessions/2026-04-19-070143-specify-remote-connector-package-metadata-and-cli-install-lifecycle-executor-1|SESSION-2026-04-19-070143 executor-1 session for Specify remote connector package metadata and CLI install lifecycle]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Specify remote connector package metadata and CLI install lifecycle

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: define how a remote connector package is fetched, verified, installed, inspected, and removed through a CLI-only v1 workflow.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/contracts/src/ipc/contracts.ts`

## Companion Notes

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: coordinator
- Last touched: 2026-04-19
- Next action: Use the installed-package and registry schemas as the persistence baseline for Step 04 loader work and Step 05 CLI behavior.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Recommended default for v1 remains explicit URL/reference install plus integrity metadata, not general discovery.
- If a field is only needed for UI convenience and not correctness, defer it unless it prevents future inspect/list behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-070143-specify-remote-connector-package-metadata-and-cli-install-lifecycle-executor-1|SESSION-2026-04-19-070143 executor-1 session for Specify remote connector package metadata and CLI install lifecycle]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
