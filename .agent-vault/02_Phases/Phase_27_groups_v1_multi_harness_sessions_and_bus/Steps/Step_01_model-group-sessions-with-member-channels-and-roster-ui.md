---
note_type: step
template_version: 2
contract_version: 1
title: Model group sessions with member channels and roster UI
step_id: STEP-27-01
phase: '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Model group sessions with member channels and roster UI

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Model group sessions with member channels and roster UI.
- Parent phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]].
- Exact outcome: `kind: 'group'` sessions exist end to end — GroupInstance/MemberSpec contracts, group-session creation UI (pick members: role + harness + config), per-member supervised agent processes with separate event-log channels (`group/members/<role>/events.jsonl`), a roster side panel, and member tabs hosting per-member chat views.
- Starting files: `packages/contracts/src/` (group schemas); `packages/harness/src/groups/`; `packages/runtime/src/sessions/` (member channels); renderer `chat/` + `sidepanels/`.
- Validate: a group session with two mock-agent members runs concurrently, each tab streaming independently; event logs land in the correct member directories.

## Why This Step Exists

- Every later step (broker, timeline, tiers, escalation) hangs off the group model built here; getting member specs, channels, and the roster/tabs shell right first makes the rest wiring, not modeling.
- Mostly composition of shipped machinery: `SSession` already carries `kind`/`parentSessionId`; Phase-24 SessionStore owns JSONL channels; Phase-23 `ChatSessionController` owns the per-member spawn→session/new→pump loop.

## Prerequisites

- **Phase entry gate resolved first**: DEC-0018 re-opened, Pi bus path decided and recorded (see Execution Brief's ENTRY GATE section — it blocks this step, not just STEP-27-02).
- Phases 23–26 merged; read `packages/contracts/src/session.ts`, the STEP-24-01 brief (SessionStore layout), `dev-console/session-controller.ts` + STEP-23-01 brief (controller pattern incl. the lazy-ESM harness import), `docs/pi-teams.md` + `.pi/teams.yaml`.

## Relevant Code Paths

- `packages/contracts/src/group.ts` (new: `SGroupMemberSpec`, optional `SSession.members`) + `contracts/src/ipc/`.
- `packages/runtime/src/sessions/` — extend `paths.ts` + store with `group/{members/<role>/events.jsonl, notes/, bus.jsonl}` layout.
- `packages/desktop/src/main/chat/` — `GroupSessionController` on the shared Supervisor (handle `<sessionId>:<role>`).
- Renderer: group creation UI, roster via chat `sidePanelContent` (not `Navigation.tsx`), member tabs hosting existing ChatView; `docs/group-worktrees.md` (new recipe doc + roster warning).

## Required Reading

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (group data layout + key components)
- `docs/pi-teams.md` and `.pi/teams.yaml` (the workflow being productized)

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

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui/Validation_Plan|Validation Plan]].
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
