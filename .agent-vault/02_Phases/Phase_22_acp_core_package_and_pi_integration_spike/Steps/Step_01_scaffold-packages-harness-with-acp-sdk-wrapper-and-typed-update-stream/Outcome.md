# Outcome

- Result: completed. `packages/harness` exists as `@srgnt/harness` (pure Node ESM, zero Electron imports, boundary-enforced) wrapping the SDK's `ClientSideConnection`: injected-spawner connect over stdio, `initialize` capability negotiation into a `NegotiatedCapabilities` model with contracts-driven overrides, typed session methods as Effects, per-session backpressure-safe `session/update` streams (async iterable + Effect Stream), and a five-tag `Schema.TaggedError` taxonomy.
- Validation evidence (2026-07-12/13, all commands foreground):
  - `pnpm --filter @srgnt/harness test`: 25 passed / 0 failed (capabilities.test.ts 5, stream.test.ts 7, connection.test.ts 13) — in-process client↔agent pair covers initialize → session/new → prompt multi-chunk stream → cancel mid-turn through the public API only; every error tag constructed via wrapper paths (spawner rejection, initialize failure, prompt failure, JSON-RPC error response, abrupt stream closure); garbage-frame tolerance pinned; unknown-session warning drop; slow-consumer no-deadlock.
  - `pnpm --filter @srgnt/harness typecheck`: clean. Boundary check: passes clean; exit 1 demonstrated with a deliberate `import 'electron'` (then removed).
  - Root `pnpm lint`: all packages green, harness boundary check included automatically via `pnpm -r`.
  - Root `pnpm build`: green; `packages/harness/dist/acp/*` emitted.
  - Root `pnpm test`: 1197 passed / 0 failed (contracts 127, harness 25, runtime 287, desktop 758).
- Regression scope: only `packages/harness/` (new), `pnpm-lock.yaml`, and vault notes changed — matches the Validation Plan expectation.
- Follow-up: STEP-22-02 replaces `childProcessSpawner`'s naive `child.kill()` with kill-tree lifecycle; migrate off deprecated `ClientSideConnection` at next SDK bump (re-run fixture tests per pin policy); add an update-stream fan-out layer when Phase 23/24 add multiple consumers.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
