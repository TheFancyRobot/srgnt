# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `chat:session:list/open` + status-push schemas.
- `pnpm --filter @srgnt/desktop test` — session service routing/persistence/title unit tests + `SessionList` and per-session state component tests.
- `pnpm --filter @srgnt/runtime test` — unchanged store suites stay green (this step consumes, not modifies, the store).
- `pnpm --filter @srgnt/desktop test:e2e` — the concurrent-sessions spec (spec file added to the explicit `test:e2e*` lists).
- Manual: two real terminal dirs, one mock + one Pi session (if `pi` installed) streaming concurrently; app restart → both listed, transcripts instant.

## Acceptance Checks

- Two concurrent sessions in different projects stream independently: interleaved updates land in the correct per-session logs (assert by reading both `events.jsonl` files) and the correct renderer transcripts; no cross-talk under a stress scenario (rapid `emit_chunks` in both).
- Session list shows title, harness badge, live status dot, `updatedAt` ordering; statuses track the mock scenario transitions (`active` during turn, `idle` after `end_turn`, `error` after a `crash` directive exhausts restarts).
- Auto-title = first non-empty line of the first prompt, ≤60 chars + ellipsis; persisted in `meta.json` and shown after app restart; a second prompt never retitles.
- Opening a persisted session renders the full transcript from `events.jsonl` through the same `transcriptReducer` as live streaming — identical rendering for identical event content (unit test: reducer(live sequence) deep-equals reducer(persisted replay)).
- Every prompt/stop/permission decision appears in the event log (audit trail): assert kinds `client/prompt`, `client/stop`, `client/permission_request`, `client/permission_decision` are written where the scenario triggers them.
- Background (non-visible) sessions keep accumulating updates in memory and on disk; switching back shows the complete transcript without re-reading disk.
- srgnt session ids are unique even when the mock returns its fixed ACP session id for every session.

## Edge Cases

- Prompt on session A while B is `awaiting_permission` → A proceeds; B's pending prompt is unaffected.
- Session with zero prompts (created, never used) → listed as untitled placeholder ("New session"), no crash on open.
- 50+ sessions in one project → list stays responsive (no per-row disk reads at list time — listing uses meta only).
- App restart mid-stream (covered fully in 05, but here): the list must render from disk without any process spawning (`ps` assertion: zero agent children after restart until a prompt).
- Empty project (no sessions) → clean empty state, "New session" affordance present.
- Status push for a session the renderer doesn't know yet (race at creation) → ignored or buffered, never a crash.

## Regression Expectations

- All Phase-23 chat E2E specs stay green under the multi-session refactor — this is the highest-risk regression surface of the step (the renderer's single-session assumptions are being removed).
- Dev console (`SRGNT_DEV_CONSOLE=1`) untouched and functional.
- `pnpm --filter @srgnt/harness test` untouched and green unless the shared-Supervisor refactor needed a harness fix — any harness change requires its own tests and an Implementation Notes entry.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto-titles and concurrent session management]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
