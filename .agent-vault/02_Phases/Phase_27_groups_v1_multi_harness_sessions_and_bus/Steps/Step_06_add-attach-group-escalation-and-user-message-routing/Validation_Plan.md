# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` — `escalate(...)` unit tests (lineage fields set both ways; handoff persisted to the bus before member start; cancel = zero side effects); composer routing unit tests (target selection → correct `to` addressing).
- `pnpm --filter @srgnt/desktop test:e2e` — escalation spec + routing spec (added to the explicit `test:e2e*` file lists).

## Acceptance Checks

- **Escalation E2E (the step's headline):** run a mock single session, choose "Attach Group", pick two mock members, edit the prefilled handoff, create — the group session exists with `parentSessionId` set; both member scenarios assert the handoff text arrived (`expect_prompt` `contains` a distinctive handoff phrase for tier-2 delivery; `call_mcp_tool group_inbox` for a tier-1 member); and `bus.jsonl` shows the canonical order — `seq 1` = `system/group_created`, `seq 2` = the handoff `{ from: 'user', to: '*' }` (the first user row on the timeline), with both records already on disk before the first member-start event.
- Auto-send is unconditional: the dialog exposes exactly one primary action ("Create & Send"); there is no create-without-send path to assert, and the members receive the handoff without any further user action.
- Lineage navigation: parent session shows the "escalated" chip linking to the group; the group header chip navigates back to the parent; both survive an app restart (fields are persisted meta).
- Routed vs broadcast: user sends "only for reviewer" targeted at one member → exactly that member's scenario receives it (`expect_prompt`), the other member's assertions prove non-receipt; a broadcast reaches both; the timeline rows show `user → reviewer` and `user → *` addressing correctly.
- Handoff prefill is deterministic: same transcript tail → byte-identical prefill (no LLM, no timestamps inside the template body).

## Edge Cases

- Cancel the dialog after picking members but before create → no session dir, no processes, no bus file.
- Escalate a read-only (non-resumable) session → works; handoff template pulls from the persisted transcript; parent stays read-only.
- Route to a member that is mid-turn → delivery defers per the 04 rules; composer shows pending-nudge state; message is on the timeline immediately (persisted ≠ delivered).
- Route to a crashed member → message persists on the bus; delivered after respawn + idle; no error thrown at the user beyond the member's existing crash surface.
- Double-click "Create & Send" → exactly one group session (action is idempotent/disabled while in flight).

## Regression Expectations

- Phase-24 fork-with-handoff for single→single sessions unchanged (shared template util refactor must keep its tests green).
- Session list, lineage chips, and project switcher suites stay green.
- Full-phase check after this step (it is the last): the PHASE-27 acceptance list runs end-to-end — including the mixed real-harness manual scenario (Pi tier-2 member + one tier-1-capable harness) recorded in a session note per the phase's validation note.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing|STEP-27-06 Add attach-group escalation and user message routing]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
