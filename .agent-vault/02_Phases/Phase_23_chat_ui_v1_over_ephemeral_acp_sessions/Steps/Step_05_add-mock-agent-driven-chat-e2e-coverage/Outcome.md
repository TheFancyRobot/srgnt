# Outcome

**Status: complete** (automated validation only — see "Not performed" below).

## What shipped

- `packages/desktop/e2e/chat.spec.ts` — 8 tests across the 7 required behaviors: streaming render (thought + GFM markdown), tool-card lifecycle `pending → completed` with a diff plus a second card ending `failed`, permission **allow** and permission **deny** as separate tests, cancel mid-stream with a follow-up turn, agent crash + recovery, slash menu (list/filter/insert), and session modes (user switch + agent-driven `set_mode`).
- Scenario injection: `MOCK_SCENARIO_ENV` / `resolveMockScenarioPath()` in `main/chat/session-controller.ts`; `mockScenario` option fixture + `agentAssertions` fixture in `e2e/fixtures.ts`; `getElectronLaunchEnv(userDataDir, extra)` gained an optional second parameter.
- Agent-side assertion channel: `RunnerHooks.onTurnEnd` in the mock runner, `--assertions <path>` in the mock bin. Without it `expectOutcome`/`expectOptionId`/`expect_prompt` were unobservable from outside the spawned agent.
- `request_permission` scenario directive extended with `kind`, `locations`, `rawInput`, closing STEP-23-03's carry-forward: path- and command-scoped permission prompts are now E2E-testable, not host-test-only.
- `e2e/chat.spec.ts` added to `test:e2e`, `test:e2e:headed`, and `test:e2e:full` in `packages/desktop/package.json`.

## Validation actually run

| Command | Result |
| --- | --- |
| `pnpm --filter @srgnt/desktop exec playwright test e2e/chat.spec.ts` | 8 passed (33s) |
| the same, ×3 consecutively (flake check) | 3/3 green — 31.9s / 31.5s / 30.9s |
| `pnpm --filter @srgnt/desktop test` | 57 files, 1042 tests passed (includes 3 new seam tests) |
| `pnpm --filter @srgnt/harness test` | 13 files, 114 passed, 2 skipped (includes the new `--assertions` subprocess test) |
| `pnpm --filter @srgnt/desktop typecheck` | clean |
| `pnpm --filter @srgnt/desktop test:e2e` (full suite) | 78 passed, 2 failed — both pre-existing environmental failures, see below |
| negative control (throwaway spec, deleted) | wrong `expect_prompt` + wrong `expectOptionId` both surfaced and failed the test |

The two full-suite failures are **not** from this step and fail identically without it:
`app.spec.ts › exercises preload APIs…` (`posix_spawnp failed` — node-pty cannot spawn on this machine) and
`bug-0013-visual.spec.ts` (hardcodes `release/linux-unpacked/srgnt`; Linux-packaged-only).

## Not performed

- **No manual/GUI pass was run** for this step — no `pnpm dev` walkthrough and no real-Pi conversation. The phase defers real-Pi checks to manual verification, and that verification is still owed (it is also owed from STEP-23-04).
- **CI was not observed.** `.github/workflows/desktop-e2e.yml` runs `xvfb-run -a pnpm --filter @srgnt/desktop test:e2e`, and the spec was added to that script's file list, so it should be picked up — but that is inference from the workflow file, not a green run seen on a PR.

## Follow-up

- Confirm the Desktop E2E workflow is green on the PR (first CI run that includes `chat.spec.ts`).
- Manual verification passes still owed for Phase 23: mock walkthrough via `pnpm dev`, and a real-Pi conversation smoke.

## Related Notes

- Step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]
- Phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
