# Execution Brief

## Why This Step Exists

- The user explicitly wants remote installation by CLI first.
- The platform is not shippable until the management workflow and failure cases are validated end to end.
- Existing tests cover built-in connector install/connect UX, but not the new third-party package registry, explicit URL installs, or isolation failure paths.

## Prerequisites

- Complete [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04]].
- Review the final package registry shape, lifecycle states, and any new host APIs or IPC contracts added earlier in the phase.
- Confirm where the new CLI entrypoint will live, because no connector package-management CLI exists in the repo today.

## Relevant Code Paths

- New CLI entrypoint files added by this phase
- `package.json`
- `TESTING.md`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/connector-ipc.test.ts`
- `packages/desktop/src/main/settings.test.ts`
- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/dev-connectors/`
- `packages/desktop/e2e/app.spec.ts`
- `packages/desktop/e2e/ui-coverage-matrix.spec.ts`
- `packages/desktop/e2e/packaged.spec.ts`

## Execution Prompt

1. Add a CLI-only management workflow for explicit package URL/reference installs with `install`, `remove`, `list`, and `inspect` commands.
2. Route CLI behavior through the same host registry/loader logic created in Step 04; do not create a parallel package-management implementation.
3. Make command output explicit enough to explain install, compatibility, integrity, and activation failures without exposing secrets.
4. Add end-to-end and targeted regression tests for successful install/remove/list/inspect plus the key fail-closed cases.
5. Verify parity where appropriate between bundled connectors and externally installed connectors at the host contract level.
6. Update `TESTING.md` or equivalent docs if new command sequences become required for validation.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_05_add-cli-install-remove-inspect-commands-and-end-to-end-regression-coverage|STEP-20-05 Add CLI install remove inspect commands and end-to-end regression coverage]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
