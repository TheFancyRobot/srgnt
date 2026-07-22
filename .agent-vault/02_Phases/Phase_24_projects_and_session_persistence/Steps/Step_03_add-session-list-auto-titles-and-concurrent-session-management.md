---
note_type: step
template_version: 2
contract_version: 1
title: Add session list auto-titles and concurrent session management
step_id: STEP-24-03
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - STEP-24-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Add session list auto-titles and concurrent session management

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add session list auto-titles and concurrent session management.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: Navigation lists sessions per project with harness badges and live status (idle/connecting/running/awaiting_permission/error/closed); sessions get auto-titles from the first prompt; multiple sessions run concurrently across projects with per-session IPC routing and supervisor bookkeeping.
- Starting files: renderer `Navigation.tsx` + new session-list components; main-process session service (routing map sessionId → connection); SessionStore + ProjectStore from earlier steps.
- Validate: E2E with two concurrent mock sessions in different projects streaming independently; status badges track mock scenario transitions; titles derive and persist.

## Why This Step Exists

- Makes sessions plural, named, and persistent-by-default — the visible payoff of 01/02, and the surface resume (04) and lifecycle cleanup (05) plug into.
- Forces the main-process session service into its final shape: per-session IPC routing and persistence taps replace Phase 23's single-ephemeral-session assumption; the STEP-23-03 in-memory audit stream becomes a real disk sink here.

## Prerequisites

- STEP-24-01 merged; STEP-24-02 API-stable (list is grouped by project). 02 and 03 can overlap after 01 per the phase note.
- Read the Phase-23 `ChatSessionController` and `packages/harness/src/supervisor/` — the Supervisor already supports many handles, `markActivity`, `disposeAll`; design guidance in the brief: move to ONE shared Supervisor (handle id = srgnt session id).

## Relevant Code Paths

- `packages/desktop/src/main/chat/` — session service: routing map srgnt-sessionId → connection state; persistence taps (`client/prompt`, `acp/session_update`, `client/stop`, permission kinds); auto-title derivation on first prompt.
- `packages/contracts/src/ipc/contracts.ts` — `chat:session:list`/`chat:session:open` + status push carrying `{sessionId, status}`.
- `packages/desktop/src/renderer/components/chat/SessionList.tsx` (new, chat panel side-panel content) + per-session transcript state keyed by session id; persisted events replay through the SAME `transcriptReducer` as live updates.
- `packages/contracts/src/session.ts` `SSessionStatus` — persisted status vocabulary (renderer-only states like `connecting` are never written to meta).

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (supervisor invariants; capability-driven UI)

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

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Validation_Plan|Validation Plan]].
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
