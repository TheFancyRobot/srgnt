# Execution Brief

## Why This Step Exists

- The current code duplicates built-in connector metadata between package-level manifests and desktop main-process definitions.
- If bundled connectors keep a privileged special path, the public factory contract will be unproven and third-party support will stay theoretical.
- This is the first concrete check that Step 01 created a usable contract instead of a purely abstract type layer.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01]].
- Inspect built-in connector manifests and the desktop connector catalog/bootstrap logic.
- Confirm which built-in definitions still live in `packages/desktop/src/main/index.ts` before editing.

## Relevant Code Paths

- `packages/connectors/src/jira/index.ts`
- `packages/connectors/src/outlook/index.ts`
- `packages/connectors/src/teams/index.ts`
- `packages/connectors/src/index.ts`
- `packages/connectors/src/jira/jira.test.ts`
- `packages/connectors/src/outlook/outlook.test.ts`
- `packages/connectors/src/teams/teams.test.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`

## Execution Prompt

1. Replace desktop-owned built-in connector duplication with shared factory-backed registrations.
2. Make `packages/connectors` the source of truth for built-in connector definitions.
3. Keep the bundled catalog discoverable by default, but now sourced from shared package definitions.
4. Preserve Phase 19 install-before-use behavior and current UI-visible state semantics.
5. Keep enough fixture support for dev catalogs and tests without reintroducing metadata drift.
6. Add regression coverage that proves built-ins are now created through the shared factory path.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
