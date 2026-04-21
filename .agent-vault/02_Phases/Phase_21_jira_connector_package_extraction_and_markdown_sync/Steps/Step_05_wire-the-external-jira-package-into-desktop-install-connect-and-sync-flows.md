---
note_type: step
template_version: 2
contract_version: 1
title: Wire the external Jira package into desktop install connect and sync flows
step_id: STEP-21-05
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-01
  - STEP-21-02
  - STEP-21-03
  - STEP-21-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Wire the external Jira package into desktop install connect and sync flows

## Purpose

- Outcome: make the extracted Jira package behave like a real installable/connectable/syncable connector in desktop state and UX.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Package extraction, settings, API fetch, and markdown output are not useful unless the desktop host can actually install, connect, and run the package safely.
- This step proves the end-to-end integration path users will rely on.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_04_persist-jira-issues-as-markdown-under-a-connector-owned-workspace-subtree|STEP-21-04]].

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connectors/host.ts`
- `packages/desktop/src/main/cli/commands.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx`
- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/dev-connectors/packages/jira.json`

## Concrete Starting Points

- Replace the current built-in manifest assumption in `packages/desktop/src/main/index.ts`, where connector definitions are currently seeded from `BUILTIN_CONNECTOR_MANIFESTS`.
- Update dev catalog metadata for Jira so local install flows exercise the external package path.
- Update connect/disconnect behavior, which is currently mostly status-stubbed in desktop main, so Jira package activation and sync state are truthful.

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/desktop/src/main/connectors/host.ts`
- `packages/desktop/src/main/index.ts`

## Execution Prompt

1. Register/install the Jira package through the package host path rather than the old built-in registry path.
2. Ensure desktop connector state still presents `jira` as the stable connector ID.
3. Connect settings, credentials, package activation, and sync invocation so a user can configure Jira, connect, and trigger sync safely.
4. Surface only safe high-level state to preload/renderer; do not expose raw token material or unsafe package internals.
5. Update dev catalog/package fixtures or CLI install flows needed to exercise the Jira package path in local testing.
6. Preserve the Phase 20 install/load/connect state invariants while adding Jira-specific behavior.
7. Remove any lingering Jira-specific fallback on `BUILTIN_CONNECTOR_MANIFESTS` or other bundled-only assumptions.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-05 after STEP-21-01 through STEP-21-04.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Current desktop constraints discovered during refinement

- `packages/desktop/src/main/index.ts` currently seeds connector definitions from `BUILTIN_CONNECTOR_MANIFESTS` imported from `@srgnt/connectors`.
- `connectorInstall`, `connectorConnect`, and `connectorDisconnect` currently manage mostly derived state and catalog metadata rather than a full live package-backed sync path.
- The host/registry infrastructure from Phase 20 exists, but Jira still needs to be routed through it end to end.

### Concrete integration targets

- Desktop main should treat Jira as package-backed for install, activation, connection, and sync.
- Renderer and preload should continue receiving only high-level connector state:
  - installed
  - available
  - connected/disconnected/error/refreshing
  - safe lastError and lastSyncAt
- Dev catalog fixtures should describe the external Jira package accurately enough that local install flow coverage remains possible.

### Validation commands

- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop cli:connectors -- --help`
- If package install fixtures changed, run the relevant connector host / CLI integration tests first, then the broader desktop suite.

### Manual checks

- Fresh workspace: Jira appears as available but not installed.
- After install: Jira appears installed and package-backed.
- After connect: Jira becomes connected without exposing token material.
- After sync: status and freshness data update truthfully.
- After uninstall: no stale package-backed Jira state remains registered.

### Edge cases and failure modes

- Legacy built-in state still shadows the external package.
- Connector ID mismatch between package install record and UX card.
- Package host assumptions only work for dummy fixtures and fail for a real package.
- Install succeeds but connect/sync still hit old stub logic instead of the package runtime.

### Security considerations

- Maintain DEC-0016 isolation: renderer/preload must never load package code directly.
- Token material must remain behind the main-process credential boundary even when connect/sync is triggered from the UI.
- High-level state and errors must remain safe for IPC and logs.

### Performance considerations

- Avoid reloading or reinstalling the package unnecessarily on every settings save or panel render.
- Preserve restart recovery semantics already defined by the package host.

### Acceptance criteria mapping

- Phase criterion “Desktop install/connect/sync flows work with the externalized Jira package without regressing safety invariants” is primarily satisfied here.
- This step integrates the outputs of Steps 01-04; it should not redesign their contracts.

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

- Keep this step focused on integration glue, not on redefining the Jira data model or settings contract.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the external Jira package participates in desktop install/connect/sync flows with safe state projection and no fallback dependence on a built-in Jira runtime.
