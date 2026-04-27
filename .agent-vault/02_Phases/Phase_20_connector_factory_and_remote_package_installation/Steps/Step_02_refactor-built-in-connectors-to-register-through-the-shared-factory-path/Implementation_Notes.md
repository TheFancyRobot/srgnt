# Implementation Notes

- Evidence to preserve: desktop main currently carries built-in connector metadata separately from `packages/connectors`.
- Existing strong regressions live in connector package tests plus desktop IPC/e2e suites.
- A junior developer should diff `packages/desktop/src/main/index.ts` before and after this step to confirm duplication actually shrank.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_02_refactor-built-in-connectors-to-register-through-the-shared-factory-path|STEP-20-02 Refactor built-in connectors to register through the shared factory path]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
