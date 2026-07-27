---
note_type: step
template_version: 2
contract_version: 1
title: Add mock-agent-driven chat E2E coverage
step_id: STEP-23-05
phase: '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]'
status: completed
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-07-27'
depends_on:
  - STEP-23-02
  - STEP-23-03
  - STEP-23-04
related_sessions:
  - '[[05_Sessions/2026-07-27-023147-add-mock-agent-driven-chat-e2e-coverage-claude-opus-5|SESSION-2026-07-27-023147 claude-opus-5 session for Add mock-agent-driven chat E2E coverage]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-27-023147
active_session_id: 05_Sessions/2026-07-27-023147-add-mock-agent-driven-chat-e2e-coverage-claude-opus-5
context_status: completed
context_summary: 'STEP-23-05 complete: mock-agent-driven chat E2E (8 tests, 7 behaviors) plus the SRGNT_MOCK_SCENARIO injection seam and an agent-side assertion channel. Automated validation only — chat spec 8/8 and 3/3 on the flake check, unit suites green; no manual pnpm dev walkthrough, no real-Pi run, and no observed CI run of the Desktop E2E workflow.'
---

# Step 05 - Add mock-agent-driven chat E2E coverage

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add mock-agent-driven chat E2E coverage.
- Parent phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]].
- Exact outcome: Playwright E2E specs cover the chat surface end to end against the mock agent — streaming render, tool-call card lifecycle (incl. failure), permission allow and deny, cancel mid-stream, agent crash recovery, slash-command menu, and mode switching — running deterministically in CI with no network or LLM dependency.
- Starting files: `packages/desktop/e2e/` (new `chat.spec.ts`); mock-agent launch helpers from `@srgnt/harness/testing`; existing Playwright config and CI workflow.
- Validate: `pnpm test:e2e` green locally and in the Desktop E2E GitHub Actions workflow; flake check via repeat runs (target: 3 consecutive green runs).

## Why This Step Exists

- Locks the whole Phase-23 surface behind deterministic, zero-cost E2E: the mock agent runs as a real child process through Supervisor + `AcpAgentConnection`, so these specs exercise the full stack (spawn → ACP → IPC → renderer) without network, LLM spend, or a `pi` install. Real-Pi checks stay manual this phase.

## Prerequisites

- Steps 01–04 merged.
- Read `packages/desktop/e2e/fixtures.ts` (launch fixture, `getElectronLaunchEnv`, `completeOnboarding`) and the mock scenario schema — the directive list is the E2E vocabulary.
- Scenario injection seam (recorded design requirement): the chat controller's mock launch path must honor a per-test scenario override (default: `SRGNT_MOCK_SCENARIO=/abs/path.json` env var) — the dev console's hardcoded demo scenario is not enough.

## Relevant Code Paths

- `packages/desktop/e2e/chat.spec.ts` (new) — seven behaviors: streaming, tool-card lifecycle incl. failure, permission allow/deny, cancel mid-stream, crash recovery, slash menu, mode switching; agent-side assertions via `expect_prompt`/`expectOutcome`/`expectOptionId`.
- `packages/desktop/src/main/chat/` — scenario-injection seam (unit-tested).
- **Gotcha:** `packages/desktop/package.json` `test:e2e*` scripts enumerate spec files explicitly — `e2e/chat.spec.ts` must be added or it never runs.
- `.github/workflows/` — verify the Desktop E2E job picks up the new spec (it calls `test:e2e`).

## Required Reading

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (mock agent role)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: claude-opus-5
- Last touched: 2026-07-27
- Next action: None for this step, and none left in PHASE-23. Automated validation only: `e2e/chat.spec.ts` is 8/8 green with a 3/3 flake check, but no manual `pnpm dev` walkthrough and no real-Pi conversation were run, and the Desktop E2E workflow has not yet been observed green on a PR. See [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Outcome|Outcome]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Full findings live in [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Implementation_Notes|Implementation Notes]]. The four that change how the next engineer works:
- The injection seam is `SRGNT_MOCK_SCENARIO` → `resolveMockScenarioPath()` (`packages/desktop/src/main/chat/session-controller.ts`), consumed by the `mockScenario` Playwright option fixture. Unset ⇒ the app behaves exactly as before.
- Agent-side `expect_*` assertions only escape the spawned mock through `--assertions <path>` (`RunnerHooks.onTurnEnd` → `bin.ts`), read back by the `agentAssertions` fixture. A test that omits that check can pass while the UI answers the agent wrongly.
- `disableAnimations()` is unusable in chat specs: the renderer's CSP rejects `page.addStyleTag`.
- `request_permission` scenarios can now carry `kind` / `locations` / `rawInput`, so path- and command-scoped prompts are testable end to end (STEP-23-03 carry-forward closed).

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-27 - [[05_Sessions/2026-07-27-023147-add-mock-agent-driven-chat-e2e-coverage-claude-opus-5|SESSION-2026-07-27-023147 claude-opus-5 session for Add mock-agent-driven chat E2E coverage]] - Step executed and completed: `e2e/chat.spec.ts` (8 tests / 7 behaviors), the `SRGNT_MOCK_SCENARIO` injection seam, the `--assertions` agent-side assertion channel, and `request_permission` scope fields. Automated validation green (8/8, 3/3 flake check); no manual/GUI pass performed.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Complete. `packages/desktop/e2e/chat.spec.ts` covers all seven required behaviors in 8 tests, driving the real stack (Electron main spawns the mock agent as a child process through Supervisor + `AcpAgentConnection`) with a per-test injected scenario. No network, no LLM, no `pi` binary.
- Validation actually run: `playwright test e2e/chat.spec.ts` 8/8 green and 3/3 on the flake check; `pnpm --filter @srgnt/desktop test` 1042 passed; `pnpm --filter @srgnt/harness test` 114 passed / 2 skipped; `typecheck` clean; full `test:e2e` 78 passed with 2 pre-existing environmental failures (`app.spec.ts` node-pty `posix_spawnp`, `bug-0013-visual.spec.ts` Linux-packaged-only). A deliberate negative-control run proved the agent-side assertion channel catches a wrong permission answer.
- **Not run: any manual or GUI verification.** No `pnpm dev` walkthrough and no real-Pi conversation smoke were performed in this session, and no CI run of the Desktop E2E workflow has been observed with the new spec in it. Those remain owed for the phase.
- Full detail and follow-ups: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_05_add-mock-agent-driven-chat-e2e-coverage/Outcome|Outcome]].
