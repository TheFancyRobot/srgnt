# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — full scenario matrix in-process + subprocess smoke subset + fixture decode suite.

## Acceptance Checks

- Every directive type has at least one passing scenario; the permission directive branches on allow vs reject responses.
- Crash and malformed scenarios produce the wrapper's typed errors (ties back to STEP-22-01's taxonomy).
- The mock agent runs standalone: `node dist/testing/mock-agent/bin.js --scenario stream.json` speaks valid ACP over stdio (verified by launching it via the registry as a custom definition).
- Recorded Pi fixtures decode with zero errors through tolerant readers; unknown fields are preserved/ignored per the ARCH-0009 invariant, asserted explicitly.

## Edge Cases

- Scenario with out-of-order `tool_call_update` (update for unknown call id) — mock can emit it; wrapper behavior pinned by test.
- Very large single chunk (≥1MB) — no frame-size explosion in the wrapper.
- Recorder must redact absolute home paths in fixtures before commit (fixtures are in git; no machine-identifying paths).

## Regression Expectations

- None outside `@srgnt/harness`; committed fixtures are additive.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_04_build-scriptable-mock-acp-agent-and-recorded-traffic-fixture-tests|STEP-22-04 Build scriptable mock ACP agent and recorded-traffic fixture tests]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
