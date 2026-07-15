# Implementation Notes

- **ESM/CJS boundary (desktop-main → harness):** desktop-main is compiled CommonJS but already imports `effect` (ESM); `@srgnt/harness` (ESM, `type: module`) resolves under `moduleResolution: node` via its top-level `main`/`types` fields, so `import { AcpAgentConnection, Supervisor, piDefinition } from '@srgnt/harness'` typechecks and runs. The `./testing` *subpath* export does NOT resolve under node10, so the mock bin is spawned by a path derived from `require.resolve('@srgnt/harness')` (+ `ELECTRON_RUN_AS_NODE=1`), not imported.
- **Console architecture:** `packages/desktop/src/main/dev-console/session-controller.ts` (`DevSessionController` — one fresh `Supervisor` per session so each handle is kill-tree'd on dispose; handles are console-local ids, not ACP session ids, so repeated mock sessions with a fixed ACP id never collide) + `index.ts` (`registerDevConsoleHandlers` — `dev:console:enabled` always registered; `dev:session:*` only when flag on; returns a disposeAll teardown wired to `app.on('will-quit')`).
- **Flag gating:** `SRGNT_DEV_CONSOLE=1`. Renderer `DevConsoleGate` queries `devConsoleEnabled()` and renders nothing on false/reject → `data-testid="dev-console"` absent by default (asserted in `e2e/app.spec.ts`).
- **Spike frame capture:** a recording spawner wrapping `childProcessSpawner` tees every `AnyMessage` (both directions) via `TransformStream` — parsed JSON-RPC frames, enough for evidence.
- **pi-acp reachability:** default model was the local LAN llama-server (`cathulu`, HTTP 200) — free + fast, so the live spike spent zero cloud tokens on trivial prompts.
- **New pi-acp detail beyond STEP-22-03:** `initialize` advertises `sessionCapabilities.list` (session/list supported) + an `authMethods` `pi_terminal_login`; `session/load` surfaces model + thinking-level (`session/set_mode`) config.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
