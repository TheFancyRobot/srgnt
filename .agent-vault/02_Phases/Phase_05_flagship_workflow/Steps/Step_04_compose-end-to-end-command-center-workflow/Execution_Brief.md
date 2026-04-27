# Execution Brief

## Step Overview

Integrate the flagship workflow into one testable user path.

## Why This Step Exists

- Earlier steps can still pass independently while the actual user journey remains broken.
- This is the first phase where the product should feel meaningfully useful end-to-end.

## Prerequisites

- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_02_implement-daily-briefing-artifact-pipeline|STEP-05-02 Implement Daily Briefing Artifact Pipeline]].
- Complete [[02_Phases/Phase_05_flagship_workflow/Steps/Step_03_build-calendar-detail-and-triage-surfaces|STEP-05-03 Build Calendar Detail And Triage Surfaces]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- `packages/runtime/`
- all first-connector packages

## Execution Prompt

1. Wire the workflow so a user can move from normalized inputs to Today, Calendar, and the generated daily briefing artifact.
2. Exercise the wedge with fixture-backed data and document the manual walkthrough.
3. Capture any broken assumption spanning connectors, runtime, UI, or artifact generation as a bug or decision rather than burying it in session logs.
4. Validate with one repeatable end-to-end walkthrough and the most targeted automated checks available.
5. Update notes with the exact walkthrough, known gaps, and the reasons the slice is or is not ready for Phase 07.

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_04_compose-end-to-end-command-center-workflow|STEP-05-04 Compose End To End Command Center Workflow]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
