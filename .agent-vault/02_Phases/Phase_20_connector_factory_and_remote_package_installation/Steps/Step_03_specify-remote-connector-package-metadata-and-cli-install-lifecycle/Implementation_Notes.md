# Implementation Notes

- Evidence to preserve: current install flow validates manifest shape and package ID, but not executable package integrity or host compatibility.
- Existing durable persistence only stores `connectors.installedConnectorIds`; that is insufficient for this step.
- A junior developer should start by writing an example installed-package record and confirming every field has an owner and lifecycle transition.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_03_specify-remote-connector-package-metadata-and-cli-install-lifecycle|STEP-20-03 Specify remote connector package metadata and CLI install lifecycle]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
