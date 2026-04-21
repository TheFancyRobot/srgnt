---
note_type: step
template_version: 2
contract_version: 1
title: Wire the external Jira package into desktop install connect and sync flows
step_id: STEP-21-05
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-01
  - STEP-21-02
  - STEP-21-03
  - STEP-21-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Wire the external Jira package into desktop install connect and sync flows

## Purpose

- Outcome: make the extracted Jira package behave like a real installable/connectable/syncable connector in desktop state and UX.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Package extraction, settings, API fetch, and markdown output are not useful unless the desktop host can actually install, connect, and run the package safely.
- This step proves the end-to-end integration path users will rely on.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04]].

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connectors/host.ts`
- `packages/desktop/src/main/cli/commands.ts`
- preload IPC and renderer connector/status surfaces
- dev connector catalog/package fixtures if needed for installation path coverage

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/desktop/src/main/connectors/host.ts`
- `packages/desktop/src/main/index.ts`

## Execution Prompt

1. Register/install the Jira package through the package host path rather than the old built-in registry path.
2. Ensure desktop connector state still presents `jira` as the stable connector ID.
3. Connect settings, credentials, package activation, and sync invocation so a user can configure Jira, connect, and trigger sync safely.
4. Surface only safe high-level state to preload/renderer; do not expose raw token material or unsafe package internals.
5. Update any dev catalog/package fixtures or CLI install flows needed to exercise the Jira package path in local testing.
6. Preserve the Phase 20 install/load/connect state invariants while adding Jira-specific behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-05 after STEP-21-01 through STEP-21-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Key checks:
  - desktop sees Jira as package-backed, not built-in;
  - connect/disconnect/sync flows still surface truthful status;
  - safe host/package boundaries remain intact.
- Integrity risks:
  - legacy built-in state still shadowing the external package;
  - connector ID mismatch between install record and UX state;
  - package host assumptions that only cover test fixtures.
- Validation target:
  - desktop unit/integration tests;
  - CLI/package-host tests where relevant;
  - targeted e2e or packaged-flow checks if the sync button/install surface exists.

## Human Notes

- Keep this step focused on integration glue, not on redefining the Jira data model or settings contract.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the external Jira package participates in desktop install/connect/sync flows with safe state projection and no fallback dependence on a built-in Jira runtime.
