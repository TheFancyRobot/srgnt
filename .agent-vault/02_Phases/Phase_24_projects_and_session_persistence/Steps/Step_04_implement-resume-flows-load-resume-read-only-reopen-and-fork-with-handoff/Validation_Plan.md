# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — mock-agent `loadReplay` extension unit tests (scenario schema + runner emission order).
- `pnpm --filter @srgnt/contracts test` — `SSession.forkedSessionIds` + `chat:session:fork` schemas.
- `pnpm --filter @srgnt/desktop test` — reconnect-branch unit tests (all three capability configurations), reconciliation tests, handoff-template tests, read-only/fork component tests.
- `pnpm --filter @srgnt/desktop test:e2e` — both resume-variant specs (added to the explicit spec lists).
- Manual real-Pi: quit/reopen/prompt continue via `session/load`; `SRGNT_IT_PI=1` remains the only path that touches a real agent in automated runs (never in CI).

## Acceptance Checks

- Capability branch is data-driven: with `resumeSession: true` the service calls `session/resume` (no replay consumed); with only `loadSession: true` it calls `session/load` and consumes the replay; with neither, the first prompt degrades to read-only + fork. Assert the actual ACP calls via the in-process mock (`executed` directives / method spies), not just UI state.
- Process-free reopen vs. first-prompt probe are distinct: **reopening** an existing session spawns zero processes (`ps` assertion) and reconnect happens only on the next prompt; but a **first prompt** on a session with neither capability persisted must still spawn/connect ONCE to negotiate `connection.capabilities` before it can conclude "read-only" (capabilities come from `NegotiatedCapabilities` post-connect, not from harness id) — unless capabilities were persisted from a prior connect, in which case no spawn is needed. The plan assumes NOT persisting capabilities in v1, so assert: zero processes on reopen; exactly one spawn on the first prompt to read capabilities; then read-only + fork surfaced. (If a later step persists capabilities, this check flips to "no spawn"; record whichever holds.)
- Load-replay reconciliation uses full ordered comparison: matching replay → no duplicate events appended (event log byte-identical before/after reopen+load except new turn events); a replay that diverges at a MIDDLE event while total count + last event still match → still detected, one `client/load_reconciliation` event appended (divergence position + both sequence digests) + visible "history may differ" notice; local transcript render unchanged in every case.
- Load/resume failure class is distinguished: an *unsupported/not-found* failure (capability absent, session gone / `-32601`) degrades to read-only + fork with a readable notice; a *transient* failure (scripted spawn/transport error) keeps the ORIGINAL session retryable (status unchanged, next prompt re-attempts reconnect) and does NOT force a read-only fork — never a fake continue, never a crash.
- Fork: new session in the same project with `parentSessionId` set; source meta gains the fork id in `forkedSessionIds`; lineage navigable both directions in the session list; handoff text is pre-filled, editable, and NOT auto-sent (assert no `client/prompt` in the fork's log until the user sends).
- Fork lineage crash/retry recovery (both directions): simulate a crash AFTER the child meta is written but BEFORE the parent's `forkedSessionIds` update → on startup, lineage reconciliation back-fills the parent list from the child's `parentSessionId`, and navigation works both parent→child and child→parent. Also the reverse partial (if the parent list were updated first in an alternate implementation) reconciles without orphaning. No fork is lost or half-linked after recovery.
- Fork idempotency via `idempotencyKey`: two `chat:session:fork` calls with the same key (double-click, or a retry after a mid-write crash) create exactly ONE child session and return the same session ref + handoff text on the second call — never a second child.
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
