# Execution Brief

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

## Execution Prompt

1. Define the Jira markdown path convention as `Systems/Jira/<project-key>/<issue-key>.md` unless an implementation constraint requires a documented adjustment.
2. Write one deterministic markdown file per issue with stable frontmatter carrying provider IDs, issue key, project key, source URL, sync timestamps, status, priority, labels, and stale/archive state.
3. Render the selected rich metadata into human-readable markdown sections without destroying raw traceability.
4. Make updates idempotent so repeated syncs rewrite the same file instead of creating duplicates.
5. When an issue disappears from the active sync result, mark its file stale/archived rather than deleting it.
6. Record any connector-owned bookkeeping needed to tell “out of scope” from “never seen.”
7. Keep connector-generated files clearly separate from human-authored notes.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04 Persist Jira issues as markdown under a connector-owned workspace subtree]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
