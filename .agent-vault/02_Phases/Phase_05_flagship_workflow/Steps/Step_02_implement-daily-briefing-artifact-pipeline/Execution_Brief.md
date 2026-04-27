# Execution Brief

## Step Overview

Generate the flagship workflow's core durable output: the daily briefing artifact.

## Why This Step Exists

- Daily briefing generation is the clearest expression of the wedge's value.
- This step validates that artifacts are first-class objects, not just UI text.

## Prerequisites

- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_01_define-today-workflow-inputs-outputs-and-acceptance-slice|STEP-05-01 Define Today Workflow Inputs Outputs And Acceptance Slice]].

## Relevant Code Paths

- `packages/runtime/`
- artifact workspace paths from Phase 02
- `packages/desktop/renderer/`
- connectors and runtime models from Phases 03-04

## Execution Prompt

1. Implement the pipeline that gathers wedge inputs and emits the daily briefing artifact.
2. Preserve artifact identity, timestamps, and traceability back to the run that generated it.
3. Keep the generated structure aligned with the wedge definition rather than ad hoc formatting.
4. Add validation using fixture-backed runs and manual inspection of the resulting artifact.
5. Update notes with the final artifact fields, generation path, and any content section explicitly deferred.

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_02_implement-daily-briefing-artifact-pipeline|STEP-05-02 Implement Daily Briefing Artifact Pipeline]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
