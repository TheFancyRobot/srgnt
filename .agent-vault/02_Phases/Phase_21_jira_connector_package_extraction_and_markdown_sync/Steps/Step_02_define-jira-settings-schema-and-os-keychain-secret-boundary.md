---
note_type: step
template_version: 2
contract_version: 1
title: Define Jira settings schema and OS-keychain secret boundary
step_id: STEP-21-02
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Define Jira settings schema and OS-keychain secret boundary

## Purpose

- Outcome: add the non-secret Jira settings contract and UI surface while routing the Jira API token through OS keychain / main-process secret storage.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Live Jira sync needs a durable, user-editable config contract before API work begins.
- This is the step that prevents secrets from leaking into desktop settings or workspace markdown.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]].
- Read [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- privileged desktop-main secret storage or new helper module added for Jira credentials

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/renderer/components/Settings.tsx`

## Execution Prompt

1. Extend desktop settings so Jira has a durable non-secret configuration model.
2. Prefer a connector-config structure keyed by connector ID over a Jira-only dead end, but keep the first implementation concrete and shippable.
3. Include at minimum: Jira base URL/site, account email/label, project keys or JQL scope, and extraction toggles/groups.
4. Add a settings UX for entering/updating Jira config and a separate token submission/reconnect action.
5. Store the Jira API token only through a privileged OS-keychain path; do not persist it into `desktop-settings.json`, renderer state snapshots, or markdown.
6. Add tests that prove token non-persistence and safe migration/default behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-02 after STEP-21-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Recommended default settings fields:
  - `siteUrl`
  - `accountEmail`
  - `scopeMode` (`projects` or `jql`)
  - `projectKeys` and/or `jql`
  - extraction toggles for comments, links/subtasks, sprints, worklog summaries, attachment metadata, changelog summaries
- Integrity risks:
  - token leakage into saved JSON;
  - renderer owning long-lived secret state;
  - Jira-only schema shape that cannot accommodate future connector package settings.
- Validation target:
  - contracts/settings tests;
  - renderer settings UI tests if available;
  - explicit assertion that saved settings files omit the Jira token.

## Human Notes

- Treat this as a contract-freezing step. Step 03 should consume the agreed settings model, not redesign it mid-implementation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means Jira config is user-editable, secrets stay out of workspace-visible config, and later API work has a stable input contract.
