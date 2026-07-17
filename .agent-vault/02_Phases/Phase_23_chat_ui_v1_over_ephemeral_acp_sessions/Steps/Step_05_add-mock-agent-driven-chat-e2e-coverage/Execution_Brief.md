# Execution Brief

## Why

- The chat surface is the product now; without deterministic E2E it regresses silently. The mock agent exists precisely to be this substrate (ARCH-0009: "the test substrate for every phase") — every behavior steps 01–04 built is scriptable as a scenario, with zero network, zero LLM spend, and real process spawning (the mock runs as a genuine child process through Supervisor + `AcpAgentConnection`, so E2E exercises the whole stack).
- Real-Pi checks stay manual this phase (phase note); CI must never depend on `pi` being installed.

## Prerequisites

- Steps 01–04 merged (all surfaces exist).
- Read `packages/desktop/e2e/fixtures.ts` (Electron launch fixture, `getElectronLaunchEnv`, `completeOnboarding`, `waitForDesktopReady`, `disableAnimations`) and `e2e/app.spec.ts` for house style; `playwright.config.ts` (`testMatch: '**/*.spec.ts'`, 30s timeout, CI workers=1).
- Read the mock scenario schema (`packages/harness/src/testing/mock-agent/scenario.ts`) — the full directive list is the E2E vocabulary — and how the chat controller builds the mock `LaunchSpec` (`mockLaunchSpec()` pattern in `dev-console/session-controller.ts`: mock bin resolved from the installed `@srgnt/harness`, run via `ELECTRON_RUN_AS_NODE=1`, scenario passed as `--scenario <path>`).

## Likely Code Paths

- **Scenario injection (design requirement recorded as an assumption):** the dev console hardcodes one demo scenario; per-test E2E needs *arbitrary* scenarios. Add an env override honored by the chat controller's mock launch path — e.g. `SRGNT_MOCK_SCENARIO=/abs/path/scenario.json` wins over the built-in default. Each Playwright test writes its scenario JSON into its temp dir and passes the env var through `getElectronLaunchEnv` (extend the helper with optional extra env). This keeps scenarios test-local and parallel-safe. If executors prefer a different injection seam (e.g. an E2E-only IPC channel), record the swap in Implementation Notes — the requirement is per-test scenarios, not this exact mechanism.
- `packages/desktop/e2e/chat.spec.ts` (new) — one describe block per behavior, each with its own scenario:
  1. **Streaming render:** `emit_chunks` (thought + agent, small `delayMs`) → thought block + markdown message appear.
  2. **Tool card lifecycle:** `tool_call`(pending) → updates through `completed`; a second card ending `failed`; diff-content card renders a DiffView.
  3. **Permission allow / deny:** `request_permission` with allow/reject options (+ `expectOutcome`/`expectOptionId` asserting agent-side receipt); two tests: click allow-once → turn continues; click reject-once → turn continues with the rejection visible.
  4. **Cancel mid-stream:** `emit_chunks`(slow) + `expect_cancel` → click Stop → turn shows cancelled, session accepts a follow-up prompt.
  5. **Crash recovery:** `emit_chunks` + `crash` → recoverable error banner, "New session" works, no white screen.
  6. **Slash menu:** `advertise_commands` on turn 1 → type `/` in composer → menu lists the advertised commands, filter + select works.
  7. **Mode switching:** scenario `initialize.modes: [...]` + `set_mode` directive → selector shows modes; user switch + agent-driven update both reflected.
- `packages/desktop/package.json` — **gotcha:** the `test:e2e` / `test:e2e:headed` / `test:e2e:full` scripts enumerate spec files explicitly; `e2e/chat.spec.ts` must be ADDED to those lists or it will never run in the standard invocation.
- CI: find the Desktop E2E job under `.github/workflows/` and confirm the new spec runs there (it invokes `test:e2e`, so the package.json edit should suffice — verify in the workflow run, not by assumption).

## Key Design Constraints

- Determinism first: tiny `delayMs` values (except where the test needs an observable in-flight window — cancel/crash use a slow chunk stream), `disableAnimations`, role/testid-based waits (`await expect(...)`, never bare timeouts). `expect_cancel`'s built-in 5s safety timeout keeps a broken cancel path from hanging the suite past Playwright's 30s cap.
- No network, no LLM, no `pi` binary: every scenario runs the bundled mock bin via the app's own launch path.
- The suite must assert agent-side receipt where the scenario supports it (`expect_prompt`, `expectOutcome`, `expectOptionId`) — UI state alone can lie.
- Keep per-test Electron launches (house pattern) — slower but isolated; CI already runs workers=1.

## Execution Checklist

1. Add the scenario-injection seam to the chat controller + extend `getElectronLaunchEnv`; unit-test the seam (env set → scenario file used; unset → default).
2. Write `chat.spec.ts` scenarios/specs in the order above, running each locally as written (`pnpm --filter @srgnt/desktop exec playwright test e2e/chat.spec.ts`).
3. Add the spec to the `test:e2e*` script lists in `packages/desktop/package.json`.
4. Flake check: 3 consecutive full green runs locally (`for i in 1 2 3; do pnpm --filter @srgnt/desktop test:e2e || break; done`), then confirm the GitHub Actions Desktop E2E workflow is green on the PR.
5. Update the phase acceptance checklist items this step proves.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
