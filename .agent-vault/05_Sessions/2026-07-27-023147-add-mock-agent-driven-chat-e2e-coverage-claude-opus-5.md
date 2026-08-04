---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Add mock-agent-driven chat E2E coverage
session_id: SESSION-2026-07-27-023147
date: '2026-07-27'
status: completed
owner: claude-opus-5
branch: phase/23-step-05-e2e
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
related_bugs: []
related_decisions: []
created: '2026-07-27'
updated: '2026-07-27'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-27-023147
  status: completed
  updated_at: '2026-07-27T04:15:00.000Z'
  current_focus:
    summary: 'STEP-23-05 complete: mock-agent-driven chat E2E plus the scenario-injection seam and agent-side assertion channel. Automated validation green; no manual/GUI pass and no observed CI run.'
    target: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]]'
  resume_target:
    type: phase
    target: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|PHASE-24 Projects and Session Persistence]]'
    section: Context Handoff
  last_action:
    type: completed
---

# claude-opus-5 session for Add mock-agent-driven chat E2E coverage

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 02:31 - Created session note; linked step [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage|STEP-23-05 Add mock-agent-driven chat E2E coverage]].
- 02:35 - Read the Execution Brief and Validation Plan, then traced the surfaces the spec has to drive: `ChatView`/`Composer`/`PermissionPrompt`/`ToolCallCard` test ids, `mockLaunchSpec()`, the mock scenario schema, and the mock runner.
- 02:50 - Found the gap the Validation Plan implies but nothing supported: `expect_prompt`/`expectOutcome`/`expectOptionId` failures only live in `MockAgent.assertionErrors`, unreachable once the agent is a spawned child. Added `RunnerHooks.onTurnEnd` + `--assertions <path>` in the mock bin as the one channel out.
- 02:55 - Extended the `request_permission` directive with `kind`/`locations`/`rawInput` and passed them through `runner.ts`, closing STEP-23-03's carry-forward (mock prompts previously always normalized to `kind: 'other'` + title scope).
- 03:05 - Built the injection seam: `MOCK_SCENARIO_ENV` + exported `resolveMockScenarioPath()` in `main/chat/session-controller.ts`; dropped the `cachedMockLaunch` memo so an env-injected scenario is honored per session.
- 03:10 - Added the `mockScenario` option fixture and `agentAssertions` fixture to `e2e/fixtures.ts`; `getElectronLaunchEnv` gained an optional extra-env parameter.
- 03:20 - Wrote `e2e/chat.spec.ts` (8 tests / 7 behaviors) and added it to the three `test:e2e*` script file lists.
- 03:30 - First run: 8/8 failed on `disableAnimations` — the renderer's CSP refuses `page.addStyleTag`. Dropped it (no screenshots in this spec).
- 03:35 - Second run: 7/8. The streaming test raced the thought block's auto-collapse; changed it to wait for `data-streaming="false"` and click the toggle.
- 03:40 - 8/8 green, then 3/3 consecutive green on the flake check.
- 03:50 - Negative control: a throwaway spec with a wrong `expect_prompt` and a wrong `expectOptionId` produced exactly those two failures via `agentAssertions()` and failed the test. Deleted the spec. The channel is not vacuous.
- 04:00 - Full `pnpm --filter @srgnt/desktop test:e2e`: 78 passed, 2 failed — both pre-existing environmental (node-pty `posix_spawnp`, and a Linux-packaged-only visual spec).
- 04:10 - Updated step, companion, and phase notes; marked STEP-23-05 and PHASE-23 complete.
<!-- AGENT-END:session-execution-log -->

## Findings

- Agent-side assertions were dead weight before this step: the mock's `expect_*` failures never left the spawned process. Any E2E written against them would have passed while the UI answered the agent wrongly. `--assertions <path>` (via `RunnerHooks.onTurnEnd`) is now the channel, and the negative control proves it fires.
- The renderer's CSP (`style-src 'self' 'nonce-srgnt-renderer'`) makes `disableAnimations()` unusable in any spec that runs against the real chat surface - `page.addStyleTag` is refused outright.
- The mock's `request_permission` had no way to express `kind`, `locations`, or `rawInput`, so every scripted prompt fell back to `kind: 'other'` with title scoping. Path and command scoping were host-test-only; both are now E2E-covered.
- A crashed agent is not auto-respawned - `Supervisor` restarts lazily on the next spawn request - so the `crashed` status is stable for the renderer and the crash banner does not flicker.
- Observable status transitions need scripted windows, not timing luck: the `pending` -> `completed` tool-card assertion only holds because the scenario sleeps 400ms between the two frames.
- Durable findings are promoted into the step's [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Implementation_Notes|Implementation Notes]].

## Context Handoff

