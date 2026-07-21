# Execution Brief

## Why

- This is the heart of the phase: the mechanism that turns a static `Pipeline` (STEP-28-01) into a running multi-agent workflow. Everything else visualizes (03) or authors (04) what this step executes.
- The **deterministic, client-side** design is a recorded decision (phase note / decision log D12), not an implementation preference. The runner is plain code — stages, transitions, completion conditions, `maxIterations` — with **no LLM coordinator** in the loop. That buys reproducibility, debuggability, and token-free orchestration. A coordinator-role *member* over the bus stays possible but is user-configured, never shipped runner logic. Do not introduce any "ask a model what to do next" path.
- It composes Phase-27 machinery rather than replacing it: stages address group members by role; a stage handoff is a bus message delivered at the member's tier; run-state changes persist as `SGroupBusEvent`s on the same `bus.jsonl` under the same JSONL rules. A pipeline must run correctly with a **tier-2-only Pi member** (no MCP bus) — the runner never assumes tier 1.

## Prerequisites

- STEP-28-01 merged (`SPipeline`/`SStage`/`SCompletionCondition`/`STransition`, `validateGroupTemplate`, the template loader). PHASE-27 merged through STEP-27-04 (GroupBroker, `GroupSessionController`, member channels, `bus.jsonl` + `SGroupBusEvent`, the three bus tiers, nudge delivery, mailbox mirror).
- Read fully: the STEP-27-02 Execution Brief (broker event model + the harness/disk boundary rule — the runner obeys the same split); the STEP-27-03 Execution Brief (`SGroupBusEvent` open-kind space, persist-before-fan-out, `group-log.ts`/store facade `appendBusEvent`/`readBusEvents` — pipeline state rides these); the STEP-27-04 Execution Brief (tier derivation + how a member is prompted — the runner reuses `GroupSessionController`'s `session/prompt` path, it does not open its own connections); `packages/harness/src/testing/mock-agent/{runner.ts,scenario.ts}` (the mock is scripted **per prompt turn** — each `prompt()` replays the whole directive list and returns `scenario.stopReason`; multi-stage E2E therefore needs one scenario/scripted-turn per expected turn — see Validation Plan).
- Read ARCH-0009 "Pipeline" data-flow bullet + Failure Modes (the exact loop and the restart-recovery expectation).

## Likely Code Paths

- `packages/harness/src/groups/pipeline-runner.ts` (new; beside `broker.ts`) — the **pure deterministic state machine**, transport-free and disk-free (same boundary as the broker):
  - Input: a validated `Pipeline` + member roster + an injected `invokeMember(role, promptText) => Promise<{ finalText, stopReason }>` (the seam the desktop wires to `GroupSessionController.prompt`; tests inject a scripted fake). Also an injected clock (copy `SupervisorClock`) so `maxIterations`/timeouts are testable without sleeping.
  - Loop per ARCH-0009: resolve current stage → render `promptTemplate` (substitute `{{task}}`/`{{previous_output}}`/`{{stage.<id>.output}}`/`{{iteration}}`) with a **system-prompt preamble** prepended on a member's first turn (the STEP-28-01 fallback: ACP has no portable system-prompt field) → `invokeMember` → evaluate `completion`:
    - `stop_reason`: complete when `stopReason === 'end_turn'` (treat `refusal`/`max_tokens` as a stage failure → run fails with a named reason; `cancelled` → run paused/aborted).
    - `token`: complete when `finalText` contains the token (the `QA REVIEW REQUESTED` convention); if the turn ends without the token, re-prompt the same member with a continuation nudge up to a small cap, then fail (prevents infinite same-stage turns).
    - `user_gate`: emit `gate_awaiting`, **suspend the run** (return control, do not block a thread) until the desktop resolves approve/reject.
  - Transitions: evaluate the stage's ordered `transitions`, first match wins (`ifOutputContains`, `ifGate`, else the fallback). A transition to an already-visited stage is a loop-back: increment that stage's visit count; if it would exceed `maxIterations`, do **not** loop — take the fallback transition or fail the run with `max_iterations_exhausted` (honest termination, phase acceptance criterion).
  - Emits typed run events (`stage_entered`, `stage_completed`, `transition_taken`, `gate_awaiting`, `gate_resolved`, `run_completed`, `run_failed`) — **it persists nothing**; the desktop tap writes them to `bus.jsonl` (harness/disk boundary). Design the emit API awaitable so persist-before-advance holds.
- `packages/contracts/src/pipeline.ts` (extend STEP-28-01) — add the run-event kinds to the `SGroupBusEvent` **open-kind** space as `'system/pipeline_*'` (`pipeline_started`, `stage_entered`, `stage_completed`, `transition_taken`, `gate_awaiting`, `gate_resolved`, `pipeline_completed`, `pipeline_failed`); payloads carry `{ stageId, iteration, outputRef?, reason? }`. Reuse `SGroupBusEvent`'s tolerant reader — no new log type, no new file. This is what makes run state **rebuildable-from-log** (03 renders it; restart recovers from it).
- `packages/desktop/src/main/chat/` — `PipelineController` (new, beside `GroupSessionController`): hosts a runner per running group, supplies `invokeMember` (routes to the member's `session/prompt` via the existing per-member pump; the digest/handoff text rides the member's tier — tier-2 Pi gets it as a nudge/prompt preamble, tier-1 members may additionally see it as a `group_send`), taps run events → `appendBusEvent` **then** advance, and exposes IPC `resumeGate(runId, stageId, 'approve'|'reject')` / `abortRun(runId)`.
- **Run-state persistence + restart recovery**: there is no separate run-state file — the run *is* its `system/pipeline_*` event sequence on `bus.jsonl`. On group reopen, `PipelineController` replays the bus log to reconstruct current stage + per-stage iteration counts; a `stage_entered` with no matching `stage_completed`/`gate_*` = an interrupted turn → mark that member's last turn `interrupted` (reuse `SSessionStatus` 'interrupted'), and resume only where the member's harness reports load/resume capability (else surface the run as interrupted-not-resumable, honestly — phase acceptance criterion).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- Sequential by default: one active stage, one active member turn at a time (phase non-goal: no parallel stages; the Phase-27 write-conflict stance carries over).
- The runner is transport/disk/clock-injectable and unit-testable with zero real processes — a scripted `invokeMember` fake drives every core test; the real bus/socket only appears in the desktop integration + E2E.
- Stage output = the final agent-message text of that stage's completing turn (thoughts/tool-calls excluded); stored by reference (the member channel already persists the full turn) — the bus event carries a pointer/snippet, not the whole transcript.
- User gates never time out on their own — a gated run waits indefinitely for the human (or an explicit abort). `maxIterations` default when omitted on a loop-back edge: a conservative small constant in one options object (no scattered magic numbers), documented.
- A member crash mid-stage fails the current run with `member_crashed` (recoverable per Phase-23 surface); the group session and other members survive (Phase-27 per-member isolation).

## Execution Checklist

1. Extend `pipeline.ts` contracts with the `system/pipeline_*` event kinds + payloads; tolerant-reader tests.
2. Build `pipeline-runner.ts` as the pure state machine (injected `invokeMember` + clock); unit tests: linear flow, token match/miss, loop-back within `maxIterations`, loop-back **exhaustion** → honest failure, user-gate suspend/resume/abort, stop-reason failure mapping.
3. Build `PipelineController` in desktop main: `invokeMember` wiring to `GroupSessionController`, persist-before-advance tap, gate/abort IPC, restart replay/recovery.
4. Integration test with two scripted mock members exercising a real gate + loop-back through the real bus, incl. a tier-2-only member (no MCP) receiving stage handoffs via nudge/prompt.
5. Run the Validation Plan; record deviations (esp. resume-capability behavior, gate IPC shape) in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs|STEP-28-02 Implement deterministic pipeline runner with gates and loop-backs]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- Substrate: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline|STEP-27-03]] (`SGroupBusEvent`, persist-before-fan-out), [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers|STEP-27-04]] (tier delivery)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (deterministic-runner invariant, pipeline data flow, restart recovery)
