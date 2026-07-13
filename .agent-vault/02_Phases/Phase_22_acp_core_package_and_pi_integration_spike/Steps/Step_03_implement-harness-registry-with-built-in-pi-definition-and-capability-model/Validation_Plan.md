# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` (unit: merge/lookup/detect with fake binaries).
- `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test` (integration: real Pi initialize round-trip — run locally, skipped in CI).

## Acceptance Checks

- Registry-launched Pi completes `initialize`; the negotiated capability payload is captured and matches the recorded fixture shape.
- Effective-capability merge: an override can disable a negotiated capability; an override cannot enable a non-negotiated one (unit-tested both directions).
- Detection distinguishes: installed+working / installed-but-probe-failed / not installed — three distinct typed results.

## Edge Cases

- `npx` cold cache: first `npx pi-acp` download can take >10s — launch timeout must accommodate or the definition should prefer a resolved local install when present.
- Version probe against a PATH shim that hangs — probe timeout kills the probe process (no orphan).
- nvm-managed PATHs differ between shells — detection must use the app's actual env, and the brief for Phase 25's settings UI covers per-harness path overrides for exactly this case.

## Regression Expectations

- None outside `@srgnt/harness`.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
