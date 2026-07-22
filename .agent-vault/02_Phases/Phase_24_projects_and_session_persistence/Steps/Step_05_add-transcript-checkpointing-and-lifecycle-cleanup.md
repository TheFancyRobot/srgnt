---
note_type: step
template_version: 2
contract_version: 1
title: Add transcript checkpointing and lifecycle cleanup
step_id: STEP-24-05
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-17'
depends_on:
  - STEP-24-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Add transcript checkpointing and lifecycle cleanup

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add transcript checkpointing and lifecycle cleanup.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: `transcript.md` renders from the event log at checkpoints (session close + periodic while active) — human-readable, memsearch-indexable, never dual-written per token; lifecycle cleanup lands — idle reaping timers, quit-time best-effort `session/cancel` + kill-trees, and tolerant recovery from a corrupt JSONL tail line after a crash.
- Starting files: `packages/runtime/src/sessions/` (transcript renderer, checkpoint triggers); supervisor quit hooks in desktop main; crash-recovery path in the store reader.
- Validate: crash-mid-turn E2E (kill agent process, restart app, transcript intact minus in-flight chunk); quit leaves zero agent processes (process-tree assertion); checkpointed transcript matches the event log content.

## Why This Step Exists

- Closes the phase's remaining ARCH-0009 invariants: `transcript.md` derived (checkpointed, never dual-written per token) and no orphan processes under any exit path (idle reaping, bounded quit cleanup, crash recovery).
- Delivers the phase's headline acceptance test: kill mid-turn, lose at most the in-flight chunk, reopen to an instant intact transcript.

## Prerequisites

- STEP-24-04 merged (service, reconnect, statuses final).
- The Supervisor's idle-reap mechanism already exists (`idleTimeoutMs` + `markActivity` + `reaped` events) — this step configures and wires it, it does not build timers.

## Relevant Code Paths

- `packages/runtime/src/sessions/transcript.ts` (new) — pure deterministic `renderTranscript(events, meta)`.
- `packages/desktop/src/main/chat/` — checkpoint triggers (turn end, 30 s active timer, close, quit) + between-turns-only idle arming. **Crash-loss bound belongs to `events.jsonl`, not this cadence:** the "lose at most the in-flight chunk" guarantee is a property of the per-event `events.jsonl` append (STEP-24-01), which is the source of truth. `transcript.md` is a *derived cache* that is re-rendered from `events.jsonl` on reopen (see Execution Brief "rebuildable at any time from `events.jsonl` alone") — so a stale or missing 30 s transcript checkpoint after a crash costs nothing: the transcript is regenerated from the durable log. The 30 s cadence only bounds how fresh the on-disk `transcript.md` is for a *live external reader* (memsearch) while the app runs; it is explicitly NOT the crash-recovery bound.
- `packages/desktop/src/main/index.ts` — bounded `will-quit` cleanup under **one overall deadline** (recorded: 2 s total) covering ALL of best-effort `session/cancel` → final checkpoint → `supervisor.disposeAll()` — not 2 s for cancel alone. Each step gets the *remaining* time within the single budget; if the budget expires, cleanup stops best-effort and quit proceeds (kill-trees are the guaranteed backstop). The quit handler can never hang or be force-terminated with unbounded cleanup outside the deadline.
- `packages/contracts/src/session.ts` — extend `knownSessionEventKinds` with lifecycle audit kinds (`client/harness_crashed`, `client/harness_reaped`).
- Store reader (`truncatedTail`) → meta `interrupted` + renderer badge on open after crash.

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (derived-transcript + no-orphans invariants; corrupt-tail failure mode)

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

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup/Validation_Plan|Validation Plan]].
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
