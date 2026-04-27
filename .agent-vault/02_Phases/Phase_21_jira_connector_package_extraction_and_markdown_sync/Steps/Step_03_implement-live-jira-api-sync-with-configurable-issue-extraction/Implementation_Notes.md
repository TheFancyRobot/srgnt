# Implementation Notes

### Sync shape expectations

- The sync result should expose enough structured data for Step 04 to write markdown without re-fetching Jira.
- Per [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018]], keep a clear boundary between:
  - reusable Jira HTTP fetch/auth/search/pagination code in a standalone workspace package
  - Jira-to-srgnt mapping in `@srgnt/connector-jira`
  - markdown rendering and file writes
- Preserve both canonical task data and Jira-specific provider metadata needed for later markdown rendering.

### Suggested extraction groups

- Always-on core issue metadata:
  - issue id/key/url
  - summary/description/status/priority/type
  - assignee/reporter
  - created/updated timestamps
- Toggleable rich groups:
  - comments
  - issue links and subtasks
  - sprint data
  - worklog summaries
  - attachment metadata only
  - changelog summaries

### Validation commands

- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/connector-jira test`
- If shared contracts changed: `pnpm --filter @srgnt/contracts typecheck && pnpm --filter @srgnt/contracts test`
- If desktop host capability types changed: `pnpm --filter @srgnt/desktop typecheck`

### Manual checks

- With mocked fixtures, verify pagination requests stop at the configured bound.
- Verify toggles materially change the resulting sync payload.
- Verify missing credentials fail before network work proceeds.

### Edge cases and failure modes

- Unbounded pagination or broad JQL causing rate-limit blowups.
- Scope toggles that exist in config but are ignored by the client.
- Jira API field absence varying by project or permissions.
- Changelog/comments/worklogs not included because API expand parameters were omitted.
- Package code reaching for credential material directly instead of through the privileged host contract.

### Security considerations

- Token must never be logged, serialized into sync payloads, or persisted into markdown.
- Error messages should remain safe for crash and CLI redaction paths.
- Host capability boundaries must remain the only credential path.

### Performance considerations

- Keep pagination bounded and explicit.
- Avoid fetching heavy optional groups unless enabled.
- Do not fetch attachment bodies.

### Acceptance criteria mapping

- Phase criterion “reusable Jira API client package owns provider transport behavior” is primarily satisfied here.
- Phase criterion “Jira connector package fetches issue-first rich metadata from the live Jira API” is also primarily satisfied here.
- This step should produce the source payload consumed by markdown persistence in Step 04.

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

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
