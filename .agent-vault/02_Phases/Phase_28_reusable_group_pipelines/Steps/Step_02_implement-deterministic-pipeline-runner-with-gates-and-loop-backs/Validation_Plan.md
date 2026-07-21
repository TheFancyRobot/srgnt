# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `system/pipeline_*` event kinds decode through the `SGroupBusEvent` tolerant reader.
- `pnpm --filter @srgnt/harness test` — the pure `pipeline-runner.ts` state-machine suite (scripted `invokeMember` fake, injected clock).
- `pnpm --filter @srgnt/desktop test` — `PipelineController` invoke wiring, persist-before-advance, gate/abort IPC, restart replay.
- `pnpm typecheck && pnpm lint`.

## Acceptance Checks

- **Linear flow**: a 3-stage pipeline with `stop_reason` completions runs entry→…→`done`, emitting one `stage_entered`/`stage_completed` pair per stage and exactly one `pipeline_completed`.
- **Token condition**: a stage with `{ type: 'token', token: 'QA REVIEW REQUESTED' }` completes only when the scripted turn's final message contains the token; a turn without it re-prompts up to the cap, then fails with a named reason.
- **Loop-back within budget**: QA stage `ifOutputContains` loops back to implement; iteration counter increments; the run still terminates.
- **Loop-back exhaustion**: force repeated QA failure — at `maxIterations` the runner takes the fallback transition or emits `pipeline_failed { reason: 'max_iterations_exhausted' }`. It never loops forever (the headline honesty guarantee).
- **User gate**: a `user_gate` stage emits `gate_awaiting` and suspends; `resumeGate(runId, stageId, 'approve')` advances via the approve transition, `'reject'` via the reject transition; `abortRun` ends cleanly with `pipeline_failed { reason: 'aborted' }`.
- **Tier-2-only member**: a member with `capabilityOverrides: { mcpServers: false }` (Pi's shipped clamp) participates as a stage — its handoff arrives as a nudge/prompt preamble, its output is read back, and the pipeline completes. No path assumes tier 1.
- **Rebuildable-from-log**: after a completed run, replaying `bus.jsonl` alone reconstructs the exact stage sequence and iteration counts (feeds STEP-28-03).

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
