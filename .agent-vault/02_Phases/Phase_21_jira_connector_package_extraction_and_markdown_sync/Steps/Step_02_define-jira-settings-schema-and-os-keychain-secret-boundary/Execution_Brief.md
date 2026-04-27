# Execution Brief

## Why This Step Exists

- Live Jira sync needs a durable, user-editable config contract before API work begins.
- This is the step that prevents secrets from leaking into desktop settings or workspace markdown.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]].
- Read [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/main.tsx`
- `packages/desktop/src/renderer/components/Settings.tsx`
- new privileged desktop-main credential helper module for Jira credentials

## Execution Prompt

1. Extend desktop settings so Jira has a durable non-secret configuration model.
2. Prefer a connector-config structure keyed by connector ID over a Jira-only dead end, but keep the first implementation concrete and shippable.
3. Include at minimum: Jira site URL, account email or label, scope mode, project keys and/or JQL, and extraction toggles/groups.
4. Add a settings UX for entering and updating non-secret Jira config plus a separate token submit or reconnect flow.
5. Implement a main-process credential adapter with this approved planning direction: **OS keychain preferred, encrypted local fallback allowed when the keychain is unavailable**.
6. Keep the raw token out of `desktop-settings.json`, renderer snapshots, markdown, package manifests, and package install metadata.
7. Add tests that prove token non-persistence and safe migration or default behavior.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
