# Execution Brief

## Why

- "UI-open ≠ process-running" and "no orphans on quit" are architecture invariants (ARCH-0009). They live or die in this supervisor — every later feature (persistence idle-reaping, groups spawning N members, pipelines) assumes it just works.

## Prerequisites

- STEP-22-01 (connection wrapper takes an injected spawner — the supervisor provides the real one).
- Read the pty service's lifecycle handling (`packages/desktop/src/main/pty/`) — it already solved kill-tree/zombie cases for this repo; port the lessons, not the code (supervisor lives in `@srgnt/harness`, no Electron).

## Likely Code Paths

- `packages/harness/src/supervisor/` — `HarnessProcess` (one child): explicit state machine `idle → spawning → ready → reaping → dead`, spawn via `child_process.spawn` with its own process group (`detached: true` on POSIX so the group can be signalled), stderr capture ring buffer for diagnostics, exit/crash propagation as typed events.
- Kill-tree: POSIX `process.kill(-pid, 'SIGTERM')` then SIGKILL after grace; Windows `taskkill /pid <pid> /T /F` (best-effort; Windows is not first-class until Phase 29 but don't design it out).
- `Supervisor` (many children): map of handles, lazy `ensureRunning()`, idle timer per handle (configurable, default off until Phase 24 wires policy), `disposeAll()` for app quit, restart with capped backoff.

## Execution Checklist

1. Build `HarnessProcess` first with a fake agent (a Node script fixture that echoes ACP frames / sleeps / spawns a grandchild on command).
2. Prove kill-tree: fake agent spawns a grandchild; after `dispose()`, assert neither pid is alive (`ps -p` in test helper).
3. Add the multi-process `Supervisor` with lazy spawn + `disposeAll`; property-test state transitions (fast-check event sequences → no illegal transition).
4. Crash propagation: fake agent `process.exit(1)` mid-turn → typed crash event carries last stderr lines.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_02_implement-harness-supervisor-with-lazy-spawn-health-and-kill-tree-lifecycle|STEP-22-02 Implement harness supervisor with lazy spawn health and kill-tree lifecycle]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
