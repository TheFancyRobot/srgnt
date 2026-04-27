# Execution Brief

## Step Overview

Turn normalized event and follow-through data into product surfaces users can act on.

## Why This Step Exists

- The framework elevates Calendar and Today to top-level product features.
- The wedge is incomplete if users can generate a briefing but cannot inspect events or follow-through state.

## Prerequisites

- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_01_define-today-workflow-inputs-outputs-and-acceptance-slice|STEP-05-01 Define Today Workflow Inputs Outputs And Acceptance Slice]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/runtime/`
- calendar and event models from Phase 04

## Execution Prompt

1. Build the Calendar foundation, event detail panel, and basic triage/follow-through surfaces named in the milestone.
2. Drive the views from canonical events and workflow state rather than connector-specific response shapes.
3. Keep the first UX slice narrow and keyboard-friendly.
4. Validate with manual walkthroughs that cover at least one event-detail path and one follow-through path.
5. Update notes with the exact surfaces added and any event or triage interaction deferred.

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_03_build-calendar-detail-and-triage-surfaces|STEP-05-03 Build Calendar Detail And Triage Surfaces]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
