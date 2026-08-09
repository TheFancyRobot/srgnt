---
note_type: step
template_version: 2
contract_version: 1
title: Implement resume flows load resume read-only reopen and fork with handoff
step_id: STEP-24-04
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: completed
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-08-09'
depends_on:
  - STEP-24-02
  - STEP-24-03
related_sessions:
  - '[[05_Sessions/2026-08-09-215255-implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff-claude-opus-5|SESSION-2026-08-09-215255 claude-opus-5 session for Implement resume flows load resume read-only reopen and fork with handoff]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-08-09-215255
active_session_id: 05_Sessions/2026-08-09-215255-implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff-claude-opus-5
context_status: completed
context_summary: 'STEP-24-04 complete: honest resume (capability cascade, load-replay reconciliation) and fork-with-handoff shipped and validated. Manual real-Pi check NOT performed.'
---

# Step 04 - Implement resume flows load resume read-only reopen and fork with handoff

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement resume flows load resume read-only reopen and fork with handoff.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: reopening a persisted session renders instantly from local events, then on next prompt: harnesses advertising `loadSession`/`sessionCapabilities.resume` reconnect transparently via `session/load` (replay reconciled against the local log) or `session/resume`; harnesses without support open read-only with a first-class "Continue in new session" fork that optionally seeds an explicit handoff summary and records `parentSessionId` both ways. No silent re-priming, ever.
- Starting files: main-process session service; `packages/harness/src/acp/` load/resume calls; renderer read-only banner + fork flow.
- Validate: E2E with two mock variants (load-capable and not); replay-reconciliation unit tests (local log vs replayed updates); fork lineage navigable in the session list.

## Why This Step Exists

- "Honest resume" is the phase's product stance (ARCH-0009 data flow + invariant): transparent continue only where the harness genuinely supports it; read-only + explicit fork everywhere else; no silent re-priming, ever.
- Reconciled with DEC-0018 / spike probe 3 (measured): for pinned `pi-acp@0.0.31`, `session/load` works (replay + rich config/modes) and `session/resume` is `-32601` — so resume-by-replay via `load` IS the Pi path, and capability detection comes from `NegotiatedCapabilities`, never harness ids.

## Prerequisites

- STEP-24-02 and STEP-24-03 merged.
- Mock-agent reality: `MockAgent.loadSession` is a no-op today — the load-capable E2E variant requires extending the mock with replay-on-load (see brief; `@srgnt/harness` testing change with its own tests).

## Relevant Code Paths

