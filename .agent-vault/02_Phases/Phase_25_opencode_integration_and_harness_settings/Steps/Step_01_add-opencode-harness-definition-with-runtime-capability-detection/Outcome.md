# Outcome

- Record the final result, validation performed, and explicit follow-up here.

## Result

Done. opencode ships as a built-in `HarnessDefinition` (`opencode acp`, zero quirks, zero overrides) beside pi; capabilities are runtime-observed only, with `initialize` as the baseline and session-discovered fields merged in; the merged pair is persisted per harness in `harness-capabilities.json` at the workspace root, keyed by a fingerprint of the effective definition.

## Validation performed

- `pnpm --filter @srgnt/contracts test` - 186 passed (7 files).
- `pnpm --filter @srgnt/harness test` - 136 passed, 3 skipped (both ITs skip with no env vars).
- `pnpm --filter @srgnt/runtime test` - 454 passed (23 files), incl. 14 capability-cache tests.
- `pnpm --filter @srgnt/desktop test` - 1174 passed (66 files).
- `SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode` - passed; `initialize` + one real prompt turn to `end_turn` against opencode 1.18.18. Fixtures written to `packages/harness/src/testing/fixtures/opencode/`.
- `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test registry/pi.integration` - passed; live pi-acp run now reports `sessionList: true` and the full `pi_terminal_login` method (`type: "terminal"`, `args: ["--terminal-login"]`), confirming the capability extension against a real agent.
- `pnpm lint` and `pnpm build` at repo root - both clean; the `@srgnt/harness` boundary check still passes (no Electron imports, no disk writes).

## Follow-up

- **STEP-25-02:** `detectHarness` is the generic probe the settings UI consumes; the nvm-global PATH caveat (GUI-launched Electron cannot see `opencode`/`pi` without a login shell) still needs the binary-path override.
- **STEP-25-03:** consume `HarnessCapabilityCache.get()` - a `stale` result is the "re-connect to refresh" row. The auth panel must not assume pi's machine-actionable method shape; opencode's is description-only.
- **STEP-25-04:** the `configOptions`-vs-`modes` divergence, the unmodeled `session/close`/`session/fork`, and the auth-metadata asymmetry are the concrete Phase-26 generic-support requirements this step measured.
- Left unmeasured on purpose (needs a tool-invoking probe, i.e. real tokens): opencode's `session/request_permission` round-trip, live `session/load`/`session/resume`, MCP passthrough.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
