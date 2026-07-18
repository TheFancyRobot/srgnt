# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `SConformanceReport` + IPC schemas.
- `pnpm --filter @srgnt/harness test` — conformance runner unit suite against mock scenarios (must be green with NO real agent installed).
- `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test` — gated real-Pi conformance IT (needs `pi` on PATH; generous timeout, npx cold-cache).
- `SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test` — gated opencode IT if installed (optional but valuable second data point).
- `pnpm --filter @srgnt/desktop test` / `test:e2e` — IPC service + report UI + mock-driven e2e (add spec to the `test:e2e*` file lists).

## Acceptance Checks

- **Mock full-pass:** a scenario advertising loadSession/images/modes with permission + terminal directives → every deterministic check `pass`; report carries the negotiated row, update-kind distribution, and zero suggested quirks.
- **Real Pi (gated):** report reproduces the spike findings as structured results — `loadSession` supported, resume `not-supported`, MCP passthrough deep-probe fails → suggests `mcp-passthrough-gaps` (matching the quirk the built-in already declares), permission deep-probe observes self-approval → suggests `permission-routing-gaps`. This equivalence (report ↔ spike report) is the step's core validation per the step note.
- **Not-installed definition:** detect check fails with `not-installed`; every other check reports `skipped`, not `fail`; total runtime under a couple of seconds (no pointless spawn attempts).
- **Auth-required path:** mock `authRequired` scenario → auth check reports the advertised methods, `session/new` failure is classified as auth-required (using the error shape verified in STEP-25-03 — assert on that exact shape), downstream checks `skipped`, runner exits cleanly.
- Exported JSON decodes via `SConformanceReport`; re-importing/re-rendering it shows the identical report (export is lossless).
- Every check result in the UI names the ACP method it exercised and shows its evidence payload on expand.

## Edge Cases

- Hung agent (`hang-probe.mjs` as the launch command): initialize check times out → `fail` with timeout detail; process tree killed; no orphan remains (assert on PID liveness, the detect-module discipline).
- Mid-turn crash (mock `crash` directive): prompt check `fail` with ConnectionLost evidence; teardown check still runs and reports.
- Malformed frames (stdio bin `emit_malformed`): runner survives, reports the protocol violation as evidence, never throws to the caller.
- Cancel never honored (scenario without `expect_cancel` handling): cancel check times out → `fail` finding, run continues to teardown.
- Two concurrent runs against the same definition (double-click): second run rejected or queued — never two spawned probes writing one report.
- Deep-probe toggle off: checks 8–9 report as `skipped` with "deep probe not run" copy — never silently absent from the report.

## Regression Expectations

- Mock-agent suites (`mock-agent.test.ts`, `mock-agent.subprocess.test.ts`) untouched and green — the runner consumes the mock, it must not fork it.
- Existing gated Pi ITs (`pi.integration.test.ts`, `pi-spike.integration.test.ts`) still pass — the spike test is historical evidence, leave it intact.
- Chat session flows unaffected (the runner uses its own connections, never a live session's).
- `pnpm build` green.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator|STEP-26-02 Build ACP conformance smoke-runner as harness validator]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
