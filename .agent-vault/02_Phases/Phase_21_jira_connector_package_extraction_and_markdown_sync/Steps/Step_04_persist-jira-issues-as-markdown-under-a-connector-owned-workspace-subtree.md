---
note_type: step
template_version: 2
contract_version: 1
title: Persist Jira issues as markdown under a connector-owned workspace subtree
step_id: STEP-21-04
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Persist Jira issues as markdown under a connector-owned workspace subtree

## Purpose

- Outcome: write one stable markdown file per Jira issue under a connector-owned subtree and define stale/archive handling for issues that leave scope.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- The product expects connector data to become local markdown, not an opaque in-memory cache.
- Future dashboards depend on stable local issue files before any visualization work begins.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]].

## Relevant Code Paths

- `packages/connector-jira/` markdown writer/output contracts
- `packages/contracts/src/workspace/layout.ts`
- any desktop or host capability code needed to write under the workspace root safely

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/contracts/src/workspace/layout.ts`
- the sync output structures produced in STEP-21-03

## Execution Prompt

1. Define the Jira markdown path convention, recommended as `Systems/Jira/<project-key>/<issue-key>.md`.
2. Write one deterministic markdown file per issue with stable frontmatter carrying provider IDs, issue key, project key, source URL, sync timestamps, status, priority, labels, and stale/archive state.
3. Render the selected rich metadata into human-readable markdown sections without destroying raw traceability.
4. Make updates idempotent so repeated syncs rewrite the same file instead of creating duplicates.
5. When an issue disappears from the active sync result, mark its file stale/archived rather than deleting it.
6. Record any connector-owned bookkeeping needed to tell “out of scope” from “never seen.”

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-04 after STEP-21-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Recommended markdown sections:
  - summary / description
  - metadata snapshot
  - comments
  - issue links / subtasks
  - sprint/worklog/changelog summaries
- Integrity risks:
  - unstable filenames;
  - lossy rewrites that drop previously synced data;
  - accidental deletion when scope changes;
  - mixing connector-owned generated content with hand-authored notes.
- Validation target:
  - golden-file or snapshot tests for markdown output;
  - tests for idempotent rewrites;
  - tests for stale/archive marking when issues leave scope.

## Human Notes

- Connector-owned output should stay clearly separate from user-authored notes so later cleanup and re-sync remain safe.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means Jira sync lands as stable markdown files in the workspace and missing issues become archived/stale rather than deleted.
