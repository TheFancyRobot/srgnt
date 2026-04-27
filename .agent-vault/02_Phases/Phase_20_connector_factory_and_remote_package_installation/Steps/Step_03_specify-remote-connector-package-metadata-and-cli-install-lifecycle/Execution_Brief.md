# Execution Brief

## Why This Step Exists

- The repo can already fetch remote manifest JSON in development, but there is no durable package record or CLI installation lifecycle yet.
- Without a clear install lifecycle, Step 04 would invent persistence and trust behavior ad hoc.
- This step turns “remote package” from an idea into a concrete record model that a junior developer can persist, validate, inspect, and clean up.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01]].
- Review existing dev catalog/package fixtures and current install-state persistence.
- Assume the user-approved v1 default: CLI install uses an explicit package URL/reference only, not catalog-first discovery.

## Relevant Code Paths

- `packages/desktop/dev-connectors/catalog.json`
- `packages/desktop/dev-connectors/packages/*.json`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/connectors/manifest.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`

## Execution Prompt

1. Define the remote package metadata record and decide whether it should be a separate schema from `ConnectorManifest`.
2. The durable installed-package record must include at least: source URL/reference, package id, connector id, package version, runtime API version or range, host SDK compatibility, integrity/checksum fields, install root/path, installedAt, verification status, activation status, and last failure state.
3. Specify the CLI-only command set for v1: `install`, `remove`, `list`, and `inspect`.
4. Define canonical install/runtime lifecycle states clearly and align them with the phase invariants: installed, verified, activated, loaded, connected, and error. If additional diagnostic sub-states such as fetched or broken/disabled are needed, define them as transitional or explanatory metadata rather than replacing the canonical states.
5. Define fail-closed behavior for ID mismatch, bad checksum, incompatible SDK/runtime, malformed entrypoint, interrupted install, and uninstall cleanup.
6. Make the user-visible lifecycle explicit enough that a future UI can manage the same durable records without migration.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle|STEP-20-03 Specify remote connector package metadata and CLI install lifecycle]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
