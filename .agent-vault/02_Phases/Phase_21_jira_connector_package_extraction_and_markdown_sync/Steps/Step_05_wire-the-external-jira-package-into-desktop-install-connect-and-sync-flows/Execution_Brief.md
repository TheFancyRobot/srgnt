# Execution Brief

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

## Execution Prompt

1. Register/install the Jira package through the package host path rather than the old built-in registry path.
2. Ensure desktop connector state still presents `jira` as the stable connector ID.
3. Connect settings, credentials, package activation, and sync invocation so a user can configure Jira, connect, and trigger sync safely.
4. Surface only safe high-level state to preload/renderer; do not expose raw token material or unsafe package internals.
5. Update dev catalog/package fixtures or CLI install flows needed to exercise the Jira package path in local testing.
6. Preserve the Phase 20 install/load/connect state invariants while adding Jira-specific behavior.
7. Remove any lingering Jira-specific fallback on `BUILTIN_CONNECTOR_MANIFESTS` or other bundled-only assumptions.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
