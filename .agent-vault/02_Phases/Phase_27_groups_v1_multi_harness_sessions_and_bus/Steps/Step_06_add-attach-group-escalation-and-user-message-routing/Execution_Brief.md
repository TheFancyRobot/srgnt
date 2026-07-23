# Execution Brief

## Why

- "Attach Group" is how groups enter the ordinary workflow: a single session hits a wall ("this needs a reviewer and a tester"), and one action escalates it into a group with the context carried over *explicitly*. Without it, groups are a separate feature you must plan in advance; with it, they are an escape hatch from any session.
- User routing (send-to-member / broadcast) completes the phase's "the user is the orchestrator" premise: the user must be able to address one member or all, and see that traffic on the same timeline as agent traffic.

## Prerequisites

- STEP-27-03 merged (group creation flow from 01, broker routing from 02, timeline from 03; nudge delivery from 04 needed for tier-2 members to receive routed messages — 06 can start after 03 and integrates with 04 when both land, per the phase's parallelization note).
- Read: the STEP-24-04 brief + implementation (fork-with-handoff: deterministic handoff template, prefilled + user-editable, `parentSessionId` + `forkedSessionIds` lineage, navigation chips) — this step *reuses* that machinery for a group target rather than inventing a second handoff; `packages/contracts/src/session.ts` (`parentSessionId` already on `SSession`).

## Likely Code Paths

- Renderer — session menu action "Attach Group" on any `kind: 'single'` session (any status — including read-only reopened sessions; recorded assumption): opens the escalation dialog = member picker from 01 + handoff composer. Handoff prefill: the STEP-24-04 deterministic template over the transcript tail (same util, group flavor: goal, current state, key files touched); user-editable before anything is sent.
- Lineage — reuse Phase-24 fields exactly (recorded assumption: **no new contracts fields**): group session gets `parentSessionId = <single session id>`; parent's `forkedSessionIds` gains the group session id. Navigation chips both ways (parent shows "escalated to group →", group header shows "← from session"); same components as the fork flow.
- Handoff delivery — **settled, not a decision to make during execution.** The canonical bus order for an escalation is fixed: `seq 1` = `system/group_created`, `seq 2` = the handoff as `{ from: 'user', to: '*' }`, and only then do members start. The handoff is therefore the **first user/message event on the bus** — it is not the first *bus record*, and the brief means the former wherever it says "first event". Delivery is per member tier (tier 1: inbox; tier 2: it IS the seed prompt / first digest). Auto-send-on-create is the behavior: the dialog has one primary action, "Create & Send", and pressing it performs the whole sequence above — no two-step create-then-send variant, no setting. This is deliberately unlike the Phase-24 "never auto-sent" fork case, and the difference is the compose step: here the user typed and confirmed the text in the same dialog, so a second confirmation is pure friction. If a future need for staged sending appears, it is a new step, not a toggle bolted onto this one.
- Composer routing — group composer gains a target selector: a member role or "All members" (default: last-used, initially All; recorded assumption). Routed send = bus event `from: 'user', to: <role>|'*'` (persisted by 03), delivered as a prompt turn to the targeted member(s) through the same per-tier delivery the nudge path uses (04) — user messages are ordinary bus traffic, no parallel channel. The addressed member's tab shows the turn; the timeline shows the user row with correct addressing.
- `GroupSessionController` — `escalate(singleSessionId, members, handoffText)` executes exactly the canonical order above: create the group session via the 01 flow with lineage fields set → append `system/group_created` (seq 1) → append the user handoff broadcast (seq 2) → start members. Both appends complete before the first member spawns, so a member that spawns slowly still receives the handoff (this rides the awaited persist-before-fan-out contract from 02/03; no member start races the journal).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- The parent single session is untouched by escalation: not closed, not mutated beyond `forkedSessionIds` — the user may keep using it (matches fork semantics).
- Cancel anywhere in the dialog → zero side effects (no session dir, no processes).
- Broadcast to a busy member queues per the 04 rules (never interrupts a turn); the composer shows per-member delivery state (delivered / pending-nudge) from bus + nudge events rather than inventing new state.
- Escalating a group session is not offered (single → group only, v1).

## Execution Checklist

1. Build the escalation dialog (member picker + handoff composer with deterministic prefill reusing the 24-04 template util).
2. Implement `escalate(...)` in the controller with lineage set and the canonical bus ordering (`system/group_created` seq 1, user handoff broadcast seq 2, members started last).
3. Wire navigation chips both ways off `parentSessionId`/`forkedSessionIds` (reuse fork components).
4. Add the composer target selector; route user sends onto the bus with per-tier delivery; addressing rendered on the timeline.
5. E2E per the Validation Plan; record any deviations in Implementation Notes (the auto-send question is already settled above — do not reopen it mid-step).

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing|STEP-27-06 Add attach-group escalation and user message routing]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Prior art: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04]] (handoff template + lineage machinery this step reuses)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (session lineage model)
