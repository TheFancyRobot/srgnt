---
note_type: step
template_version: 2
contract_version: 1
title: Add CLI install remove inspect commands and end-to-end regression coverage
step_id: STEP-20-05
phase: '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]'
status: completed
owner: claude-opus
created: '2026-04-19'
updated: '2026-04-19'
depends_on:
  - STEP-20-04
related_sessions:
  - '[[05_Sessions/2026-04-19-195504-add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage-claude-opus|SESSION-2026-04-19-195504 claude-opus session for Add CLI install remove inspect commands and end-to-end regression coverage]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Add CLI install remove inspect commands and end-to-end regression coverage

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: ship the CLI-only management surface and lock in the new package platform with regression coverage.
- Parent phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- `TESTING.md`
- `package.json`
- `packages/desktop/dev-connectors/catalog.json`
- The package registry and loader implementation added in STEP-20-04

## Companion Notes

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-19
- Next action: Ship the CLI workflow and full regression matrix after the host runtime is implemented.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Resist adding UI management in this step; capture UI ideas as follow-up work after the CLI path proves the model.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-19 - [[05_Sessions/2026-04-19-195504-add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage-claude-opus|SESSION-2026-04-19-195504 claude-opus session for Add CLI install remove inspect commands and end-to-end regression coverage]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
