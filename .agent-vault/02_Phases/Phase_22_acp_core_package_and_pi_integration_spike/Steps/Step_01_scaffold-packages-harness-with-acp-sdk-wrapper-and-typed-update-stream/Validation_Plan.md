# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — in-process client↔agent pair covers initialize → session/new → prompt → update stream → cancel.
- `pnpm --filter @srgnt/harness typecheck && pnpm lint` — boundary check green.
- `pnpm build` — workspace graph builds with the new package.

## Acceptance Checks

- A test creates both `ClientSideConnection` and `AgentSideConnection` over an in-memory duplex, negotiates capabilities, streams a multi-chunk response, and cancels mid-turn — all through the wrapper's public API only.
- Error taxonomy: each tagged error is constructed by a test (spawn failure via injected spawner rejection, protocol error via malformed frame).
- Boundary: adding `import { app } from 'electron'` anywhere in `src/` fails `pnpm lint`.

## Edge Cases

- Agent writes garbage to stdout between frames (some CLIs log to stdout) — wrapper must surface a ProtocolError or tolerate per SDK behavior; pin whichever with a test.
- Update for an unknown sessionId — dropped with a warning event, not a crash.
- Slow consumer: stream buffering must not deadlock the connection read loop (test with an unconsumed stream while prompting).

## Regression Expectations

- No changes outside the new package and root script wiring.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_01_scaffold-packages-harness-with-acp-sdk-wrapper-and-typed-update-stream|STEP-22-01 Scaffold packages/harness with ACP SDK wrapper and typed update stream]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
