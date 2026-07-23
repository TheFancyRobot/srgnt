# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `SGroupMemberSpec` round-trips; bad roles (uppercase, slashes, empty, >32 chars) rejected; old single-session `meta.json` fixtures still decode (`kind` defaults to `'single'`, absent `members` tolerated).
- `pnpm --filter @srgnt/contracts test` (invariant cases) — decoding `SSession` **rejects** every shape that violates the `kind`/`members` rule, each with a message naming the field: `kind: 'single'` carrying a non-empty `members`; `kind: 'single'` carrying `members: []`; `kind: 'group'` with `members` absent; `kind: 'group'` with `members: []`; `kind: 'group'` with exactly one member; `kind: 'group'` with two members sharing a `role`. The two-member group is the positive control and must decode.
- `pnpm --filter @srgnt/runtime test` — group path derivation; `createGroupSession` creates `group/{members/,notes/}` skeleton; member channels are isolated (interleaved appends to two roles land only in their own `events.jsonl` with dense per-channel seq).
- `pnpm --filter @srgnt/desktop test` — `GroupSessionController` unit tests with injected in-process mock connections (two members: spawn, session/new per member, pump fan-out keyed by role, dispose kill-trees both).
- `pnpm --filter @srgnt/desktop test:e2e` — new `e2e/group.spec.ts` (**must be added to the explicit `test:e2e*` script file lists** — Phase-23 lesson).

## Acceptance Checks

- Create a group with two mock-agent members running *different* scenarios (per-member scenario files via the mock launch spec; see `SRGNT_MOCK_SCENARIO` plumbing from STEP-23-05): both member tabs stream concurrently and independently; the streams do not interleave into each other's views.
- `~/srgnt-workspace/projects/<id>/sessions/<id>/group/members/<role>/events.jsonl` exists per member and contains that member's raw ACP updates in the standard envelope; `readSessionEvent` decodes every line.
- Roster shows both members with harness badges + quirk badges; the shared-working-tree warning renders with a working link to `docs/group-worktrees.md`.
- Restart the app: the group session appears in the session list with a `group` badge; opening it renders both member channels read-only from disk (live reconnect is out of scope until 04/06 wiring — read-only is the pass bar here).

## Edge Cases

- One member's harness binary missing → that member shows the spawn-failure surface; the other member still streams; group session is not torn down.
- Duplicate role at creation → rejected in the UI with a message, no session dir created.
- Member crash mid-turn (mock `crash` directive) → per-member error state; sibling member unaffected; supervisor `crashed` event recorded.
- App quit with two live members → process-tree assertion: zero orphaned agent processes (reuse the Phase-24 quit-cleanup assertion).

## Regression Expectations

- All existing single-session chat E2E and unit suites stay green — group support must not disturb the `kind: 'single'` paths.
- Session-list and project-switcher suites from Phase 24 unchanged.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui|STEP-27-01 Model group sessions with member channels and roster UI]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
