---
note_type: step
template_version: 2
contract_version: 1
title: Visualize stage progress on GroupBoard
step_id: STEP-28-03
phase: '[[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-28-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Visualize stage progress on GroupBoard

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Visualize stage progress on GroupBoard.
- Parent phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]].
- Exact outcome: the GroupBoard shows a running pipeline as a stage graph — stages with member/harness badges, active-stage highlight, iteration counters on loop-backs, gate states awaiting the user, and links into each stage's member transcript at the right point.
- Starting files: renderer group UI (GroupBoard new component over existing tokens); pipeline run state from STEP-28-02.
- Validate: component tests over scripted run states (mid-loop, gated, completed, failed); E2E renders the mock pipeline's progression live.

## Why This Step Exists

- A running pipeline is otherwise invisible (N tabs + raw bus events). The GroupBoard shows which stage is active, how many times a stage looped, and which gate is waiting on the user — and it is where gates are approved/rejected.
- It is a **pure projection of persisted `system/pipeline_*` events** — the rebuildable-from-log invariant (like Phase-24's transcript, Phase-27's bus timeline). No new source of truth; the board is always reconstructable by replay, so it cannot desync from the run.

## Prerequisites

- STEP-28-02 merged (runner emits `system/pipeline_*`; `PipelineController` persists them; gate/abort IPC exists). STEP-28-01's `SPipeline` available so the board renders the full declared stage graph, not only visited stages.
- Read: STEP-27-03 brief + the resulting `BusTimeline` (replay-then-live pattern), STEP-27-01 roster/`sidePanelContent` registration + STEP-23-03/25-03 badge components, ARCH-0009 renderer surfaces.

## Relevant Code Paths

- Renderer `pipeline-projection` reducer (new, pure) — `(SGroupBusEvent[], runId?) => PipelineViewState`; events **only**, with the `SPipeline` taken from that run's `system/pipeline_started` snapshot in the log (never the mutable template file). The whole brain of the step, replay-idempotent.
- Renderer `GroupBoard.tsx` (new) — stage graph over existing tokens: active highlight, `×N` iteration counters, member/harness badges, gate Approve/Reject wired to STEP-28-02 IPC, stage→member-transcript deep links.
- Conditional group-session tab (mounts iff the group's `bus.jsonl` contains a `system/pipeline_started` event — never off the template or any mutable session field); reuses the timeline's `bus.jsonl` history + live push channel — no new IPC/main work.
- Layout stance, tolerant unknown-kind rendering, double-approve guard: the Execution Brief.

## Required Reading

- [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Validation_Plan|Validation Plan]]
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

- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard/Validation_Plan|Validation Plan]].
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