- `packages/desktop/src/main/chat/` — reconnect flow on first prompt of a reopened session: capability branch `resumeSession` → `loadSession` → read-only+fork; replay reconciliation (local log stays canonical; replayed frames never re-appended).
- `packages/harness/src/acp/connection.ts` `load()`/`resume()` + `capabilities.ts` (`NegotiatedCapabilities` after `applyCapabilityOverrides`).
- `packages/harness/src/testing/mock-agent/{scenario,runner}.ts` — add `loadReplay` directives.
- `packages/contracts/src/session.ts` — add optional `forkedSessionIds` to `SSession` (lineage navigable both ways); `chat:session:fork` IPC.
- Renderer: `ReadOnlyBanner.tsx`, fork flow with deterministic pre-filled (never auto-sent) handoff text, lineage links in `SessionList`.

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (resume data flow + honesty invariant)
- [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy (accepted)]]
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 3: load works, resume -32601)

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

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-opus-5
- Last touched: 2026-08-09
- Next action: None for this step. Proceed to [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup|STEP-24-05 Add transcript checkpointing and lifecycle cleanup]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Reconnect is lazy and renderer-driven: `chat:session:reconnect` (new IPC) is called by `sendPrompt` only when a reopened session has `live === false`. `chat:session:list` / `chat:session:open` stay pure disk reads, so the "UI-open ≠ process-running" invariant from STEP-24-03 is untouched.
- The cascade lives in `ChatSessionController.reconnect` (`packages/desktop/src/main/chat/session-controller.ts`), driven entirely off `connection.capabilities`: `resumeSession` → `loadSession` → read-only. A `-32601` at any step records a `client/capability_mismatch` event and falls through to the next untried path.
- Failure classes are a pure function (`classifyReconnectFailure` in `resume.ts`): `-32601` → unsupported (cascade continues), `-32002`/"session not found" → missing session (degrade immediately, no second call), everything else → transient (session stays retryable, NOT read-only).
- Replay isolation needed one new harness seam: `SessionUpdateHub.takeBuffered` / `AcpAgentConnection.takeBufferedUpdates`. The `updates()` iterator parks on an empty buffer, so "read the replay and stop" could not be expressed with it. The replay is lifted off the channel before `startPump` exists, which is why replayed frames are never re-appended.
- Reconciliation is a full ordered digest comparison (`reconcileReplay`), not count+last: a middle-only divergence is covered by a unit test and an assertion on the appended `client/load_reconciliation` payload.
- Fork commits with the CHILD meta (`parentSessionId` + `idempotencyKey` + `requestFingerprint` in the same `createSession` write). The parent's `forkedSessionIds` is a rebuildable cache repaired during `chat:session:list` via `reconcileForkLinks`, so a crash between the two writes self-heals at the moment lineage is displayed.
- Deliberate deviation from the brief: NO `forks/<key>` index file. The brief permitted one only as a rebuildable cache; the scan it would accelerate is `listSessions`, which the list already performs, and forking is human-paced. Recorded as a `ponytail:` comment on `findByKey` in `fork.ts`. Consequence: the Validation Plan's "delete the index file and re-assert" check is vacuous here — the child record is the only truth, asserted by the crash-retry test instead.
- Two guards, not one: the durable idempotency guard is the key stamped on the child; an in-flight `Map` in `registerChatHandlers` closes the window before that record exists (double-click). The renderer mints one key per session (`useMemo` on `sessionId`), so both clicks carry the same key.
- `chat:session:reconnect` refuses a session whose persisted `harnessId` is not drivable here (`opencode`), without spawning: resuming on a *different* agent would be the fake-continue the phase forbids.
- A resumed session is marked `titled: true`, so the prompt that resumed it never renames a session titled by its original first prompt.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-08-09 - [[05_Sessions/2026-08-09-215255-implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff-claude-opus-5|SESSION-2026-08-09-215255 claude-opus-5 session for Implement resume flows load resume read-only reopen and fork with handoff]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Complete. Reopening a persisted session still spawns nothing; the first prompt reconnects through a capability-driven cascade (`session/resume` → `session/load` → read-only + fork), replay is reconciled by full ordered comparison against the canonical local log, and a session that cannot be continued gets a read-only banner whose only way on is a linked fork with a deterministic, pre-filled (never auto-sent) handoff.
- Validation run in the foreground: `pnpm --filter @srgnt/harness test` (118 passed, 2 skipped), `pnpm --filter @srgnt/contracts test` (179 passed), `pnpm --filter @srgnt/runtime test` (419 passed), `pnpm --filter @srgnt/desktop test` (1149 passed, 64 files), `pnpm -r lint` (clean), and Playwright `e2e/resume.spec.ts` (3/3) plus `chat/sessions/projects` regression (13/13). Randomized suites (`event-log.property.test.ts`, contracts fast-check) run 5x total, stable.
- NOT performed: the manual real-Pi check (Execution Checklist item 7 / `SRGNT_IT_PI=1`) — no Pi install was exercised in this session, so "Pi continues via `session/load` and the thinking-level selector repopulates" remains unverified against a real agent. The mock covers the same code path including `LoadSessionResponse.modes`.
- Known pre-existing/environmental E2E failures, unrelated to this step: `e2e/bug-0013-visual.spec.ts` needs a packaged `release/linux-unpacked` build, and `e2e/app.spec.ts` "exercises preload APIs" fails inside `terminal:launch-with-context` with `posix_spawnp failed` (the IPC round trip succeeds; the PTY spawn does not). Neither touches chat, resume or fork code.
- Follow-up: see the session note's Follow-Up Work.
