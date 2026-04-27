# Execution Brief

## Why This Step Exists

- This is where the factory contract and CLI install design become a real runtime subsystem.
- It is also the main security boundary: third-party connector packages must not execute in renderer/preload or gain broad unmediated Electron access.
- Without this step, Phase 20 remains a planning exercise rather than an actual pluggable package platform.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02]] and [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle|STEP-20-03]].
- Re-read [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016]] before implementation.
- Review current connector IPC/install handlers and settings persistence.

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/ipc/contracts.test.ts`
- `packages/connectors/src/sdk/connector.ts`
- `packages/connectors/src/index.ts`

## Execution Prompt

1. Implement a managed package registry that stores durable installed package records separate from simple connector install intent.
2. Build the third-party loader path around a worker/subprocess boundary, not direct Electron main execution.
3. Add a fail-closed loader handshake that validates package compatibility, integrity, and entrypoint shape before activation.
4. Ensure renderer/preload only receive high-level connector/package state and never executable package access.
5. Keep install, verified, activated, loaded, connected, and error states independently derivable for diagnostics and future UI surfaces.
6. Make uninstall cleanup remove runtime state and managed artifacts cleanly.
7. Add focused tests for mismatched IDs, incompatible versions, failed worker/subprocess startup, failed load handshake, restart recovery, and uninstall cleanup.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
