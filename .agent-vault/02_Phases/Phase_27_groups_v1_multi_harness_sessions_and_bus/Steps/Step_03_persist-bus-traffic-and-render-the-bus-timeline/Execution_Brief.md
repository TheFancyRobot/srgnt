# Execution Brief

## Why

- `bus.jsonl` is to a group what `events.jsonl` is to a single session: the durable record. Persisting bus traffic before fan-out is also the delivery guarantee ARCH-0009's failure-mode section leans on ("messages persist in `bus.jsonl` before fan-out, so delivery resumes without loss" across broker/socket restarts).
- The timeline is the product surface that makes multi-agent work legible — without it a group is N opaque tabs. It also feeds STEP-27-04's mailbox mirror (same event source) and Phase 28's pipeline traces.

## Prerequisites

- STEP-27-02 merged (broker emitting typed events). STEP-27-01's store layout in place (`busLogPath` already derived in `paths.ts`).
- Read: the STEP-24-01 Execution Brief + resulting `packages/runtime/src/sessions/event-log.ts` (append serialization, tolerant tail, seq recovery — the exact rules to reuse); `packages/contracts/src/session.ts` (`SSessionEvent` as the envelope precedent); ARCH-0009 Failure Modes (corrupt JSONL tail, socket loss).

## Likely Code Paths

- `packages/contracts/src/group.ts` — add `SGroupBusEvent`: `{ seq, ts, kind, from, to, text?, payload? }` with `kind` an **open string** over known values `'message' | 'system/member_started' | 'system/member_stopped' | 'system/member_crashed' | 'system/tier_changed' | 'system/group_created'` (tolerant-reader convention identical to `SSessionEvent.kind`); `from` = member role or `'user'` or `'system'`; `to` = role or `'*'`. Tolerant `readGroupBusEvent` mirroring `readSessionEvent`. Round-trip + tolerance tests.
- `packages/runtime/src/sessions/group-log.ts` — bus log on the same mechanics as `event-log.ts`: append-only single-write lines serialized per group, store-owned dense `seq`, tail-tolerant reads (`{ events, truncatedTail }`), seq recovery from last valid line. **Recorded default: factor the generic JSONL append/read core out of `event-log.ts` and reuse it** (both logs share every rule); if the factoring bloats, copying the pattern is acceptable — record which in Implementation Notes.
- Desktop main — the persistence tap: subscribe to broker events in `GroupSessionController`, append to the store, **then** allow fan-out (persist-before-deliver, awaitable per the 02 emit contract); member lifecycle events from the shared Supervisor (`crashed`/`reaped`/`ready` for `<sessionId>:<role>` handles) also append as `system/*` bus events.
- Renderer — `BusTimeline` view (a group-session tab beside the member tabs): renders the interleaved bus history newest-last, live-appended via the existing update push channel; filter controls by member (from/to) and direction (agent↔agent, user→member, system); each message row shows from → to, time, text. Loads history from disk on open (IPC read of `bus.jsonl` through the store), then streams — same replay-then-live pattern the Phase-24 session reopen uses.
- v1 interleaving scope (recorded assumption): the timeline shows **bus + system events only**, with member activity represented by the `system/*` lifecycle rows — deep interleaving of member chat content into the timeline is deferred (each member's full stream already has a tab). "Alongside member activity" in the step outcome is satisfied by the lifecycle rows.

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- `seq` is per-group, store-owned, dense; broker events carry no seq (the store stamps on append).
- `bus.jsonl` is append-only forever; the timeline never rewrites it; unknown `kind` values render as a generic system row (never crash — tolerant-reader invariant).
- Restart recovery: on group reopen the timeline renders purely from disk; a truncated tail is dropped exactly like the session log (`truncatedTail` surfaces as an "interrupted" marker row).
- Filters are renderer state only — no query layer, full-scan reads are fine at v1 volume (same stance as STEP-24-01).

## Execution Checklist

1. Add `SGroupBusEvent` + tolerant reader to contracts with tests.
2. Factor/reuse the JSONL core; implement `group-log.ts` + store facade methods (`appendBusEvent`, `readBusEvents`); property tests.
3. Wire the persist-before-fan-out tap and Supervisor lifecycle → `system/*` events in `GroupSessionController`.
4. Build `BusTimeline` (history load + live append + filters); component tests for filtering and unknown-kind rendering.
5. Run the Validation Plan; record deviations in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline|STEP-27-03 Persist bus traffic and render the bus timeline]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Prior art: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records|STEP-24-01]] (JSONL rules this log reuses)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (persist-before-fan-out, corrupt-tail tolerance)
