# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04 Persist Jira issues as markdown under a connector-owned workspace subtree]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
