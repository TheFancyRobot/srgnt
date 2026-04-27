---
note_type: step
template_version: 2
contract_version: 1
title: Refactor built-in connectors to register through the shared factory path
step_id: STEP-20-02
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: completed
owner: coordinator
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-01
related_sessions:
  - '[[05_Sessions/2026-04-19-070143-refactor-built-in-connectors-to-register-through-the-shared-factory-path-executor-1|SESSION-2026-04-19-070143 executor-1 session for Refactor built-in connectors to register through the shared factory path]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Refactor built-in connectors to register through the shared factory path

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: make Jira, Outlook, and Teams prove the same registration and instantiation path external connector packages will use.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `packages/connectors/src/{jira,outlook,teams}/index.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`

## Companion Notes

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: coordinator
- Last touched: 2026-04-19
- Next action: Use the shared built-in registry as the baseline when wiring Step 04 host loading behavior.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Treat any remaining desktop-only special casing as a smell unless it is strictly about host/runtime boundaries rather than connector definition itself.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-070143-refactor-built-in-connectors-to-register-through-the-shared-factory-path-executor-1|SESSION-2026-04-19-070143 executor-1 session for Refactor built-in connectors to register through the shared factory path]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
