# Validation Plan

## Primary Acceptance Check

Fresh-profile E2E completes onboarding to a working session with ONLY the mock agent
"installed": the harness-detection step renders opencode/pi as `not-installed` with
install hints, the mock agent as `ok`, and the walkthrough opens a working ChatView
session. This is the phase acceptance criterion "Fresh-machine onboarding: detects
installed harnesses, guides install for missing ones, creates workspace, and lands the
user in a working first session."

## Commands

- Unit: `pnpm --filter @srgnt/desktop test` (Onboarding.test.tsx + main.tsx flow
  tests; add cases for each detection state and for the walkthrough step).
- Detection unit: `pnpm --filter @srgnt/harness test` — `detect.test.ts` already
  covers the three states via injected `VersionProbe`; add coverage only if you touch
  `detect.ts` (prefer not to).
- E2E: `pnpm --filter @srgnt/desktop test:e2e` (runs `app.spec.ts`,
  `gfm-compliance.spec.ts`, `ui-coverage-matrix.spec.ts`, `bug-0013-visual.spec.ts`).
- Packaged smoke: `pnpm test:e2e:packaged:linux` (Linux only; self-skips elsewhere).
- Typecheck: `pnpm --filter @srgnt/desktop typecheck`.

## Fixture Updates Required (do these or E2E fails)

- `packages/desktop/e2e/fixtures.ts`: `waitForDesktopReady` polls for the
  "Create Your Workspace" heading; `completeOnboarding` clicks
  "Use Default Location" → "Next", expects "You're All Set" → "Get Started", then
  asserts the Notes activity item `aria-pressed=true` and an "Explorer" heading.
  When you add the detection + walkthrough steps, extend `completeOnboarding` to
  advance through them (Next past detection; finish the walkthrough) and keep the
  final assertion (lands in the app) intact.
- `packages/desktop/e2e/packaged.spec.ts`: asserts the first-run heading directly.
  Update to match any renamed first step.
- To simulate "no real harness installed" deterministically, force detection to see
  no `pi`/`opencode` on PATH. Preferred: run the app with a controlled `PATH` in the
  E2E launch env (extend `getElectronLaunchEnv` in `fixtures.ts`) so probes ENOENT,
  or inject a test probe via an `SRGNT_E2E` branch. Do NOT depend on the CI runner
  happening to lack the binaries.

## Manual Checks

- On a machine WITH `pi` installed: detection shows `ok` + version; selecting Pi in
  the walkthrough surfaces the self-approving-permissions trust badge and the
  "MCP unavailable for Pi / no client fs/terminal mediation" quirks (DEC-0018).
- Kill/rename a harness binary to a hanging shim to observe `probe-failed`/timeout
  (the 10 s probe timeout should render as "probe failed", not hang the wizard).
- "Skip setup" still works and lands the user via the default-workspace path.

## Edge Cases / Failure Modes

- Detection is slow (10 s per hung probe): the wizard must stay responsive and show a
  "checking…" state; probes run concurrently, not serially, so worst case is ~10 s
  not N×10 s.
- No harness at all (not even mock resolvable): walkthrough must still finish and
  land in the app; the chat session simply isn't pre-opened. Never trap the user.
- `probe-failed` (binary present, version unreadable): show "installed but couldn't
  verify" + the PATH hint, treat as usable-with-caveat, not as installed-ok.

## Regression Expectations

- The three known baseline E2E failures are unrelated to onboarding and must not grow:
  (1) `app.spec` "exercises preload APIs" PTY `posix_spawnp`; (2) `gfm-compliance`
  ATX-heading `.cm-header-*` classes; (3) `bug-0013-visual` Linux-only packaged binary
  ENOENT on macOS. Record the pass/fail count so STEP-29-05 can re-audit them.
- Notes, Terminal, Settings navigation must remain reachable post-onboarding.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough|STEP-29-01 Rewrite onboarding with harness detection and first-session walkthrough]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
