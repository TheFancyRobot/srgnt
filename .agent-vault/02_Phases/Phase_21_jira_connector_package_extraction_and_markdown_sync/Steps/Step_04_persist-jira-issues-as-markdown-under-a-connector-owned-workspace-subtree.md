---
note_type: step
template_version: 2
contract_version: 1
title: Persist Jira issues as markdown under a connector-owned workspace subtree
step_id: STEP-21-04
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: completed
owner: executor-1
created: '2026-04-21'
updated: '2026-04-23'
depends_on:
  - STEP-21-03
related_sessions:
  - '[[05_Sessions/2026-04-23-170102-persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree-executor-1|SESSION-2026-04-23-170102 executor-1 session for Persist Jira issues as markdown under a connector-owned workspace subtree]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-23-170102
active_session_id: 05_Sessions/2026-04-23-170102-persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree-executor-1
context_status: active
context_summary: Advance [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04 Persist Jira issues as markdown under a connector-owned workspace subtree]].
---

# Step 04 - Persist Jira issues as markdown under a connector-owned workspace subtree

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: write one stable markdown file per Jira issue under a connector-owned subtree and define stale/archive handling for issues that leave scope.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/contracts/src/workspace/layout.ts`
- the sync output structures produced in STEP-21-03

## Companion Notes

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Owner: executor-1
- Last touched: 2026-04-23
- Next action: None.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Connector-owned output should stay clearly separate from user-authored notes so later cleanup and re-sync remain safe.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-23 - [[05_Sessions/2026-04-23-170102-persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree-executor-1|SESSION-2026-04-23-170102 executor-1 session for Persist Jira issues as markdown under a connector-owned workspace subtree]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
