# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `system/pipeline_*` event kinds decode through the `SGroupBusEvent` tolerant reader.
- `pnpm --filter @srgnt/harness test` — the pure `pipeline-runner.ts` state-machine suite (scripted `invokeMember` fake, injected clock).
- `pnpm --filter @srgnt/desktop test` — `PipelineController` invoke wiring, persist-before-advance, gate/abort IPC, restart replay.
- `pnpm typecheck && pnpm lint`.

## Acceptance Checks

- **Linear flow**: a 3-stage pipeline with `stop_reason` completions runs entry→…→`done`, emitting one `stage_entered`/`stage_completed` pair per stage and exactly one `pipeline_completed`.
- **Ordered completion conditions**: a stage declaring `[{ token: 'ISSUE REPORT' }, { stop_reason }]` completes on the token when the scripted turn contains it (recording `completedBy = token`) and on end-of-turn when it does not (recording `completedBy = stop_reason`) — one turn each way, no re-prompt in either case. A stage with a token condition and *no* total fallback (a hand-written fixture that bypassed STEP-28-01's validator) re-prompts up to the cap and then fails with a named reason.
- **`ifCompletedBy` routing**: the same stage routes to different targets depending on which condition matched, driven only by the recorded `completedBy`.
- **Loop-back within budget**: QA stage `ifOutputContains` takes its `kind: 'loop_back'` edge to implement; iteration counter increments; the run still terminates.
- **Loop-back exhaustion**: force repeated QA failure — at `maxIterations` the runner takes the fallback transition or emits `pipeline_failed { reason: 'max_iterations_exhausted' }`. It never loops forever (the headline honesty guarantee).
- **User gate**: a `user_gate` stage emits `gate_awaiting` and suspends; `resumeGate(runId, stageId, 'approve')` advances via the approve transition, `'reject'` via the reject transition; `abortRun` ends cleanly with `pipeline_failed { reason: 'aborted' }`.
- **Tier-2-only member**: a member with `capabilityOverrides: { mcpServers: false }` (Pi's shipped clamp) participates as a stage — its handoff arrives as a nudge/prompt preamble, its output is read back, and the pipeline completes. No path assumes tier 1.
- **Rebuildable-from-log**: after a completed run, replaying `bus.jsonl` alone reconstructs the exact stage sequence, iteration counts, per-stage `completedBy`, and the rendered input of every stage (feeds STEP-28-03). "Alone" is literal — the reconstruction must not touch `groups/templates/`.
- **Reconstruct after a template edit** (the invariant that makes the log authoritative): run a pipeline to completion, then edit the source template on disk (rename a stage, drop the loop-back, change a token) — or delete the file outright — and replay. The reconstruction still yields the *original* pipeline definition, stage sequence, and gate prompt from the run's `pipeline_started` snapshot, and the UI reports the run's `templateDigest` as differing from the current file rather than silently showing the new shape.
- **Two runs in one group**: start, complete, and start a second run in the same group; replay separates them by `runId`, with no cross-contamination of iteration counters or pending gates, and a pending gate on run B resumes correctly while run A stays terminal.
- **Kickoff task and inputs survive**: `{{task}}` resolves from the persisted `kickoffTask`, and every `stage_entered.renderedInput` matches the prompt text actually handed to `invokeMember` (assert on the recorded string, not just that the field exists).

## Edge Cases

- Restart mid-stage: `stage_entered` with no completion → member's last turn marked `interrupted`; run resumable only if the member's harness reports load/resume, else surfaced interrupted-not-resumable (no false "running").
- Stage member crash mid-turn → `pipeline_failed { reason: 'member_crashed' }`; other members and the group session survive.
- Stop reason `refusal` / `max_tokens` on a `stop_reason` stage → stage failure with the reason named, not a silent completion.
- Gate left pending across app restart → replay restores `gate_awaiting`; the UI can still resume it (gate state is in the log, not memory).
- Persist-before-advance: kill the process between `appendBusEvent` and the next prompt — replay shows the completed stage, the next stage re-enters cleanly (no double-prompt, no skipped stage).
- Unknown `{{placeholder}}` never reaches the runner (STEP-28-01 rejects it at load) — a template that bypassed validation degrades to leaving the literal token, not crashing.

## Regression Expectations

- Phase-27 manual group sessions (no pipeline) behave identically — the runner is additive; `GroupSessionController` paths untouched for pipeline-less groups.
- `bus.jsonl` readers from STEP-27-03 tolerate the new `system/pipeline_*` kinds (they are just more open-kind values) — the bus timeline renders them as generic system rows without the GroupBoard.
- All mock-agent suites green (no scenario-schema changes required — the runner drives existing prompt turns).

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs|STEP-28-02 Implement deterministic pipeline runner with gates and loop-backs]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
