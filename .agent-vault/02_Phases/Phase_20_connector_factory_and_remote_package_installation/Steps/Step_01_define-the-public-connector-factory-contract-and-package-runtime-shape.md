---
note_type: step
template_version: 2
contract_version: 1
title: Define the public connector factory contract and package runtime shape
step_id: STEP-20-01
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: completed
owner: coordinator
created: '2026-04-19'
updated: '2026-04-19'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-19-063125-define-the-public-connector-factory-contract-and-package-runtime-shape-team-lead|SESSION-2026-04-19-063125 team-lead session for Define the public connector factory contract and package runtime shape]]'
  - '[[05_Sessions/2026-04-19-064251-define-the-public-connector-factory-contract-and-package-runtime-shape-executor-1|SESSION-2026-04-19-064251 executor-1 session for Define the public connector factory contract and package runtime shape]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define the public connector factory contract and package runtime shape

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: freeze the SDK contract that both bundled and third-party connectors must implement.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/connectors/src/sdk/connector.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/connectors/src/sdk/connector.test.ts`
- `packages/contracts/src/connectors/manifest.test.ts`

## Companion Notes

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: coordinator
- Last touched: 2026-04-19
- Next action: Use this contract as the implementation baseline for STEP-20-02 and STEP-20-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- This step should end with a junior developer being able to answer: “What exactly must a connector package export, and what does the host promise to provide?”
- If the answer still requires tribal knowledge or chat history, the step is not refined enough.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-063125-define-the-public-connector-factory-contract-and-package-runtime-shape-team-lead|SESSION-2026-04-19-063125 team-lead session for Define the public connector factory contract and package runtime shape]] - Session created.
- 2026-04-19 - [[05_Sessions/2026-04-19-064251-define-the-public-connector-factory-contract-and-package-runtime-shape-executor-1|SESSION-2026-04-19-064251 executor-1 session for Define the public connector factory contract and package runtime shape]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
