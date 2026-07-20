---
note_type: step
template_version: 2
contract_version: 1
title: Persist bus traffic and render the bus timeline
step_id: STEP-27-03
phase: '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-27-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Persist bus traffic and render the bus timeline

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Persist bus traffic and render the bus timeline.
- Parent phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]].
- Exact outcome: all bus traffic (sends, broadcasts, system events like member start/stop) persists append-only to `group/bus.jsonl` through the SessionStore machinery; a bus timeline view renders the interleaved history (filterable by member/direction) alongside member activity, and restores fully after app restart.
- Starting files: `packages/runtime/src/sessions/` (bus log reuse of JSONL store); renderer group UI from STEP-27-01 (timeline component new).
- Validate: restart-recovery E2E — run a two-member exchange, restart the app, timeline matches; filter behavior covered by component tests.

## Why This Step Exists

- `bus.jsonl` is to a group what `events.jsonl` is to a session: the durable record — and persist-before-fan-out is the delivery guarantee across broker/socket restarts (ARCH-0009 failure mode).
- The timeline makes multi-agent work legible; it also feeds the STEP-27-04 mailbox mirror and Phase-28 pipeline traces.

## Prerequisites

- STEP-27-02 merged (broker emitting typed events); STEP-27-01 layout in place.
- Read the STEP-24-01 brief + `packages/runtime/src/sessions/event-log.ts` — the exact JSONL rules (single-write appends, tolerant tail, seq recovery) this log reuses.

## Relevant Code Paths

- `packages/contracts/src/group.ts` — `SGroupBusEvent` (open-kind, tolerant reader mirroring `readSessionEvent`).
- `packages/runtime/src/sessions/group-log.ts` (new) — recorded default: factor a generic JSONL core out of `event-log.ts` and reuse it.
- Desktop main: persist-before-fan-out tap in `GroupSessionController`; Supervisor lifecycle events → `system/*` rows.
- Renderer: `BusTimeline` tab (history from disk + live append + member/direction filters); v1 interleaving = bus + lifecycle rows only.

## Required Reading

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
