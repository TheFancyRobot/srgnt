# Outcome

- Success means the desktop host can manage installed connector packages safely and produce connector instances without collapsing trust boundaries.
Completed 2026-04-19 through the claude-opus session.

- Introduced `packages/desktop/src/main/connectors/` module with `ManagedPackageRegistry`, `SafePackageLoader`, `ConnectorPackageHost`, and `createWorkerSpawn`/`nullSpawn` runtime factories.
- Added `packages/contracts/src/connectors/loader-handshake.ts` defining the fail-closed host<->runtime handshake contract (protocol version 1) with structured success/failure payloads.
- Wired `main/index.ts` to seed the host from persisted settings, apply restart recovery, and flush registry mutations through `writeDesktopSettings`. Renderer/preload continue to receive only high-level typed state from the `ConnectorListResponse` shape; the new host's `describePackage` family is ready for the Step 05 IPC handlers without leaking sourceUrl/installedAt/minHostVersion.
- 38 new tests covering registry CRUD, loader fail-closed paths (spawn failure, handshake timeout, malformed payload, ID mismatch, SDK mismatch, capability denial, errored-package refusal), host orchestration (activate, load, connect, crash, uninstall, restart recovery), and settings persistence round-trip.
- Validation: contracts 295/295, connectors 84/84, desktop 892/892, desktop typecheck clean.
- Follow-ups for Step 05: bundle a real `connector-runtime-worker.js` entrypoint, wire CLI commands to the new host APIs, and harmonize `sourceUrl` vs `packageUrl` naming.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
