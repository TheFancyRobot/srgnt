---
note_type: step
template_version: 2
contract_version: 1
title: Wire the external Jira package into desktop install connect and sync flows
step_id: STEP-21-05
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: completed
owner: executor-1
created: '2026-04-21'
updated: '2026-04-25'
depends_on:
  - STEP-21-01
  - STEP-21-02
  - STEP-21-03
  - STEP-21-04
related_sessions:
  - '[[05_Sessions/2026-04-24-231914-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-24-231914 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]]'
  - '[[05_Sessions/2026-04-24-233330-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-24-233330 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]]'
  - '[[05_Sessions/2026-04-25-002033-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-25-002033 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]]'
related_bugs:
  - '[[03_Bugs/BUG-0018_jira-connector-does-not-appear-in-the-connector-list|BUG-0018 Jira connector does not appear in the connector list]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-25-002033
active_session_id: 05_Sessions/2026-04-25-002033-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1
context_status: active
context_summary: Advance [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]].
---

# Step 05 - Wire the external Jira package into desktop install connect and sync flows

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: make the extracted Jira package behave like a real installable/connectable/syncable connector in desktop state and UX.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/desktop/src/main/connectors/host.ts`
- `packages/desktop/src/main/index.ts`

## Companion Notes

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Owner: executor-1
- Last touched: 2026-04-25
- Next action: None.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Keep this step focused on integration glue, not on redefining the Jira data model or settings contract.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-24 - [[05_Sessions/2026-04-24-231914-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-24-231914 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]] - Session created.
- 2026-04-24 - [[05_Sessions/2026-04-24-233330-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-24-233330 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]] - Session created.
- 2026-04-25 - [[05_Sessions/2026-04-25-002033-wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows-executor-1|SESSION-2026-04-25-002033 executor-1 session for Wire the external Jira package into desktop install connect and sync flows]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
