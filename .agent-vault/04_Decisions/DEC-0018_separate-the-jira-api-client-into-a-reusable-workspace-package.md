---
note_type: decision
template_version: 2
contract_version: 1
title: Separate the Jira API client into a reusable workspace package
decision_id: DEC-0018
status: accepted
decided_on: '2026-04-23'
owner: ''
created: '2026-04-23'
updated: '2026-04-23'
supersedes: []
superseded_by: []
related_notes:
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]'
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
  - '[[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]'
  - '[[05_Sessions/2026-04-23-161141-implement-live-jira-api-sync-with-configurable-issue-extraction-executor-1|SESSION-2026-04-23-161141 executor-1 session for Implement live Jira API sync with configurable issue extraction]]'
tags:
  - agent-vault
  - decision
  - jira
  - connectors
  - packaging
---

# DEC-0018 - Separate the Jira API client into a reusable workspace package

## Status

- Accepted.

## Context

- Phase 21 originally framed Step 03 as implementing a live Jira API client directly inside `@srgnt/connector-jira`.
- That would get Jira working, but it would also encourage every future Jira-adjacent connector or importer to implement its own transport, auth, pagination, query, and error-handling stack.
- The repo is already moving toward explicit package boundaries for reusable connector/runtime capabilities rather than hidden built-in coupling.
- Jira is likely not the last package that will need authenticated Jira REST access. Reusing one provider client is preferable to duplicating slightly different Jira clients across multiple connectors.

## Decision

- The Jira REST API client must be separated into its own reusable workspace package instead of remaining private implementation detail inside `@srgnt/connector-jira`.
- `@srgnt/connector-jira` remains the connector package that owns connector manifest/runtime/factory behavior, Jira-to-srgnt mapping, sync orchestration, and markdown persistence.
- The new client package owns the provider-facing HTTP layer: authentication wiring, request construction, pagination, search helpers, and normalized Jira API error handling.
- Other packages that need Jira API access should depend on the shared Jira client package rather than implementing independent Jira clients.
- This decision does **not** require broad shared connector abstractions for all providers right now; it is a provider-specific extraction motivated by immediate Jira reuse.
- The exact package name can be chosen during implementation, but the boundary must be package-level and reusable by other workspace packages.

## Alternatives Considered

- Keep the client embedded inside `@srgnt/connector-jira`. Rejected because it couples reusable provider transport behavior to one connector package and invites future duplication.
- Build a generic cross-provider HTTP client framework first. Rejected because it over-generalizes before the repo has a second real provider with the same needs.
- Let each future Jira-facing package implement its own API client. Rejected because it multiplies auth, pagination, testing, and bug-fix work while increasing drift risk.

## Tradeoffs

- Pro: one Jira auth/pagination/error boundary can be reused across future Jira-facing packages.
- Pro: connector packages stay focused on connector behavior instead of low-level provider transport concerns.
- Pro: bug fixes and API-version adaptations land in one place.
- Pro: testing can separate provider-client correctness from connector mapping/persistence behavior.
- Con: Step 03 becomes a slightly larger refactor than a connector-local implementation.
- Con: package boundaries, exports, and tests must be maintained for an additional workspace package.
- Con: initial delivery may slow slightly while the reusable boundary is introduced.

## Consequences

- Phase 21 notes and Step 03 execution guidance must describe the Jira client as a reusable package, not as connector-private code.
- `@srgnt/connector-jira` should depend on the shared Jira client package once implemented.
- Architecture notes should reflect the split between provider client responsibilities and connector-package responsibilities.
- Validation should cover both the reusable Jira client package and the consuming connector package.
- Future Jira-related packages should treat the shared client package as the default integration path.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Architecture: [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
 - Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
 - Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
 - Decision: [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
 - Decision: [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
 - Session: [[05_Sessions/2026-04-23-161141-implement-live-jira-api-sync-with-configurable-issue-extraction-executor-1|SESSION-2026-04-23-161141 executor-1 session for Implement live Jira API sync with configurable issue extraction]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-23 - Accepted: Jira provider transport/auth/pagination behavior must move into a reusable workspace package rather than staying embedded in `@srgnt/connector-jira`.
- 2026-04-23 - User confirmed the intent explicitly: the API client must be a standalone package so other connectors can reuse it.
<!-- AGENT-END:decision-change-log -->
