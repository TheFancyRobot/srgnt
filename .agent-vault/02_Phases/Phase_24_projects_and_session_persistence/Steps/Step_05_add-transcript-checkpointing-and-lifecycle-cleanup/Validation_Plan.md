# Validation Plan

## Commands

- `pnpm --filter @srgnt/runtime test` — transcript renderer unit + property tests (determinism, tolerance).
- `pnpm --filter @srgnt/contracts test` — extended `knownSessionEventKinds` list.
- `pnpm --filter @srgnt/desktop test` — checkpoint-trigger, idle-arming, and quit-cleanup unit tests (fake clocks / hanging-mock cancel).
- `pnpm --filter @srgnt/desktop test:e2e` — crash-mid-turn and quit-cleanup specs (added to the explicit `test:e2e*` lists).
- Manual: real-Pi session → let it idle past the timeout (`ps` shows the adapter reaped) → prompt again (transparent respawn + `session/load`); quit mid-turn → `ps` clean.

## Acceptance Checks

- Transcript determinism: `renderTranscript(readEvents(log))` is byte-identical across runs and machines for the same log (property test); the committed real-Pi fixture logs render to readable markdown (snapshot test).
- Checkpoints exist: after a completed turn, `transcript.md` matches the event log content; during a long active turn a periodic checkpoint appears (fake-clock unit test; E2E asserts the file exists mid-turn); on close/quit the final checkpoint runs.
- Transcript is never dual-written per token: streaming N updates causes at most the debounced number of writes (spy on the writer).
- Crash-mid-turn E2E: mock scenario streams then `crash` → app restarted (fresh Electron launch, same workspace temp dir) → session listed as `interrupted`, transcript renders everything up to the last received update, only the in-flight chunk missing; a truncated/partial log tail is tolerated.
- Idle reaping: with a short injected timeout, an idle session's process is reaped (`reaped {reason:'idle'}` audit event in the log; `ps` clean) and the session stays `idle` in the list; the next prompt respawns transparently through the 04 reconnect flow. A reap can NEVER fire during an active turn (fake-clock unit test with a long in-flight prompt).
- Quit cleanup: quitting with (a) idle sessions, (b) an active turn, (c) a crashed-and-backing-off session leaves ZERO agent child processes (process-tree assertion via `ps` in E2E teardown); in-flight turns received a best-effort `session/cancel` (mock `expect_cancel` assertion) and quit completed within the bounded budget.
- Lifecycle audit trail: `client/session_closed`, crash, and reap events appear in `events.jsonl` with valid envelopes; readers (list, transcript, reducer) tolerate them.

## Edge Cases

- Corrupt tail + immediate new prompt: recovery marks `interrupted`, the 04 reconnect flow still works; new events append after the dropped partial line with correct continuing seq.
- Checkpoint racing a concurrent append (turn ends while the periodic render runs) → last-writer-wins on `transcript.md` is acceptable (both derive from the log); no torn file (atomic rename).
- Quit while a checkpoint write is in progress → bounded wait, no torn transcript (tmp+rename).
- Session with only lifecycle events (created, crashed, closed — no turns) renders a sensible minimal transcript.
- `session/cancel` hanging at quit (mock never responds) → the 2 s budget expires, kill-tree proceeds, app exits.
- Reap firing between `ensureRunning` resolution and prompt send (tiny race) → prompt path retries once via `ensureRunning` (supervisor respawns transparently); no user-visible error.

## Regression Expectations

- Full phase acceptance sweep now passes: re-run ALL Phase-24 E2E specs (03 concurrency, 04 both resume variants, 05 crash/quit) plus the Phase-23 chat specs — this step touches quit/lifecycle paths every spec depends on.
- `pnpm build` + full `pnpm test` at repo root green.
- Dev console teardown (`disposeDevConsole` on `will-quit`) still runs — the new quit hook must compose with, not replace, existing teardowns.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup|STEP-24-05 Add transcript checkpointing and lifecycle cleanup]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
