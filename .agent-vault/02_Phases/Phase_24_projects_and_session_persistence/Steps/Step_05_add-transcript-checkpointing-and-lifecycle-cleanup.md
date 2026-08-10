---
note_type: step
template_version: 2
contract_version: 1
title: Add transcript checkpointing and lifecycle cleanup
step_id: STEP-24-05
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: completed
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-08-10'
depends_on:
  - STEP-24-04
related_sessions:
  - '[[05_Sessions/2026-08-10-073925-add-transcript-checkpointing-and-lifecycle-cleanup-claude-opus-5|SESSION-2026-08-10-073925 claude-opus-5 session for Add transcript checkpointing and lifecycle cleanup]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-08-10-073925
active_session_id: 05_Sessions/2026-08-10-073925-add-transcript-checkpointing-and-lifecycle-cleanup-claude-opus-5
context_status: completed
context_summary: Advance [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup|STEP-24-05 Add transcript checkpointing and lifecycle cleanup]].
---

# Step 05 - Add transcript checkpointing and lifecycle cleanup

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add transcript checkpointing and lifecycle cleanup.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: `transcript.md` renders from the event log at checkpoints (session close + periodic while active) — human-readable, memsearch-indexable, never dual-written per token; lifecycle cleanup lands — idle reaping timers, quit-time best-effort `session/cancel` + kill-trees, and tolerant recovery from a corrupt JSONL tail line after a crash.
- Starting files: `packages/runtime/src/sessions/` (transcript renderer, checkpoint triggers); supervisor quit hooks in desktop main; crash-recovery path in the store reader.
- Validate: crash-mid-turn E2E (kill agent process, restart app, transcript intact minus in-flight chunk); quit leaves zero agent processes (process-tree assertion); checkpointed transcript matches the event log content.

## Why This Step Exists

- Closes the phase's remaining ARCH-0009 invariants: `transcript.md` derived (checkpointed, never dual-written per token) and no orphan processes under any exit path (idle reaping, bounded quit cleanup, crash recovery).
- Delivers the phase's headline acceptance test: kill mid-turn, lose at most the in-flight chunk, reopen to an instant intact transcript.

## Prerequisites

- STEP-24-04 merged (service, reconnect, statuses final).
- The Supervisor's idle-reap mechanism already exists (`idleTimeoutMs` + `markActivity` + `reaped` events) — this step configures and wires it, it does not build timers.

## Relevant Code Paths

