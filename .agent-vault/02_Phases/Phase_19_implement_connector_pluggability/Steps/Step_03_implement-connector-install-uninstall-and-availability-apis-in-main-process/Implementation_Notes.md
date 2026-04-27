# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- `connector:install` and `connector:uninstall` exist as first-class desktop APIs.
- `connector:list` and `connector:status` reflect catalog discoverability separately from installation.
- `connector:connect` and `connector:disconnect` no longer implicitly install or uninstall connectors.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] remains the architecture boundary: catalog/install actions may cross preload, but auth/session secrets stay in main.
- Install is a workspace configuration change; connect is a runtime/auth change.
- Uninstall should clear runtime state that would mislead the UI (connected status, last sync, last error, entity counts) unless a stronger reason is documented.
- Unknown or uninstalled connector IDs must fail closed with a clear main-process error.

**Starting files and likely touch points:**
- `packages/contracts/src/ipc/contracts.ts` for channel definitions.
- `packages/desktop/src/main/index.ts` for handler registration, connector state derivation, and guard logic.
- `packages/desktop/src/main/settings.ts` only if helper functions are needed for install-state persistence.
- Existing tests near `packages/contracts/src/ipc/contracts.test.ts` and `packages/desktop/src/main/settings.test.ts`.

**Constraints and non-goals:**
- Do not expose secrets or auth session details to the renderer.
- Do not let install automatically call connect/auth.
- Do not let uninstall silently leave a connector marked connected.
- Do not wire preload or renderer yet; that is Step 05.

**Edge cases and failure modes:**
- Installing an already installed connector should be idempotent.
- Uninstalling an uninstalled connector should be safe and explicit.
- Connecting before install must fail predictably.
- Workspace-not-set and settings-write-failure paths must leave runtime state consistent.

**Security:**
- Main process remains the only place that can mutate install state and future auth state.
- Errors returned to the renderer should be safe and non-secret.

**Performance:**
- Recompute only the small connector state map; no reason for heavyweight reload work.
- Prefer deterministic helper functions that can be unit tested without booting Electron windows.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke via desktop app or handler-level harness:
   - install connector -> listed as installed but disconnected
   - connect installed connector -> connected
   - uninstall connected connector -> listed as available/uninstalled and no longer connected
   - connect uninstalled connector -> rejected

**Junior-readiness verdict:** PASS — the step is small enough if the implementer keeps install and connect semantics separate.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_03_implement-connector-install-uninstall-and-availability-apis-in-main-process|STEP-19-03 Implement connector install/uninstall and availability APIs in main process]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
