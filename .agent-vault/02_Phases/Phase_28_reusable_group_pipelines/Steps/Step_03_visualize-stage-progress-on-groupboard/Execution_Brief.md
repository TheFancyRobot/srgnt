# Execution Brief

## Why

- A running pipeline is otherwise invisible: N member tabs plus a bus timeline of raw events don't tell you *which stage is active, how many times QA has looped, or that a gate is waiting on you*. The GroupBoard is the product surface that makes multi-agent automation legible and gate-actionable.
- It is a **pure projection of persisted events** — it renders the `system/pipeline_*` sequence STEP-28-02 writes to `bus.jsonl`, exactly the rebuildable-from-log invariant Phase-24's transcript and Phase-27's bus timeline already follow. No new source of truth: the board is derivable, disposable, and always reconstructable by replay. This keeps the visualization honest across restarts and impossible to desync from the run.

## Prerequisites

- STEP-28-02 merged (runner emits `system/pipeline_*` events; `PipelineController` persists them via `appendBusEvent`; gate/abort IPC exists). STEP-28-01's `SPipeline` available so the board can render the *full* stage graph (all stages/transitions), not only the stages visited so far.
- Read fully: the STEP-27-03 Execution Brief + the resulting `BusTimeline` renderer (the replay-then-live pattern this board reuses: load history from disk on open via the store IPC, then stream live-appended events through the existing update push channel); the STEP-27-01 roster panel + `sidePanelContent` registration (the GroupBoard is a group-session tab beside the member tabs and bus timeline — NOT `Navigation.tsx`, per the Phase-24 correction); the STEP-23-03/25-03 badge components (member/harness/quirk badges reused for per-stage member badges).
- Read ARCH-0009 renderer inventory ("GroupBoard + bus timeline" is a named surface).

## Likely Code Paths

- Renderer — a `pipeline-projection` reducer (pure function, unit-testable in isolation): `(SGroupBusEvent[], runId?) => PipelineViewState`. It takes the events **only** — the `SPipeline` it renders comes from that run's `system/pipeline_started` snapshot inside the log (STEP-28-02 inlines it there precisely so the board never reads the mutable template file), and events are filtered to the selected `runId`, defaulting to the most recent run in the log. Folds the `system/pipeline_*` sequence into `{ stages: [{ id, member, status: 'pending'|'active'|'done'|'failed', iterations }], activeStageId, gate?: { stageId, prompt }, runStatus: 'running'|'gated'|'completed'|'failed', failureReason? }`. This is the whole brain of the step — the component below is a dumb view of it. Because it is a fold over the log, replaying the same events always yields the same board (test this directly).
- Renderer — `GroupBoard.tsx` (new component over existing design tokens, no new visual system): the pipeline as a **stage graph** — nodes = stages (label, member/harness badge reused from the roster), the active stage highlighted, iteration counters shown on stages that have looped (`×N`), gate stages awaiting the user rendered with an **Approve / Reject** control that calls the STEP-28-02 gate IPC, edges = transitions (loop-back edges visually distinguished). Each stage node links into that stage's member transcript **at the turn where the stage ran** (deep-link into the existing member ChatView via the member handle + a turn/seq anchor — reuse the timeline's row→transcript jump if one exists, else add a minimal anchor).
- Renderer — register the board as a group-session tab (beside member tabs + `BusTimeline`); it mounts only for `kind: 'group'` sessions that have a `pipeline`. Plain manual groups (no pipeline) do not show it — the tab is conditional on the presence of `system/pipeline_started` in the log (or `SSession`/template carrying a pipeline).
- No new IPC and no main-process work: the board consumes the same `bus.jsonl` history + live stream the timeline already exposes, plus the gate/abort IPC already added in STEP-28-02. If a projection needs data the bus events don't carry, that is a STEP-28-02 event-payload gap to fix there, not a new query layer here (record it).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- Pure projection, no local authority: the board never holds run state the log doesn't — a hard reload rebuilds it identically. Filters/expansion are renderer-only view state.
- Unknown/newer `system/pipeline_*` kinds render as a benign generic marker, never a crash (tolerant-reader invariant carried into the UI).
- Layout is v1-simple: a mostly-linear left-to-right or top-down chain with loop-back edges drawn back to an earlier node is sufficient — no graph-layout library, no drag-and-drop (phase non-goal). A hand-rolled fl/ column layout keyed off `entryStage` + transition order is the recorded default.
- The gate control is the only *interactive* affordance; it is disabled unless `runStatus === 'gated'` and the current user is not mid-resolving (optimistic disable to avoid double-approve).
- The board shows the whole declared pipeline from the start (pending stages greyed), so a viewer sees where the run is headed, not only where it has been.

## Execution Checklist

1. Build the `pipeline-projection` reducer with exhaustive unit tests over scripted `SGroupBusEvent[]` sequences (mid-loop, gated, completed, failed, interrupted-restart) — assert the folded view state, and assert replay-idempotence (same events → same state).
2. Build `GroupBoard.tsx` over the projection: stage graph, active highlight, iteration counters, member badges, gate Approve/Reject wired to the STEP-28-02 IPC, stage→transcript deep links.
3. Register the board as a conditional group-session tab; component tests over the scripted run states; verify the tab hides for pipeline-less groups.
4. Wire live updates through the existing bus push channel (replay-then-live like the timeline); confirm a running mock pipeline animates stage-by-stage.
5. Run the Validation Plan; record deviations (esp. any event-payload gaps pushed back to STEP-28-02) in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard|STEP-28-03 Visualize stage progress on GroupBoard]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- Substrate: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_03_persist-bus-traffic-and-render-the-bus-timeline|STEP-27-03]] (bus timeline replay-then-live pattern), [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs|STEP-28-02]] (event source + gate IPC)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (rebuildable-from-log invariant, renderer surfaces)
