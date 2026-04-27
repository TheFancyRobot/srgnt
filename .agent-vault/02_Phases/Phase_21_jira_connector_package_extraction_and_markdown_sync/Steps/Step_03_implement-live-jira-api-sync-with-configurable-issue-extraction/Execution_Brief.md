# Execution Brief

## Why This Step Exists

- This is the first step that turns the Jira package into a real connector rather than a packaging exercise.
- It proves the Phase 20 package runtime can drive a live provider integration.
- It also establishes the reusable Jira provider-client boundary that future Jira-facing packages should share instead of reimplementing.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02]].

## Relevant Code Paths

- the new reusable Jira API client package and its exported request/search helpers
- `packages/connector-jira/` mapping, sync orchestration, and package entrypoint
- Jira tests/fixtures/mocks in both the reusable client package and the connector package
- host capability surfaces used to obtain settings, fetch, logging, workspace root, and credentials
- any shared contracts added in Step 02 to describe Jira config or sync payloads

## Execution Prompt

1. Introduce a reusable Jira REST client workspace package rather than embedding provider transport code entirely inside `@srgnt/connector-jira`.
2. Put API-token auth, request construction, search helpers, and bounded pagination in that reusable client package.
3. Have `@srgnt/connector-jira` consume the reusable client package for live sync behavior.
4. Default to issue-first rich extraction: issue fields, comments, labels, links, subtasks, sprint identifiers/names, worklog summaries, attachment metadata, and changelog summaries when available.
5. Honor the user-configurable scope and extraction toggles from Step 02.
6. Preserve raw provider metadata where the canonical task model is intentionally lossy.
7. Request credentials through the privileged host boundary defined in Step 02; do not assume token material is in plain config.
8. Fail closed on missing or invalid credentials, malformed Jira responses, unsupported settings combinations, or pagination explosions.
9. Keep attachment binaries and dashboard-specific transforms out of this step.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
