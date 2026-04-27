---
note_type: step
template_version: 2
contract_version: 1
title: Define Jira settings schema and OS-keychain secret boundary
step_id: STEP-21-02
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: completed
owner: ''
created: '2026-04-21'
updated: '2026-04-24'
depends_on:
  - STEP-21-01
related_sessions:
  - '[[05_Sessions/2026-04-21-033801-define-jira-settings-schema-and-os-keychain-secret-boundary-executor-1|SESSION-2026-04-21-033801 executor-1 session for Define Jira settings schema and OS-keychain secret boundary]]'
related_bugs:
  - '[[03_Bugs/BUG-0017_jira-token-save-fails-when-electron-safestorage-encryption-is-unavailable|BUG-0017 Jira token save fails when Electron safeStorage encryption is unavailable]]'
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-21-033801
active_session_id: 05_Sessions/2026-04-21-033801-define-jira-settings-schema-and-os-keychain-secret-boundary-executor-1
context_status: active
context_summary: Advance [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]].
last_touched: '2026-04-21'
---

# Step 02 - Define Jira settings schema and OS-keychain secret boundary

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: add the non-secret Jira settings contract and UI surface while routing the Jira API token through a privileged credential adapter owned by Electron main.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/renderer/components/Settings.tsx`

## Companion Notes

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Owner: executor-1
- Last touched: 2026-04-24
- Next action: None.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Treat this as a contract-freezing step. Step 03 should consume the agreed settings model, not redesign it mid-implementation.
- If the credential adapter reveals a true cross-platform blocker, record it explicitly and do not silently downgrade the security boundary.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-21 - [[05_Sessions/2026-04-21-033801-define-jira-settings-schema-and-os-keychain-secret-boundary-executor-1|SESSION-2026-04-21-033801 executor-1 session for Define Jira settings schema and OS-keychain secret boundary]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
