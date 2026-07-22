# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop exec playwright test e2e/chat.spec.ts` — the new suite in isolation (after `pnpm --filter @srgnt/desktop build`).
- `pnpm --filter @srgnt/desktop test:e2e` — full standard suite including the chat spec (verify chat.spec.ts is actually in the script's file list).
- Flake check: 3 consecutive green full runs locally; then the Desktop E2E GitHub Actions workflow green on the PR.
- `pnpm --filter @srgnt/desktop test` — scenario-injection seam unit tests.

## Acceptance Checks

- All seven behaviors covered and green: streaming render, tool-card lifecycle incl. `failed`, permission allow AND deny, cancel mid-stream, crash recovery, slash menu, mode switching.
- Agent-side assertions used wherever the scenario supports them: `expect_prompt` for submitted text, `expectOutcome`/`expectOptionId` for permission decisions (a UI that renders right but answers wrong must fail).
- Suite passes with no `pi` binary installed and with network disabled (mock-only; zero LLM cost).
- No bare `waitForTimeout` waits — every wait is an `expect(...)` poll on a locator or a scenario-driven signal.
- Total added suite runtime stays within CI budget (each spec < the 30s Playwright timeout; whole chat suite target < ~4 min on CI workers=1).

## Edge Cases

- Scenario file missing/invalid at launch → controller surfaces a readable session error (unit-tested at the seam) rather than a hung Electron launch.
- Cancel test on a slow CI machine: the observable in-flight window must come from `expect_cancel` blocking the turn, not from timing luck.
- Crash test asserts recovery is *usable*: after "New session", a follow-up prompt round-trips.
- Onboarding interaction: chat specs must run after `completeOnboarding` (fresh `userDataDir` per test) — copy the house pattern, don't assume a workspace exists.

## Regression Expectations

- Existing e2e suites (`app`, `gfm-compliance`, `ui-coverage-matrix`, `bug-0013-visual`) stay green alongside the new spec in one `test:e2e` run.
- `waitForDesktopReady`/`completeOnboarding` helpers unmodified unless the chat panel changed startup flow — if they need edits, run the FULL e2e suite locally before pushing.
- No new env leakage: `SRGNT_MOCK_SCENARIO` unset ⇒ app behavior identical to before this step (default demo scenario only on the mock path).

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
