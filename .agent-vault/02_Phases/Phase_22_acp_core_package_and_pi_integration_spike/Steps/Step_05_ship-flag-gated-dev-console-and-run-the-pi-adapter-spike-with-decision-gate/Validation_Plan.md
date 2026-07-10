# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` (console component + IPC contract tests, mock target).
- Manual: `SRGNT_DEV_CONSOLE=1 pnpm --filter @srgnt/desktop dev` → mock round-trip, then real Pi round-trip.

## Acceptance Checks

- Console completes initialize → new → prompt → streamed updates → cancel against mock AND real Pi; both transcripts saved.
- All four spike probes have recorded outcomes (frames or "never occurred" evidence) in the spike report note.
- The gate decision note exists with: chosen path, evidence per probe, consequences for phases 23/25/27 (especially permission UX and bus tier expectations for Pi), and a revisit trigger (e.g., "revisit if upstream lands native --mode acp").
- Console is invisible without the flag (E2E asserts absence in default runs).

## Edge Cases

- Pi hangs on a prompt (provider outage) — cancel must recover the console without app restart.
- `npx pi-acp` first-run download latency — console shows connecting state, not a frozen UI.
- Guard the spike against expensive prompts: use trivial prompts and a cheap configured model.

## Regression Expectations

- Default (flag-off) app behavior byte-identical; all existing suites green.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
