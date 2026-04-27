# Execution Brief

## Why This Step Exists

- The current Jira implementation still proves the old built-in path instead of the new package runtime.
- This step creates the package boundary that every later Jira step depends on and removes the risk of maintaining Jira in two places.

## Prerequisites

- Read [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]].
- Read [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]] and [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]].
- Review the shipped Phase 20 factory/runtime path before moving files.

## Relevant Code Paths

- `packages/connectors/src/jira/`
- `packages/connectors/src/index.ts`
- `packages/connectors/src/sdk/`
- `packages/connectors/src/sdk/registry.test.ts`
- `examples/connectors/jira/`
- `package.json`, `pnpm-workspace.yaml`, workspace `package.json` manifests, and tsconfig references

## Execution Prompt

1. Create a dedicated Jira workspace package that exports `{ manifest, runtime, factory }` for the shared package runtime.
2. Use package name `@srgnt/connector-jira` unless codebase constraints force a different workspace name; if they do, document the reason in this step note.
3. Move the existing Jira fixture, mapping, tests, and manifest logic into that package as the extraction baseline.
4. Remove Jira registration and re-exports from `@srgnt/connectors` so Jira is no longer a built-in connector there.
5. Keep the connector ID stable as `jira`; do not invent a new install-facing identifier.
6. Update examples/tests/import paths so the extracted package becomes the new single source of truth.
7. Leave Outlook and Teams untouched in `@srgnt/connectors`; this step is about isolating Jira only.
8. Document any migration consequences for Step 05 (desktop integration) rather than silently patching around them.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
