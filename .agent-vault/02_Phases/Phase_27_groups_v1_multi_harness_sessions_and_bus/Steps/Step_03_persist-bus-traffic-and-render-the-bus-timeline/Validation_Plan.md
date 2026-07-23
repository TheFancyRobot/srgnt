# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `SGroupBusEvent` round-trip; unknown `kind` decodes; malformed envelope fails structurally only.
- `pnpm --filter @srgnt/runtime test` — group-log property tests (fast-check): arbitrary event sequences round-trip append→read; arbitrary final-line truncation yields all prior events + `truncatedTail: true`; per-group seq density under interleaved appends.
- `pnpm --filter @srgnt/desktop test` — persist-before-fan-out ordering test (recipient delivery observably follows a completed append); `BusTimeline` component tests (filters, unknown-kind row, interrupted marker).
- `pnpm --filter @srgnt/desktop test:e2e` — restart-recovery spec (added to the explicit `test:e2e*` file lists).

## Acceptance Checks

- **Restart recovery (the step's headline):** run a two-mock-member exchange (from STEP-27-02's round-trip scenario), quit the app, relaunch, reopen the group — the timeline renders the identical message sequence from `bus.jsonl` alone; line count and order match a captured pre-restart snapshot.
- Member start/stop/crash produce `system/*` rows interleaved at the correct positions; a mock `crash` directive yields a `system/member_crashed` row.
- Filters: by-member shows only that role's from/to traffic; direction filter separates agent↔agent from user/system rows; clearing filters restores the full list.
- Every `bus.jsonl` line decodes via `readGroupBusEvent`; timeline and mailbox (STEP-27-04) read the same file without disagreement.

## Edge Cases

- Truncate the final line of `bus.jsonl` by hand → reopen renders all prior events + an interrupted marker; no throw, no blank timeline.
- Insert a line with an unrecognized `kind` (e.g. `system/future_thing`) → renders as a generic system row.
- Broker restart mid-exchange (STEP-27-02 edge case rerun with persistence on): no message that was acked to a sender is missing from `bus.jsonl` after recovery.
- Empty group (no traffic yet) → timeline shows only `system/group_created`; no error state.

## Regression Expectations

- If the JSONL core was factored out of `event-log.ts`, the entire STEP-24-01 runtime suite (including its fast-check properties and real-Pi fixture decodes) must pass **unchanged** — the factoring is behavior-preserving by definition.
- Single-session persistence, transcript checkpointing, and session-list suites stay green.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline|STEP-27-03 Persist bus traffic and render the bus timeline]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
