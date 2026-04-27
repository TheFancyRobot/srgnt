# Implementation Notes

- Highest-risk area: remote install becoming arbitrary code execution in privileged Electron surfaces.
- Existing desktop tests already cover install-before-connect behavior but do not yet cover managed package registry or isolated runtime failure handling.
- A junior developer should start this step by drawing the activation state machine and matching each state transition to a test.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
