---
note_type: phase
template_version: 2
contract_version: 1
title: Jira Connector Package Extraction and Markdown Sync
phase_id: PHASE-21
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]'
related_architecture:
  - '[[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]'
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]'
related_decisions:
  - '[[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]'
  - '[[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 21 Jira Connector Package Extraction and Markdown Sync

Use this note for a bounded phase of work in `02_Phases/`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Remove the built-in Jira implementation from `@srgnt/connectors`, rebuild it as its own workspace package using the Phase 20 factory/runtime, and ship the first live Jira connector that syncs rich issue data into workspace markdown.
- Let users configure Jira extraction scope from the Settings screen while keeping Jira API tokens in OS keychain storage behind Electron main.

## Why This Phase Exists

- Phase 20 created the connector package platform, but the current Jira implementation is still a fixture-backed built-in connector living under `packages/connectors/src/jira/`.
- The product expects connector data to land as local markdown, and Jira is the best first proof that the package runtime can drive a real API-backed, file-producing connector.
- Future dashboard and visualization work depends on having stable, rich, locally persisted Jira issue data before presentation-specific features are built.

## Scope

- Extract Jira into its own workspace package and keep the connector ID stable as `jira`.
- Add a Jira settings model for non-secret config in Settings and secret token storage in the OS keychain/main-process boundary.
- Implement issue-first rich Jira API extraction with user-configurable scope and field groups.
- Persist one markdown file per issue under a connector-owned subtree with stable filenames and stale/archive handling.
- Integrate the external Jira package with desktop install/connect/sync flows and add targeted regression coverage.

## Non-Goals

- Building dashboards, charts, visualizations, or downstream analytics over Jira data.
- Implementing Atlassian OAuth 3LO in this phase.
- Downloading attachment binaries or mirroring Jira's full API surface without bounds.
- Reworking Outlook or Teams into standalone packages as part of this phase.
- Deleting out-of-scope Jira markdown files automatically.

## Dependencies

- Depends on [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]] for the connector package runtime and safe host/loader boundary.
- Must follow [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]] for package execution isolation.
- Must follow [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017]] and [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]] for secret handling.

## Acceptance Criteria

- [ ] Jira no longer ships as a built-in implementation inside `@srgnt/connectors`; it exists as its own workspace package targeting the shared Phase 20 factory/runtime.
- [ ] Desktop settings support Jira non-secret configuration (site URL, account label/email, project/JQL scope, extraction toggles) without persisting the API token in workspace-visible config.
- [ ] Jira API token handling uses OS keychain / main-process secret storage only.
- [ ] The Jira package fetches issue-first rich metadata from the live Jira API with bounded pagination and configurable extraction groups.
- [ ] Synced Jira data lands as one stable markdown file per issue under a connector-owned subtree, with frontmatter/source metadata and stale/archive marking for issues that leave scope.
- [ ] Desktop install/connect/sync flows work with the externalized Jira package without regressing the package host safety invariants.
- [ ] Automated validation covers package extraction, settings persistence, secret non-persistence, API fetch mapping, markdown writes, and stale/archive behavior.

## Phase-Wide Workflow Map

- **Step 01** extracts Jira into its own workspace package and removes the built-in `@srgnt/connectors` copy.
- **Step 02** defines the Jira settings schema and secure token boundary so live sync has a safe configuration contract.
- **Step 03** implements the live Jira API client and configurable issue extraction behavior.
- **Step 04** persists synced issues as stable markdown files with archive/stale semantics.
- **Step 05** wires the external package into desktop install/connect/sync behavior.
- **Step 06** adds regression coverage and operator-facing documentation.

## Shared Constraints and Invariants

- Keep the user-visible connector ID as `jira`.
- Use API token authentication first; do not expand this phase into Atlassian OAuth unless a blocker proves token auth insufficient.
- Store the API token behind Electron main using a credential adapter with **OS keychain preferred** and **encrypted local fallback only when the keychain is unavailable and the fallback remains non-plaintext**.
- Default extraction scope is **issues-first rich metadata**: issue fields, comments, labels, links, subtasks, sprint data, worklog summaries, attachment metadata, and changelog summaries when available.
- Store one markdown file per issue under a connector-owned subtree such as `Systems/Jira/<project-key>/<issue-key>.md`.
- If an issue disappears from scope, mark the file stale/archived rather than deleting it automatically.
- Do not build dashboards or visualization-specific projections in this phase.

