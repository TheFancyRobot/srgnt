# Execution Brief

## Why

- This step closes the phase's two remaining ARCH-0009 invariants: `transcript.md` is *derived* from the event log (human-readable, memsearch-indexable — never dual-written per token), and the supervisor leaves *no orphans under any exit path* (idle reaping, quit kill-trees, crash recovery).
- It is deliberately last: checkpoint triggers and cleanup hooks need the final shapes of the session service (03) and reconnect flow (04) to attach to. It also delivers the phase's headline acceptance test — kill the app mid-turn, lose at most the in-flight chunk, reopen to an instant, intact transcript.

## Prerequisites

- STEP-24-04 merged (session service, reconnect, statuses all final).
- Read: ARCH-0009 "Failure Modes" (corrupt-tail rule; crash-mid-turn recovery) and "Invariants" (derived transcript; no orphans); the tolerant-read + `truncatedTail` surface built in STEP-24-01; `packages/harness/src/supervisor/supervisor.ts` — **the idle-reap mechanism already exists** (`SupervisorOptions.idleTimeoutMs` + `RunningHandle.markActivity()` + the `reaped {reason: 'idle'}` event); this step *configures and wires* it, it does not build timers.
- Read `packages/desktop/src/main/index.ts` `will-quit` handling (the dev-console teardown pattern) — the quit hook this step extends.

## Likely Code Paths

- `packages/runtime/src/sessions/transcript.ts` (new) — pure renderer `renderTranscript(events, meta) → string`: markdown with title header, one section per turn (user prompt → agent message text, tool-call one-liners with status, permission decisions, stop reason), tolerant of unknown kinds (skip) and truncated tails (final "… interrupted" marker). Recorded assumptions: thoughts are summarized as a count, not inlined (transcripts are for humans + memsearch, not verbatim replay — the log keeps the full data); ACP `content` text blocks are extracted the same way the renderer's transcriptReducer does.
- Checkpoint triggers (session service, `packages/desktop/src/main/chat/`): on turn end (`client/stop` append), periodically while a turn is active (recorded assumption: every 30 s), on session close, and on app quit. Write via tmp+rename (atomic, same discipline as meta). Never per-token/per-update.
- Idle reaping: construct the shared Supervisor with `idleTimeoutMs` (recorded assumption: **10 minutes** default; Decision needed — value + whether it is user-configurable via `settings.json` now; default recorded is a constant this phase, settings exposure deferred to Phase 25's harness settings). Call `handle.markActivity()` on each prompt turn start and each streamed update batch. A reaped session's status stays `idle` (it is resumable via 04's reconnect) — reaping is invisible except for the next prompt's respawn latency; the `reaped {reason: 'idle'}` supervisor event is appended to the log as a lifecycle audit event.
- Quit cleanup (`packages/desktop/src/main/index.ts` `will-quit`): for every session with a turn in flight, best-effort `session/cancel` with a hard timeout (recorded assumption: 2 s total budget), final transcript checkpoint, then `supervisor.disposeAll()` (kill-trees, marks disposed so nothing respawns). Electron note: hold the quit with `event.preventDefault()` + `app.exit()` after the bounded cleanup — an unbounded await must never wedge quit (the timeout guarantees exit).
- Crash recovery wiring: on session open, when the store reports `truncatedTail: true`, set meta status `interrupted` and render the transcript with the interrupted marker; the renderer shows the badge (state already exists in 03's status vocabulary).
- Lifecycle audit events: append `client/session_closed` on explicit close; supervisor `crashed`/`reaped` events land as envelope events (recorded assumption: new kinds `client/harness_crashed`, `client/harness_reaped` — kinds are an open set by design so tolerant readers need no change, but ADD them to `knownSessionEventKinds` for documentation + type narrowing; small contracts edit).

## Key Design Constraints

- `transcript.md` must be rebuildable at any time from `events.jsonl` alone — no state in the transcript that is not in the log (derived-artifact invariant; property-test it: render(read(log)) is deterministic).
- Checkpointing must not block streaming: renders happen off the hot update path (debounced timer), and a render of N thousand events must not stall appends (independent files).
- Idle reap must never fire mid-turn: `markActivity` on turn start is not sufficient alone — a long in-flight prompt on a `ready` process must hold activity, so arm the timer only between turns (recorded design guidance).
- Quit must be bounded and absolute: cancel is best-effort, kill-trees are guaranteed; zero agent processes after quit under every path (clean, mid-turn, crashed-and-restarting).

## Execution Checklist

1. Build `transcript.ts` pure renderer + unit/property tests (determinism; unknown kinds; truncated tail; permission + tool + lifecycle events all rendered).
2. Wire checkpoint triggers (turn end, 30 s active timer, close, quit) with debouncing; unit-test trigger logic with a fake clock.
3. Configure `idleTimeoutMs` on the shared Supervisor + `markActivity` wiring + between-turns-only arming; unit tests with the injected `SupervisorClock` (reap fires when idle between turns; never mid-turn; respawn-on-next-prompt transparent via 04's flow).
4. Extend `knownSessionEventKinds` (+ contracts test) and append lifecycle audit events.
5. Implement bounded `will-quit` cleanup; unit-test the cancel-timeout path with a hanging mock.
6. E2E: crash-mid-turn (scenario `crash` directive mid-stream → restart app → transcript intact minus in-flight chunk, session badged interrupted); quit-cleanup process-tree assertion (`ps` shows zero mock/npx children after quit, including quit-during-active-turn).

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup|STEP-24-05 Add transcript checkpointing and lifecycle cleanup]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (derived-transcript + no-orphans invariants; corrupt-tail failure mode)
