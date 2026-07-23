---
note_type: step
template_version: 2
contract_version: 1
title: Implement deterministic pipeline runner with gates and loop-backs
step_id: STEP-28-02
phase: '[[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-28-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement deterministic pipeline runner with gates and loop-backs

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement deterministic pipeline runner with gates and loop-backs.
- Parent phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]].
- Exact outcome: a main-process pipeline runner executes Pipeline definitions as a state machine over ACP prompt turns — fill the stage prompt template (prior-stage output + bus context) → `session/prompt` the stage's member → await the completion condition (stop reason / explicit token / user gate) → evaluate transitions incl. loop-backs with `maxIterations` → advance; run state persists as a self-sufficient event log (every event carries a `runId`; `pipeline_started` inlines the immutable pipeline snapshot, template id/version/digest, member bindings and kickoff task; `stage_entered` records the rendered prompt) so app restarts recover honestly from the log alone — never by re-reading the mutable template file — with interrupted turns marked and resumable where the harness supports load.
- Starting files: `packages/harness/src/groups/` (runner beside broker); Pipeline schemas from STEP-28-01; run-state persistence via `@srgnt/runtime` sessions module.
- Validate: unit tests with scripted mock members covering linear flow, token-condition matching, loop-back exhaustion at `maxIterations`, user-gate pause/resume/abort, and restart recovery.

## Why This Step Exists

- The heart of the phase: turns a static `SPipeline` into a running multi-agent workflow. **Deterministic and client-side by decision (D12)** — plain code drives stages/transitions/`maxIterations`, no LLM coordinator in the loop. Do not add any "ask a model what to do next" path.
- Composes Phase-27 machinery: stages address members by role, handoffs ride the member's bus tier (must work with a **tier-2-only Pi member**, no MCP), and run-state changes persist as `SGroupBusEvent`s on the same `bus.jsonl` — making the run rebuildable-from-log for 03 and restart recovery.

## Prerequisites

- STEP-28-01 merged (schema + loader). PHASE-27 merged through STEP-27-04 (broker, `GroupSessionController`, member channels, `bus.jsonl`/`SGroupBusEvent`, three bus tiers, nudge delivery).
- Read: STEP-27-02 brief (broker event model + harness/disk boundary), STEP-27-03 brief (`appendBusEvent`/`readBusEvents`, persist-before-fan-out, open-kind space), STEP-27-04 brief (tier delivery), `packages/harness/src/testing/mock-agent/{runner.ts,scenario.ts}` (one scripted turn per `prompt()`), ARCH-0009 pipeline flow + restart recovery.

## Relevant Code Paths

- `packages/harness/src/groups/pipeline-runner.ts` (new) — pure deterministic state machine; injected `invokeMember(role, text)` + clock; disk/transport-free; emits `stage_entered`/`stage_completed`/`transition_taken`/`gate_awaiting`/`gate_resolved`/`run_completed`/`run_failed`.
- `packages/contracts/src/pipeline.ts` (extend) — `system/pipeline_*` kinds in the `SGroupBusEvent` open-kind space (no new log/file).
- `packages/desktop/src/main/chat/` `PipelineController` (new) — wires `invokeMember` to `GroupSessionController.prompt`, persist-before-advance tap, gate/abort IPC, restart replay from `bus.jsonl`.
- Loop semantics, completion-condition handling, and interrupted-turn recovery: the Execution Brief.

## Required Reading

- [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (deterministic-runner invariant + pipeline flow)

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

- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs/Validation_Plan|Validation Plan]].
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