## Phase-Wide Code Map and Execution Surface

- Package extraction surface:
  - `packages/connectors/src/jira/`
  - `packages/connectors/src/index.ts`
  - `examples/connectors/jira/`
- Settings and credential surface:
  - `packages/contracts/src/ipc/contracts.ts`
  - `packages/desktop/src/main/settings.ts`
  - `packages/desktop/src/main/index.ts`
  - `packages/desktop/src/preload/index.ts`
  - `packages/desktop/src/renderer/env.d.ts`
  - `packages/desktop/src/renderer/main.tsx`
  - `packages/desktop/src/renderer/components/Settings.tsx`
- Package host and connector lifecycle surface:
  - `packages/desktop/src/main/connectors/host.ts`
  - `packages/desktop/src/main/cli/commands.ts`
  - `packages/desktop/dev-connectors/catalog.json`
  - `packages/desktop/dev-connectors/packages/jira.json`
- Workspace markdown persistence surface:
  - `packages/contracts/src/workspace/layout.ts`
  - package-owned markdown rendering and write modules under `packages/connector-jira/`

## Phase-Wide Validation Baseline

- Narrowest useful checks during execution:
  - `pnpm --filter @srgnt/connector-jira typecheck`
  - `pnpm --filter @srgnt/connector-jira test`
  - `pnpm --filter @srgnt/desktop typecheck`
  - `pnpm --filter @srgnt/desktop test`
  - `pnpm --filter @srgnt/contracts typecheck`
  - `pnpm --filter @srgnt/contracts test`
- Broader credibility check before phase completion:
  - `pnpm test`
  - run targeted desktop e2e or package-host flow checks if the final Jira path is exercised there

## Phase-Wide Readiness Checklist

Use this checklist for every Step 21 note:

- [x] exact outcome and success condition are explicit
- [x] why the step matters to the phase is explicit
- [x] prerequisites, setup state, and dependencies are explicit
- [x] concrete starting files, directories, packages, commands, and tests are named
- [x] required reading is populated
- [x] implementation constraints and non-goals are explicit
- [x] validation commands, manual checks, and acceptance mapping are explicit
- [x] edge cases, failure modes, and recovery expectations are explicit
- [x] security considerations are explicit or marked not applicable
- [x] performance considerations are explicit or marked not applicable
- [x] integration touchpoints and downstream effects are explicit
- [x] blockers, unresolved decisions, and handoff expectations are explicit
- [x] each step has been refined to junior-developer readiness

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]] -- establish the new package boundary and remove the built-in Jira copy first.
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]] -- lock the non-secret config model and the secure token boundary before live API work.
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]] -- fetch real Jira issues through the package runtime using the agreed settings contract.
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04 Persist Jira issues as markdown under a connector-owned workspace subtree]] -- land durable local markdown artifacts and archive/stale behavior.
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]] -- connect package lifecycle behavior to desktop state and UX.
- [ ] [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_06_lock-the-jira-package-down-with-regression-coverage-and-operator-docs|STEP-21-06 Lock the Jira package down with regression coverage and operator docs]] -- prove the end-to-end behavior and document operator expectations.
<!-- AGENT-END:phase-steps -->

## Notes

- Evidence behind this phase shape:
  - `packages/connectors/src/jira/*` is still built-in and fixture-based.
  - `packages/connectors/src/sdk/*` and the desktop package host from Phase 20 are now ready for package-shaped connectors.
  - `packages/contracts/src/ipc/contracts.ts` and `packages/desktop/src/main/settings.ts` currently have no connector-specific Jira settings model.
  - the workspace contract already supports local-first markdown content, but there is no Jira-owned file layout yet.
- User-confirmed planning decisions captured during grilling:
  - auth strategy: **API token first**;
  - default extraction scope: **issues-first rich metadata**;
  - markdown persistence: **one file per issue under a connector-owned subtree**;
  - disappeared/out-of-scope issues: **mark stale/archive, do not delete automatically**;
  - secret handling: **store Jira API token in OS keychain behind Electron main**.
- Recommended schema direction for Step 02: use a connector-config model keyed by connector ID so Jira solves the immediate need without making future connector settings impossible to generalize.
- Parallel work map: Step 01 must run first; Step 02 can begin as soon as package boundaries are known; Step 03 depends on Steps 01 and 02; Step 04 depends on Step 03; Step 05 depends on Steps 01-04; Step 06 runs last.
