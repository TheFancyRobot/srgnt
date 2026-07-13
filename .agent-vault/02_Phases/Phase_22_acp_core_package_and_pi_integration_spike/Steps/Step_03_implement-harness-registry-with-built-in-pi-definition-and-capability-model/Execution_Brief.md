# Execution Brief

## Why

- The registry is where "per-harness knowledge is data, not code" becomes real. Pi is the first entry; everything Phase 25/26 adds (opencode, custom, registry imports) reuses this exact model.

## Prerequisites

- STEP-22-01 (capability model exists in `acp/`).
- Local ground truth (2026-07-10): pi 0.80.5 on PATH at `~/.nvm/versions/node/v24.15.0/bin/pi`; adapter `pi-acp` ~0.0.31 runs via `npx pi-acp@<version>`. Re-verify versions on execution day and pin what you verify.

## Likely Code Paths

- `packages/harness/src/registry/` — `builtins.ts` (Pi definition), `registry.ts` (lookup, merge, list), `detect.ts` (binary presence + `pi --version` probe with timeout).
- Pi definition shape (contracts HarnessDefinition): `{ id: 'pi', displayName: 'Pi', launch: { command: 'npx', args: ['pi-acp@<pinned>'] }, source: 'builtin', quirks: [], capabilityOverrides: {}, installHint: 'npm i -g @mariozechner/pi && npx pi-acp', docsUrl: ... }` — quirks stay empty until the STEP-22-05 spike measures them; do not pre-assume gaps.
- `effectiveCapabilities(negotiated, definition)` — overrides can only *restrict or annotate*, never fabricate a capability the agent didn't advertise.

## Execution Checklist

1. Implement the registry with unit tests for merge precedence (negotiated ∩ overrides) and unknown-id lookup failure.
2. Implement detection with a timeout and a clear NotInstalled result (this feeds onboarding later).
3. Add an integration test that launches the real Pi definition end to end (initialize + capability capture), guarded by an env check (`SRGNT_IT_PI=1`) so CI without pi skips it cleanly.
4. Record the pinned `pi-acp` version and captured capability payload in Implementation Notes — STEP-22-05 compares against it.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
