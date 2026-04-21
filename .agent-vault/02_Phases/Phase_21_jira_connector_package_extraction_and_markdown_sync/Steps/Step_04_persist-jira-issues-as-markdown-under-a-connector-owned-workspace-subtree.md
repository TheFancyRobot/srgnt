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
- notes or file-service helpers already used by desktop main for workspace markdown

## Concrete Starting Points

- Use the workspace layout contract from `packages/contracts/src/workspace/layout.ts` to anchor the top-level directory name.
- Add package modules such as:
  - `src/markdown/renderIssue.ts`
  - `src/markdown/pathing.ts`
  - `src/markdown/archive.ts`
- Decide file paths using the existing workspace root directories, which already include `Systems` with a capital `S`.

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/contracts/src/workspace/layout.ts`
- the sync output structures produced in STEP-21-03

## Execution Prompt

1. Define the Jira markdown path convention as `Systems/Jira/<project-key>/<issue-key>.md` unless an implementation constraint requires a documented adjustment.
2. Write one deterministic markdown file per issue with stable frontmatter carrying provider IDs, issue key, project key, source URL, sync timestamps, status, priority, labels, and stale/archive state.
3. Render the selected rich metadata into human-readable markdown sections without destroying raw traceability.
4. Make updates idempotent so repeated syncs rewrite the same file instead of creating duplicates.
5. When an issue disappears from the active sync result, mark its file stale/archived rather than deleting it.
6. Record any connector-owned bookkeeping needed to tell “out of scope” from “never seen.”
7. Keep connector-generated files clearly separate from human-authored notes.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-04 after STEP-21-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Markdown structure expectations

- Recommended frontmatter keys:
  - `provider: jira`
  - `provider_id`
  - `issue_key`
  - `project_key`
  - `source_url`
  - `synced_at`
  - `issue_updated_at`
  - `status`
  - `priority`
  - `labels`
  - `is_archived`
  - `archived_reason`
- Recommended sections:
  - summary / description
  - metadata snapshot
  - comments
  - issue links / subtasks
  - sprint/worklog/changelog summaries
  - raw provider metadata summary or references where needed

### File identity rules

- File identity should be based on stable Jira issue key, not summary text.
- Repeated syncs must overwrite the same path.
- If a project key changes or an issue is moved, record explicit migration behavior rather than letting duplicate files accumulate silently.

### Validation commands

- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/connector-jira test`
- If shared workspace helpers are touched: `pnpm --filter @srgnt/contracts test`
- If desktop write helpers are touched: `pnpm --filter @srgnt/desktop test`

### Manual checks

- Run sync twice and confirm the same issue path is rewritten, not duplicated.
- Remove an issue from mocked sync scope and confirm the file becomes stale or archived instead of deleted.
- Inspect sample markdown for readability and traceability.

### Edge cases and failure modes

- Unstable filenames caused by summary-based slugging.
- Lossy rewrites that drop previously synced metadata.
- Accidental deletion when scope changes or Jira permissions narrow.
- Generated files landing outside the expected workspace subtree.
- Mixing connector-owned generated content with hand-authored notes in the same file.

### Security considerations

- Never write Jira API tokens or other secret material into markdown.
- Keep only safe provider metadata needed for traceability.
- Be careful with comments or changelog bodies if they may contain sensitive user content; preserve the agreed product behavior but avoid expanding scope into extra hidden copies.

### Performance considerations

- Keep markdown rendering deterministic and linear in the size of fetched issue data.
- Avoid repeatedly scanning the whole workspace when a connector-owned subtree index or bookkeeping file is enough.

### Acceptance criteria mapping

- Phase criterion “Synced Jira data lands as one stable markdown file per issue ... with stale/archive marking” is primarily satisfied here.
- This step depends on Step 03 producing a structured sync payload rich enough to render without re-fetching.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and manual checks: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: none blocking.
- Junior readiness verdict: **pass**.

## Human Notes

- Connector-owned output should stay clearly separate from user-authored notes so later cleanup and re-sync remain safe.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means Jira sync lands as stable markdown files in the workspace and missing issues become archived/stale rather than deleted.
