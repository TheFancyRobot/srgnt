# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` — `pipeline-projection` reducer unit suite + `GroupBoard.tsx` component suite.
- `pnpm --filter @srgnt/desktop test:e2e` — the mock pipeline renders and animates stage-by-stage.
- `pnpm typecheck && pnpm lint`.

## Acceptance Checks

- The board renders the **full declared pipeline** on open (pending stages greyed), then reflects the live run: active stage highlighted, completed stages marked, `×N` iteration counters on looped stages.
- **Projection is a pure fold**: replaying the same `SGroupBusEvent[]` twice yields identical view state (asserted directly). Rebuild-from-disk after a reload shows the same board with no live stream (history alone suffices).
- **The graph comes from the log, not the template file**: the reducer is fed only events; the rendered stage graph is the `pipeline_started` snapshot. Mutating (or deleting) the source template between the run and the render changes nothing on the board.
- **Multiple runs in one group**: a log containing two runs renders the selected `runId` only — iteration counters and gate state never merge across runs, and the default selection is the most recent run.
- A `gate_awaiting` run shows the gate stage with an Approve / Reject control; clicking Approve/Reject calls the STEP-28-02 gate IPC and the board advances on the resulting `gate_resolved` + `transition_taken` events.
- A `pipeline_failed { reason: 'max_iterations_exhausted' }` run shows the failed stage and the reason; a `pipeline_completed` run shows terminal success.
- Each stage node deep-links into that stage's member transcript at the turn the stage ran.
- Member/harness badges match the roster (reused components), including a tier-2-only Pi member rendered without implying it has the MCP bus.

## Edge Cases

- Interrupted restart: a `stage_entered` with no completion renders as an interrupted/active-but-stalled stage (not "done", not crashed) — matches the runner's honest recovery state.
- Unknown/newer `system/pipeline_*` kind → benign generic marker, board does not crash.
- Pipeline-less group session → GroupBoard tab absent; bus timeline + member tabs unaffected.
- **Mount authority is `system/pipeline_started` alone:** (a) a group whose template declares a pipeline but whose log has no `pipeline_started` → tab absent; (b) a group with a `pipeline_started` in its log whose source template has since been edited to drop the pipeline, or deleted outright → tab still present and rendering the snapshot. Assert both directions; a test that only covers "has pipeline → tab shows" does not cover this finding.
- Truncated `bus.jsonl` tail (Phase-27 corrupt-tail tolerance) → projection folds the valid prefix; the dropped tail surfaces as an interrupted marker, consistent with the timeline.
- Double-approve guard: the gate control disables optimistically after a click so a second approve cannot fire before `gate_resolved` arrives.
- A loop-back that revisits a stage shows the counter incrementing, not duplicate nodes.

## Regression Expectations

- Bus timeline (STEP-27-03) and member tabs render unchanged — the board is an additive tab reading the same event stream.
- No new main-process IPC introduced by this step (only the STEP-28-02 gate/abort IPC is consumed); if the board needed data the events lack, that gap was fixed in STEP-28-02, not worked around here.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard|STEP-28-03 Visualize stage progress on GroupBoard]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
