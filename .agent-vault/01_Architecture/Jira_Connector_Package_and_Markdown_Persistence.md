---
note_type: architecture
template_version: 2
contract_version: 1
title: Jira Connector Package and Markdown Persistence
architecture_id: "ARCH-0009"
status: active
owner: ""
reviewed_on: "2026-04-21"
created: "2026-04-21"
updated: "2026-04-21"
related_notes:
  - "[[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
  - "[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]"
  - "[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]"
  - "[[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]"
  - "[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]"

tags:
  - agent-vault
  - architecture
  - connectors
  - jira
  - markdown
---

# Jira Connector Package and Markdown Persistence

## Purpose

- Define how Jira moves from a built-in fixture-backed connector inside `@srgnt/connectors` into its own workspace package that uses the Phase 20 connector factory.
- Define the security, settings, API sync, and markdown-persistence boundaries for the first live Jira implementation.

## Overview

- Phase 20 established a package-shaped connector runtime and a safe host/loader boundary for external connectors.
- The current Jira implementation in `packages/connectors/src/jira/` is still a built-in fixture-backed connector that proves contracts but does not perform live API sync or markdown persistence.
- Phase 21 turns Jira into the first real connector package that exercises the shared package runtime while keeping the user-facing connector ID stable as `jira`.
- Per [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018]], Jira provider transport code is not meant to stay private to `@srgnt/connector-jira`; auth, request construction, search helpers, pagination, and normalized Jira API error handling should live in a reusable Jira API client package that other Jira-facing packages can consume.
- The first live auth mode is **Jira API token**, not OAuth. Users configure non-secret Jira settings in the desktop settings screen, while the API token is stored behind a main-process credential adapter with **OS keychain preferred** and an **encrypted local fallback only when keychain access is unavailable**.
- Synced Jira content is written as **one markdown file per issue** under a connector-owned subtree such as `Systems/Jira/<project-key>/<issue-key>.md`. Files that disappear from the sync scope are not deleted automatically; they are marked stale/archived.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- reusable Jira API client workspace package - owns Jira auth wiring, request construction, search helpers, pagination, and normalized Jira API error handling.
- `packages/connector-jira/` workspace package - owns the Jira manifest, runtime metadata, factory export, connector-side sync orchestration, mapping logic, and markdown writer while consuming the reusable Jira API client package.
- Shared connector factory contract - package must export `{ manifest, runtime, factory }` compatible with the Phase 20 host/loader path.
- Jira settings model - non-secret per-user config such as site URL, account email, project/JQL scope, and extraction toggles surfaced in Settings.
- Main-process secret boundary - stores and retrieves the Jira API token via a credential adapter that prefers OS keychain integration and only falls back to encrypted local storage when necessary; the renderer never gets the raw token.
- Jira API sync engine - fetches issue-first rich metadata with pagination and bounded extraction groups.
- Markdown persistence layer - writes stable per-issue markdown files with frontmatter for provider IDs, sync timestamps, status, and stale/archive state.
- Desktop package host integration - installs, activates, and surfaces safe high-level state for the externalized Jira connector package.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `packages/connectors/src/jira/` - current built-in Jira implementation to be extracted.
- `packages/connectors/src/sdk/` - shared connector factory and registry types that the package must target.
- reusable Jira API client package path (to be introduced by Step 03) - shared provider transport/auth boundary for Jira-consuming packages.
- `packages/contracts/src/ipc/contracts.ts` - desktop settings schema that currently lacks connector-specific config.
- `packages/desktop/src/main/settings.ts` - durable settings persistence and migration entrypoint.
- `packages/desktop/src/renderer/main.tsx` and `packages/desktop/src/renderer/components/Settings.tsx` - current settings UI surface.
- `packages/desktop/src/main/connectors/host.ts` and `packages/desktop/src/main/index.ts` - package host orchestration and connector state projection.
- `packages/contracts/src/workspace/layout.ts` - workspace directory contract used to place connector-owned markdown.
- `examples/connectors/jira/` - current Jira example/export surface that may need to point at the extracted package.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Keep the connector ID stable as `jira`; migration must not invent a second user-visible Jira identifier.
- Use the shared package runtime from Phase 20 instead of reintroducing a built-in-only desktop path.
- Keep Jira provider transport code reusable at package scope; do not bury the Jira client entirely inside `@srgnt/connector-jira`.
- Store Jira API tokens only behind Electron main in a credential adapter that prefers OS keychain and only uses encrypted local fallback when needed; never in workspace markdown, renderer state, or `desktop-settings.json`.
- Make extraction **issue-first rich metadata** by default: issue fields plus comments, issue links, subtasks, sprint data, worklog summaries, attachment metadata, and changelog summaries when available.
- Do not download or persist attachment binaries in Phase 21.
- Persist one markdown file per issue under a connector-owned subtree with stable filenames and idempotent rewrites.
- If an issue falls out of scope or disappears, mark the local markdown file stale/archived instead of deleting it automatically.
- Avoid Jira-specific assumptions inside shared SDK packages beyond generic connector/package contracts.

## Failure Modes

- Persisting API tokens in desktop settings or workspace files breaks the current security model.
- Keeping Jira half-built-in and half-external reintroduces dual registration paths and package/runtime drift.
- Using unstable file names or path derivation breaks future dashboard/indexing work and creates duplicate issue notes.
- Over-fetching unbounded Jira resources or attachment bodies can create rate-limit, performance, or storage blowups.
- Treating out-of-scope issues as deletions risks silent local data loss when settings or API responses change.
- Encoding Jira-specific settings in an inflexible one-off desktop schema makes future connector package settings harder to generalize.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- [[04_Decisions/DEC-0018_separate-the-jira-api-client-into-a-reusable-workspace-package|DEC-0018 Separate the Jira API client into a reusable workspace package]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
<!-- AGENT-END:architecture-related-notes -->
