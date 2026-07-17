# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — mock-agent `loadReplay` extension unit tests (scenario schema + runner emission order).
- `pnpm --filter @srgnt/contracts test` — `SSession.forkedSessionIds` + `chat:session:fork` schemas.
- `pnpm --filter @srgnt/desktop test` — reconnect-branch unit tests (all three capability configurations), reconciliation tests, handoff-template tests, read-only/fork component tests.
- `pnpm --filter @srgnt/desktop test:e2e` — both resume-variant specs (added to the explicit spec lists).
- Manual real-Pi: quit/reopen/prompt continue via `session/load`; `SRGNT_IT_PI=1` remains the only path that touches a real agent in automated runs (never in CI).

## Acceptance Checks

- Capability branch is data-driven: with `resumeSession: true` the service calls `session/resume` (no replay consumed); with only `loadSession: true` it calls `session/load` and consumes the replay; with neither it never spawns for prompting and surfaces read-only + fork. Assert the actual ACP calls via the in-process mock (`executed` directives / method spies), not just UI state.
- Reopening any persisted session renders the transcript instantly with zero processes spawned (`ps` assertion) — reconnect happens only on the next prompt.
- Load-replay reconciliation: matching replay → no duplicate events appended (event log byte-identical before/after reopen+load except new turn events); mismatching replay → one `client/load_reconciliation` event appended with both counts + visible "history may differ" notice; local transcript render unchanged in both cases.
- Load/resume *failure* (mock scripted to error on load) degrades to read-only + fork with a readable notice — never a fake continue, never a crash.
- Fork: new session in the same project with `parentSessionId` set; source meta gains the fork id in `forkedSessionIds`; lineage navigable both directions in the session list; handoff text is pre-filled, editable, and NOT auto-sent (assert no `client/prompt` in the fork's log until the user sends).
- Resumed Pi-shaped sessions repopulate the mode selector from the `LoadSessionResponse.modes` (mock variant scripts modes in the load path; manual check confirms real Pi thinking levels).

## Edge Cases

- Reopen + prompt when the harness binary is missing (`SpawnFailed`) → readable error, session stays reopenable, no status corruption.
- `acpSessionId` missing from meta (session persisted before its `session/new` completed) → read-only + fork, with the notice explaining why.
- Fork of a fork → chain renders correctly (grandparent lineage navigable stepwise).
- Fork while the parent is mid-turn → parent unaffected (its stream continues; assert both logs stay clean).
- Cancel during a load replay (user hits stop while history replays) → replay consumption aborts cleanly; session falls back to read-only for this open, retry allowed.
- Empty source session (no turns) forked → handoff template degrades gracefully (no quoted content, still linked).
- Double-click on fork → exactly one fork created (idempotency guard at the service).

## Regression Expectations

- STEP-24-03 concurrent-session E2E stays green (the reconnect flow reuses the same service paths).
- Phase-23 chat specs green: a *fresh* session's first prompt must not accidentally take the reconnect branch.
- `readSessionEvent`/store suites untouched; fixtures decode suite green.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