- `packages/runtime/src/sessions/transcript.ts` (new) — pure deterministic `renderTranscript(events, meta)`.
- `packages/desktop/src/main/chat/` — checkpoint triggers (turn end, 30 s active timer, close, quit) + between-turns-only idle arming. **Crash-loss bound belongs to `events.jsonl`, not this cadence:** the "lose at most the in-flight chunk" guarantee is a property of the per-event `events.jsonl` append (STEP-24-01), which is the source of truth. `transcript.md` is a *derived cache* that is re-rendered from `events.jsonl` on reopen (see Execution Brief "rebuildable at any time from `events.jsonl` alone") — so a stale or missing 30 s transcript checkpoint after a crash costs nothing: the transcript is regenerated from the durable log. The 30 s cadence only bounds how fresh the on-disk `transcript.md` is for a *live external reader* (memsearch) while the app runs; it is explicitly NOT the crash-recovery bound.
- `packages/desktop/src/main/index.ts` — bounded `will-quit` cleanup under **one overall deadline** (recorded: 2 s total) covering ALL of best-effort `session/cancel` → final checkpoint → `supervisor.disposeAll()` — not 2 s for cancel alone. Each step gets the *remaining* time within the single budget; if the budget expires, cleanup stops best-effort and quit proceeds (kill-trees are the guaranteed backstop). The quit handler can never hang or be force-terminated with unbounded cleanup outside the deadline.
- `packages/contracts/src/session.ts` — extend `knownSessionEventKinds` with lifecycle audit kinds (`client/harness_crashed`, `client/harness_reaped`).
- Store reader (`truncatedTail`) → meta `interrupted` + renderer badge on open after crash.

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (derived-transcript + no-orphans invariants; corrupt-tail failure mode)

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

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-opus-5
- Last touched: 2026-08-10
- Next action: None - this step and PHASE-24 are complete. Next work is [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]], which should promote `DEFAULT_IDLE_TIMEOUT_MS` into `settings.json`. A manual real-Pi lifecycle pass (idle reap, transparent respawn, quit mid-turn) was NOT performed and is carried as follow-up.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- `packages/runtime/src/sessions/transcript.ts` - `renderTranscript(events, meta, {truncatedTail})`. Turns are buffered and rendered at the end, so a `tool_call_update` arriving after its turn's `client/stop` still corrects the call's status instead of writing into markdown already emitted. Thoughts are a count, per the recorded assumption.
- `SessionStore.checkpointTranscript(ref)` reads the log AND meta itself rather than taking a caller's view, which is what keeps the derived-artifact invariant honest. Written through the new `writeFileAtomic` (extracted from `writeJsonAtomic`; no second atomic writer).
- `Supervisor.setIdleHold(id, held)` was necessary: `armIdle` only re-arms from `ensureRunning`/`markActivity`, and `ensureRunning` runs once per chat session via `spawnerFor`, so `idleTimeoutMs` alone would fire mid-turn on a silent agent. The hold is the disarm/re-arm the Execution Brief specified.
- A reap kills the process the live `AcpAgentConnection` is bound to, so it cannot be transparent by itself. `ChatSessionController` reacts to `reaped {reason:'idle'}` by hibernating: out of `this.sessions`, log handle and lock released, status left `idle`, reconnect parameters kept. `prompt()` revives through the STEP-24-04 cascade, which also closes the "reap between `ensureRunning` and prompt send" race.
- `packages/desktop/src/main/chat/quit.ts` holds the one 2 s deadline over cancel -> final checkpoint -> `disposeAll`. `disposeAll` is always started, even with the budget spent. Recorded ceiling in a `ponytail:` comment: the harness's 5 s SIGTERM->SIGKILL grace can outlive the budget in the pathological case.
- Checkpoints await a per-session `drainAppends()`; nothing on the streaming path does. Without it a turn-end checkpoint could render a log that did not yet contain that turn, because controller appends are fire-and-forget.
- `client/harness_crashed` was deliberately NOT added - a crash already lands as `client/agent_status` with `status: 'crashed'`. `client/agent_status` (previously missing from the vocabulary) and `client/harness_reaped` were added instead.
- E2E lives in `packages/desktop/e2e/lifecycle.spec.ts`: the app is launched by hand (not via the `electronApp` fixture) because one test SIGKILLs the main process and relaunches over the same `SRGNT_DEFAULT_WORKSPACE_ROOT`. The process-tree assertion finds agents by the test's unique scenario path and is skipped on Windows.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-08-10 - [[05_Sessions/2026-08-10-073925-add-transcript-checkpointing-and-lifecycle-cleanup-claude-opus-5|SESSION-2026-08-10-073925 claude-opus-5 session for Add transcript checkpointing and lifecycle cleanup]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completed 2026-08-10. `transcript.md` is now a derived, checkpointed render of `events.jsonl` (turn end, every 30 s while a turn runs, close, quit, and session open), never dual-written per token. Idle reaping is wired as an explicit hold on the Supervisor with hibernation and transparent revive. Quit runs best-effort `session/cancel` + a final checkpoint + kill-trees under one 2 s deadline. Lifecycle audit kinds are in the shared vocabulary.
- Validation performed: `pnpm --filter @srgnt/runtime test` (439, 5x), `pnpm --filter @srgnt/contracts test` (179, 3x), `pnpm --filter @srgnt/harness test` (120 + 2 pre-existing Pi skips, 3x), `pnpm --filter @srgnt/desktop test` (1168, 5x), repo-root `pnpm build` and `pnpm test`, and `playwright test` over `chat/projects/sessions/resume/lifecycle` (18 passed; the new lifecycle spec run 3x).
- Validation NOT performed: the Validation Plan's manual real-Pi pass (let a real session idle past the timeout, confirm the reap with `ps`, prompt again for a transparent respawn, quit mid-turn and confirm `ps` is clean) and any manual/GUI walkthrough. No Pi binary and no GUI session were available, so idle-reaping and quit-cleanup are evidenced by mock-agent E2E and unit tests only.
- Pre-existing, unrelated: the full `pnpm --filter @srgnt/desktop test:e2e` run has 2 failures on macOS - `app.spec.ts` PTY launch (`posix_spawnp failed`, node-pty) and `bug-0013-visual.spec.ts` (requires `release/linux-unpacked/srgnt`).
- Follow-up: promote the idle timeout into `settings.json` in PHASE-25; a Windows equivalent of the `ps` process-tree assertion if desktop E2E ever runs there; the STEP-24-01 whole-file `readEventLog` ceiling remains (this step did not need a streaming reader - checkpoints are at turn boundaries, off the hot path).
