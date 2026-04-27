# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- `window.srgnt` exposes the full connector lifecycle needed by the renderer.
- Top-level renderer state can install, uninstall, connect, disconnect, and refresh connectors without abusing generic settings persistence.
- Types stay aligned across main, preload, and renderer.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] remains the architecture contract: preload is the only renderer-accessible desktop boundary.
- Preload is the only renderer-accessible desktop boundary.
- Keep connector lifecycle methods explicit; avoid overloading `saveDesktopSettings()` with install semantics unless the persisted install record is intentionally being edited.
- Prefer targeted state refresh after connector actions over full reload gymnastics, as long as correctness stays clear.

**Starting files and likely touch points:**
- `packages/desktop/src/preload/index.ts` for exposed methods and bridge types.
- `packages/desktop/src/renderer/env.d.ts` for the `SrgntAPI` contract.
- `packages/desktop/src/renderer/main.tsx` for bootstrapping, refresh helpers, and connector action callbacks.
- Step 04-presentational components only where callback props or prop types need final wiring.

**Constraints and non-goals:**
- Do not expose main-process internals or secret-bearing state in preload.
- Do not regress existing non-connector settings flows.
- Do not keep dead toggle-era code paths around if they create contradictory behavior.
- Do not change install semantics inside tests without also updating the contract surface.

**Edge cases and failure modes:**
- Renderer refresh after workspace switch must not resurrect stale installed state from the previous workspace.
- Install followed by immediate connect should work in sequence and refresh accurately.
- Uninstall from a connected state must leave the UI in a clean available/uninstalled state.
- Failed install/connect actions should surface safe errors and leave state coherent.

**Security:**
- Renderer sees only safe summary state and action methods.
- Preload must not leak token/session material or privileged filesystem details beyond existing safe APIs.

**Performance:**
- Avoid unnecessary double-fetches where one targeted refresh is enough, but prefer correctness over micro-optimization.
- Keep connector refresh logic centralized so future connector growth does not multiply networkless IPC chatter unnecessarily.

**Validation:**
1. `pnpm -C packages/desktop typecheck`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke in desktop app:
   - launch fresh workspace
   - install connector
   - connect connector
   - disconnect connector
   - uninstall connector
   - confirm UI and settings remain coherent at each step

**Junior-readiness verdict:** PASS — the main challenge is tracing renderer state flow, but the starting files and action matrix are now explicit.

### Readiness packet (handoff)

- **Starting files:** `packages/desktop/src/preload/index.ts`, `packages/desktop/src/renderer/env.d.ts`, `packages/desktop/src/renderer/main.tsx`, plus Step 04 callback props in `ConnectorStatus.tsx` / `ConnectorsSidePanel.tsx` / `Settings.tsx`.
- **Success condition:** `window.srgnt` exposes install/uninstall/connect/disconnect methods; renderer state refreshes truthfully after each action without auto-install semantics in settings paths.
- **Blockers:** none within the note’s scope; unresolved dependency is external if Step 03 API contracts are incomplete or differ from described naming.
- **Edge/failure cases to validate:** workspace-switch state resurrection, rapid install→connect sequence, uninstall while connected, IPC error propagation, stale UI if refresh logic fails.
- **Validation expectations:** desktop typecheck + filtered desktop tests + manual install/connect/disconnect/uninstall smoke flow with coherent state after each action.
- **Downstream effect:** completes the contract boundary so Step 06 can lock invariants with tests against real payload shapes.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_05_align-preload-bridge-and-renderer-contracts-with-new-connector-pluggability-model|STEP-19-05 Align preload bridge and renderer contracts with new connector pluggability model]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
