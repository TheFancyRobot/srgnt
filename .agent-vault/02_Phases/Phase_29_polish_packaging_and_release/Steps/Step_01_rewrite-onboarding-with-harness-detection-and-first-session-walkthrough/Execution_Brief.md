# Execution Brief

## Why This Step Exists

Onboarding still reflects the pre-pivot aggregator: STEP-21-02 slimmed it to two
generic steps (workspace + "you're all set") with no mention of harnesses, agents,
or a first chat session. The product is now an ACP coding-agent command center, so a
fresh-machine user must leave onboarding (a) with a workspace, (b) knowing whether an
agent harness (Pi, opencode, or any registry-known agent) is actually installed and
usable, and (c) having seen a working first session. Without this, a new user lands on
an empty Notes view with no path to the core feature. This is the first step of the
release phase because every later step (settings, packaging smoke, docs, release
rehearsal) assumes onboarding lands the user in a working session.

## What "Done" Looks Like

- Onboarding gains a harness-detection step between workspace setup and the finish
  screen. It runs the registry detection probes and renders one of the three typed
  `DetectionResult` states per known harness: `ok` (binary + version found),
  `probe-failed` (found but `--version` timed out / non-zero / no output), and
  `not-installed` (ENOENT / not on PATH).
- For `not-installed` / `probe-failed`, the UI shows an install hint (e.g. how to
  install `pi`, how to install opencode) instead of a dead end. Detection must never
  block completion — a user with only the mock agent "installed" can still finish.
- A first-session walkthrough hands the user into a working chat session (built in
  Phase 23) using the best available harness, defaulting to the deterministic mock
  agent when no real harness is present (no spend, deterministic for E2E).
- Honest-capability framing per DEC-0018 is surfaced where a real harness is chosen:
  for Pi, show the informational self-approving-permissions trust badge and the
  "MCP unavailable / no client fs/terminal mediation" quirks — these are the
  built-in definition's declared `quirks` + `capabilityOverrides`, not new copy.

## Prerequisites

- Phase 23 (chat UI v1 over ephemeral ACP sessions) is the hard dependency: the
  "first session" the walkthrough opens is the ChatView + Composer + session
  controller built there. If Phase 23's chat surface does not exist yet, this step
  cannot land its walkthrough and must not be started. STEP-29-01's `depends_on` in
  the vault currently lists nothing but Phase 23/25 are the real upstream — treat
  them as blocking (see Decision-needed below).
- Phase 25 (`opencode` integration + harness settings) provides the registry entries
  and the CapabilityMatrix UI patterns the detection step should mirror
  (`packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx`,
  `packages/harness/src/registry/registry.ts`, `builtins.ts`).
- Read DEC-0018 for the exact honest-capability consequences (Pi self-approves;
  MCP injection unavailable for Pi; no client fs/terminal delegation for Pi).

## Relevant Code Paths (shipped today)

- `packages/desktop/src/renderer/main.tsx` — the REAL onboarding flow is defined
  inline here as `onboardingFlow` (a `useMemo`, lines ~220-253), NOT in
  `Onboarding.tsx`'s exported `defaultOnboardingSteps` (that export is legacy/unused).
  The flow currently has two steps: `workspace` ("Create Your Workspace", with a
  `Use Default Location` secondaryAction) and `ready` ("You're All Set"). Add the
  detection + walkthrough steps here.
- `packages/desktop/src/renderer/components/Onboarding.tsx` — `OnboardingWizard`,
  `OnboardingStep`/`OnboardingFlow` types. `secondaryAction`, `note`, `requiresAction`,
  `isComplete`, and per-step `icon`/`stepIcons` support already exist (STEP-21-01).
  A new step id needs a matching entry in `stepIcons` or it falls back to the
  workspace icon.
- `packages/harness/src/registry/detect.ts` — `detectCommand(command, opts)` and
  `detectPi()` return the three-state `DetectionResult`. Probes run
  `<command> --version` with a 10 s timeout and kill the process tree on timeout.
  Detection must run in the MAIN process (Node child_process), exposed to the
  renderer over IPC — never spawn from the renderer.
- `packages/harness/src/registry/registry.ts` + `builtins.ts` — the set of
  registry-known harnesses (pi, opencode, mock) whose `command` fields feed detection.
- IPC wiring: detection results cross from main to renderer. Add a channel in
  `packages/contracts/src/ipc/contracts.ts` and a handler in
  `packages/desktop/src/main/services/harnesses.ts` (created in Phase 25) or a new
  `main/services/onboarding.ts`; expose via `packages/desktop/src/preload/index.ts`.

## Smallest Execution Checklist

1. Confirm Phase 23 ChatView + Phase 25 registry/harness services exist on the branch.
   If not, stop and record the blocker — do not stub a fake session.
2. Add a main-process IPC endpoint that runs registry detection for all known
   harnesses and returns `DetectionResult[]` (reuse `detectCommand`; do not
   re-implement probing). Cache within the onboarding session; detection can be slow.
3. Insert a `harnesses` onboarding step in `main.tsx`'s `onboardingFlow`, rendering
   per-harness state rows (ok/probe-failed/not-installed) with install hints. Add its
   `stepIcons` entry. `requiresAction: false` — never block completion on a missing
   harness.
4. Insert a `first-session` walkthrough step that opens a ChatView session against
   the best available harness (mock when none real). Surface the DEC-0018 Pi trust
   badge / quirks when Pi is the chosen harness.
5. Update the e2e fixtures and packaged smoke IN LOCKSTEP (see Validation Plan) —
   the heading strings are asserted verbatim.
6. Keep the change minimal: extend the existing wizard/step model, do not invent a
   new onboarding framework.

## Integration Touchpoints / Downstream Effects

- `packages/desktop/e2e/fixtures.ts` — `waitForDesktopReady` and `completeOnboarding`
  hard-code the heading strings "Create Your Workspace", "You're All Set", the
  "Use Default Location" / "Next" / "Get Started" buttons, and assert the Notes
  activity item ends `aria-pressed=true` with an "Explorer" heading. Any new steps or
  renamed headings break these helpers and every spec that imports them
  (`app.spec.ts`, `packaged.spec.ts`, etc.). Update the helper to walk the new steps.
- `packages/desktop/e2e/packaged.spec.ts` — independently asserts the
  `Create Your Workspace` heading on first run; update in lockstep.
- STEP-29-02 (settings consolidation) and STEP-29-04 (docs) both describe the
  onboarding flow; keep them consistent with whatever this step ships.

## Assumptions / Decision-Needed

- ASSUMPTION: the "first session" uses the mock agent by default so fresh-machine
  E2E is deterministic and spend-free; a real harness is used only if detected and
  the user opts in. (Matches the dev-console default in STEP-22-05.)
- ASSUMPTION: detection covers only registry-known harnesses (pi, opencode, mock),
  not arbitrary PATH scanning.
- DECISION-NEEDED: the vault `depends_on` for STEP-29-01 is empty, but Phase 23
  (chat) and Phase 25 (registry/harness settings) are true blockers. Recorded here
  and in the step Human Notes; the executing engineer should confirm both phases are
  merged before starting. Non-blocking for refinement; blocking for execution.
- DECISION-NEEDED: whether the walkthrough auto-sends a first prompt or just opens an
  empty composer. Default assumption: open the composer with a suggested prompt the
  user must send (no auto-send), consistent with Phase-24's never-auto-send prefill
  convention.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_01_rewrite-onboarding-with-harness-detection-and-first-session-walkthrough|STEP-29-01 Rewrite onboarding with harness detection and first-session walkthrough]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]]
