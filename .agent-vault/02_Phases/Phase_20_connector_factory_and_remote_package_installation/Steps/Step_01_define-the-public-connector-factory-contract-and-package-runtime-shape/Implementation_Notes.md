# Implementation Notes

- Evidence to preserve: `packages/connectors/src/sdk/connector.ts` currently exposes base classes only; no factory/registry abstraction exists.
- Existing validation anchors: `packages/connectors/src/sdk/connector.test.ts` and `packages/contracts/src/connectors/manifest.test.ts`.
- A junior developer should start by writing down the intended exported symbols before editing any code.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01 Define the public connector factory contract and package runtime shape]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