- STEP-23-05 is complete and PHASE-23 has no remaining steps. Branch `phase/23-step-05-e2e`; no git operations were run by this session (the orchestrator owns git).
- The next agent needs three facts to work here: scenarios are injected per test via `test.use({ mockScenario })` -> `SRGNT_MOCK_SCENARIO` -> `resolveMockScenarioPath()`; agent-side assertion failures are only visible through the `agentAssertions` fixture; and `disableAnimations()` cannot be used in chat specs because of the renderer CSP.
- What is *not* done: manual verification. No `pnpm dev` walkthrough, no real-Pi conversation, and no observed CI run of the Desktop E2E workflow with the new spec. The phase's own "manual real-Pi smoke" expectation is still outstanding, carried over from STEP-23-04.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/desktop/e2e/chat.spec.ts` (new) - 8 tests covering the seven required chat behaviors against per-test mock scenarios.
- `packages/desktop/e2e/fixtures.ts` - `mockScenario` option fixture, `agentAssertions` fixture, optional extra-env parameter on `getElectronLaunchEnv`.
- `packages/desktop/src/main/chat/session-controller.ts` - `MOCK_SCENARIO_ENV`, exported `resolveMockScenarioPath()`, `--assertions` arg on the mock launch spec, memo narrowed to the default scenario path.
- `packages/desktop/src/main/chat/session-controller.test.ts` - three seam tests (default fallback, env override, missing-file error).
- `packages/desktop/package.json` - `e2e/chat.spec.ts` added to `test:e2e`, `test:e2e:headed`, `test:e2e:full`.
- `packages/harness/src/testing/mock-agent/scenario.ts` - `request_permission` gained optional `kind`, `locations`, `rawInput`.
- `packages/harness/src/testing/mock-agent/runner.ts` - passes those three through to `requestPermission`; new `RunnerHooks.onTurnEnd`.
- `packages/harness/src/testing/mock-agent/bin.ts` - `--assertions <path>` sink; flag parsing generalized to `flagValue`.
- `packages/harness/src/testing/mock-agent/mock-agent.subprocess.test.ts` - test proving `--assertions` is written before the turn response.
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: `pnpm --filter @srgnt/desktop exec playwright test e2e/chat.spec.ts` - Result: 8 passed (33s).
- Command: the same, run 3 times consecutively (flake check) - Result: 3/3 green (31.9s / 31.5s / 30.9s).
- Command: `pnpm --filter @srgnt/desktop test` - Result: 57 files, 1042 tests passed.
- Command: `pnpm --filter @srgnt/harness test` - Result: 13 files, 114 passed, 2 skipped.
- Command: `pnpm --filter @srgnt/desktop typecheck` - Result: clean.
- Command: `pnpm --filter @srgnt/desktop test:e2e` (full suite) - Result: 78 passed, 2 failed. Both failures are pre-existing and environmental: `app.spec.ts > exercises preload APIs...` (`posix_spawnp failed` from node-pty on this machine) and `bug-0013-visual.spec.ts` (hardcodes `release/linux-unpacked/srgnt`, Linux-packaged-only). Neither is caused by this step.
- Command: negative-control spec (throwaway, deleted after the run) - Result: a wrong `expect_prompt` and a wrong `expectOptionId` both surfaced through `agentAssertions()` and failed the test, proving the assertion channel is live.
- Notes: **No manual or GUI verification was performed.** No `pnpm dev` walkthrough, no real-Pi conversation, and no observed run of the Desktop E2E GitHub Actions workflow. The workflow invokes `xvfb-run -a pnpm --filter @srgnt/desktop test:e2e`, so the package.json edit should be enough, but that is inference from the workflow file, not a green CI run.
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Confirm the Desktop E2E workflow is green on the PR - this is the first CI run that includes `e2e/chat.spec.ts`.
- [ ] Manual verification still owed for PHASE-23 (also owed from STEP-23-04): a `pnpm dev` mock walkthrough and a real-Pi conversation smoke.
- [ ] Pre-existing, not this step's to fix: `app.spec.ts > exercises preload APIs...` fails locally with `posix_spawnp failed` because node-pty cannot spawn on this machine; `bug-0013-visual.spec.ts` needs a Linux packaged build.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- Finished: `e2e/chat.spec.ts` with 8 tests covering all seven required behaviors against the real spawned mock agent; the `SRGNT_MOCK_SCENARIO` injection seam and its unit tests; the `--assertions` agent-side assertion channel and its subprocess test; `request_permission` scenario support for `kind`/`locations`/`rawInput`; and the spec added to all three `test:e2e*` script lists.
- Validated by commands actually run: chat spec 8/8 and 3/3 consecutive green; desktop unit 1042 passed; harness unit 114 passed / 2 skipped; typecheck clean; full `test:e2e` 78 passed with 2 pre-existing environmental failures; plus a deliberate negative control proving the assertion channel catches a wrong permission answer.
- **Explicitly not done: any manual or GUI pass.** No `pnpm dev` walkthrough, no real-Pi conversation smoke, and no Desktop E2E CI run observed. Those are verification gaps, not unfinished implementation, and they are listed in Follow-Up Work.
- Ended in a clean handoff state: step and phase notes updated, snapshots filled, nothing left mid-edit.
