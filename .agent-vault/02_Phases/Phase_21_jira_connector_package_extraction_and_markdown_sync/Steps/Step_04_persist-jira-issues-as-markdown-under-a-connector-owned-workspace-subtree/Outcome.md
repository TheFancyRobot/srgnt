# Outcome

## What Was Implemented

Jira issues are persisted as stable markdown files under a connector-owned workspace subtree (`.jira/`). The implementation consists of two modules:

### `packages/connector-jira/src/persistence/writer.ts`
- Orchestrates writing one stable markdown file per Jira issue under the `.jira/` workspace subtree
- Manages a `.jira/.index.json` sync index tracking `syncedKeys` with file paths, last sync timestamps, and archive state
- Detects stale issues (previously synced but no longer in scope) and **archives them in place** instead of deleting — controlled by `archiveStale` option
- All file I/O goes through the `FileAdapter` interface (via `HostCapabilities.files`), maintaining the privileged host boundary
- Token is never written to any file

### `packages/connector-jira/src/persistence/markdown.ts`
- Converts Jira-mapped `Task` objects (with `providerMetadata`) into human-readable markdown files
- Generates YAML frontmatter with: `provider`, `provider_id`, `issue_key`, `project_key`, `source_url`, `synced_at`, `issue_updated_at`, `status`, `priority`, `labels`, `is_archived`, `archived_reason`
- Renders sections for: summary/description, comments, issue links, sprints, worklog summaries, and raw provider metadata
- Stable file identity based on Jira issue key, not summary text — repeated syncs overwrite the same path

## Validation Evidence

| Test Suite | Tests | Status |
|---|---|---|
| `src/persistence/writer.test.ts` | 18 passed | ✅ |
| `src/persistence/markdown.test.ts` | 14 passed | ✅ |
| Full connector-jira suite | 83 passed (7 suites) | ✅ |

Both modules typecheck cleanly via `pnpm --filter @srgnt/connector-jira typecheck`.

## Key Files Changed

- `packages/connector-jira/src/persistence/writer.ts` — sync index + file writer
- `packages/connector-jira/src/persistence/markdown.ts` — markdown renderer with frontmatter
- `packages/connector-jira/src/persistence/writer.test.ts` — 18 regression tests
- `packages/connector-jira/src/persistence/markdown.test.ts` — 14 regression tests

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04 Persist Jira issues as markdown under a connector-owned workspace subtree]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
