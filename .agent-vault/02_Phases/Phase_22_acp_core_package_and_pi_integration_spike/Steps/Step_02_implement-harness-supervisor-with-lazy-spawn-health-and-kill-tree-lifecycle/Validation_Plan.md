# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — supervisor suite (uses fake agent fixtures, no real harness needed; CI-safe).

## Acceptance Checks

- Lazy: constructing a handle spawns nothing; first `ensureRunning()` spawns exactly once; concurrent `ensureRunning()` calls coalesce (no double spawn race).
- Kill-tree: parent + grandchild both dead after dispose; no ESRCH crash if already exited.
- Idle reap: with a short timer, process dies after inactivity and `ensureRunning()` respawns transparently.
- Crash: exit mid-operation yields a crash event with stderr tail; restart policy respects backoff cap and gives up cleanly after N attempts.
- `disposeAll()` under 10 concurrent handles completes without leaks (`ps` sweep in test).

## Edge Cases

- Spawn ENOENT (binary missing) → typed SpawnFailed, not an unhandled rejection — this is the everyday "harness not installed" path the UI will render.
- Process that ignores SIGTERM → SIGKILL after the grace window (test with a trap-SIGTERM fixture).
- Double dispose / dispose during spawning — idempotent, no dangling timers (vitest leak detection clean).

## Regression Expectations

- None outside `@srgnt/harness` — this step touches no desktop code.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle|STEP-22-02 Implement harness supervisor with lazy spawn health and kill-tree lifecycle]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
