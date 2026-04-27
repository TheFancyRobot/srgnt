# Execution Brief

## Step Overview

Freeze the exact end-to-end slice the flagship workflow must prove.

## Why This Step Exists

- The daily command center spans multiple product surfaces and could easily sprawl.
- Later artifact and Calendar work should be measured against one shared acceptance slice.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/runtime/`
- connector packages from Phase 04
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Turn the framework's daily command-center wedge into a precise workflow contract for Today.
2. Produce a Zod schema in `packages/contracts/` that defines the Today workflow's inputs (per-connector canonical entities) and outputs (briefing artifact shape, surface contracts). This schema is the machine-readable contract — the prose document is supplementary.
3. List the inputs from each first connector, the generated outputs, and the UI surfaces that must be involved.
4. Keep the acceptance slice thin enough to validate in one manual walkthrough.
5. Validate by checking that Steps 02-04 can all derive their scope directly from this definition and the Zod contract.
6. Update notes with the frozen slice, the Zod schema location, and any field or artifact still blocked on runtime work.

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_01_define-today-workflow-inputs-outputs-and-acceptance-slice|STEP-05-01 Define Today Workflow Inputs Outputs And Acceptance Slice]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
