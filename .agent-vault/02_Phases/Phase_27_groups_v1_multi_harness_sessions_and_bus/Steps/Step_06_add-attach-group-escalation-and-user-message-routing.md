---
note_type: step
template_version: 2
contract_version: 1
title: Add attach-group escalation and user message routing
step_id: STEP-27-06
phase: '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-27-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Add attach-group escalation and user message routing

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add attach-group escalation and user message routing.
- Parent phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]].
- Exact outcome: any single session offers "Attach Group" — pick/instantiate members, compose an explicit handoff summary (prefilled from the transcript tail, user-editable), spawn the linked group session with `parentSessionId` navigable in both directions; the group composer routes user messages to a chosen member or broadcasts, and routed traffic appears on the bus timeline.
- Starting files: session UI (escalation action + handoff composer); group creation flow from STEP-27-01; broker routing from STEP-27-02.
- Validate: E2E — escalate a mock single session into a two-member group, handoff text arrives as the seed context, lineage links navigate both ways; routed vs broadcast messages land with correct addressing on the timeline.

## Why This Step Exists

- Makes groups reachable from the ordinary workflow: any single session escalates into a group with explicit, user-edited context carryover. User routing (member/broadcast) completes "the user is the orchestrator".

## Prerequisites

- STEP-27-03 merged (integrates with 04's delivery when both land). Read the STEP-24-04 brief + implementation — this step *reuses* its handoff template util and `parentSessionId`/`forkedSessionIds` lineage components (recorded assumption: no new contracts fields).

## Relevant Code Paths

- Renderer: "Attach Group" session action → escalation dialog (member picker from 01 + handoff composer, deterministic prefill from transcript tail, user-editable); group composer target selector (member / All).
- `GroupSessionController.escalate(...)` — create group with lineage set; handoff enters the bus as the first `from: 'user', to: '*'` event, persisted before member start; parent session untouched otherwise.
- Routing: user sends are ordinary bus events (`from: 'user'`) delivered per member tier via the 04 path; timeline renders addressing. Decision needed (default yes): handoff auto-sends on "Create & Send".

## Required Reading

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (session lineage model: `parentSessionId`)

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

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_06_add-attach-group-escalation-and-user-message-routing/Validation_Plan|Validation Plan]].
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
