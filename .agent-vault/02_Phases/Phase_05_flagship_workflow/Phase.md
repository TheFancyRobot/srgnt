---
note_type: phase
template_version: 2
contract_version: 1
title: Flagship Workflow
phase_id: PHASE-05
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-27'
depends_on:
  - PHASE-04
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 05 Flagship Workflow

Prove the base product value with the daily command-center slice: Today view, Calendar foundation, generated artifacts, and follow-through surfaces.

## Objective

- Deliver the first end-to-end workflow that turns normalized connector data into actionable daily outputs inside the desktop product.

## Why This Phase Exists

- The framework's named wedge is the daily command center, not a generic shell demo. This is the first milestone that should feel useful to a real operator.
- Without a flagship workflow, earlier contract, shell, runtime, and connector work remains infrastructure without product proof.

## Scope

- Define the workflow inputs, outputs, and acceptance slice for the Today experience.
- Implement the daily briefing artifact pipeline.
- Add Calendar foundation, event detail, and triage/follow-through surfaces.
- Compose and validate the end-to-end command-center flow using the first connector set.

## Non-Goals

- Broad automation, outbound side effects, sync, or premium orchestration.
- Expanding beyond the first command-center slice before daily usefulness is proven.

## Dependencies

- Depends on [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]].
- Depends on [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]] for artifacts, approvals, and run models.
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]] freezes the exact command-center inputs, outputs, and non-goals this phase must prove.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` defines the wedge outputs as daily note generation, meeting prep, task summary, synthesized actions, and blockers/watch-outs.

## Acceptance Criteria

- [x] The Today workflow has explicit inputs, outputs, and success checks.
- [x] Daily briefing artifacts can be generated from the first connector slice.
- [x] Calendar and follow-through surfaces consume canonical entities rather than provider-specific models. (CanonicalStore wired with fixture data via IPC)
- [x] Manual validation proves the command-center workflow is meaningfully useful without Fred or sync.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]]
- Current phase status: completed
- Next phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|PHASE-06 Replace Zod with Effect Schema]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_05_flagship_workflow/Steps/Step_01_define-today-workflow-inputs-outputs-and-acceptance-slice|STEP-05-01 Define Today Workflow Inputs Outputs And Acceptance Slice]] - Start here; freezes what the vertical slice must prove.
- [x] [[02_Phases/Phase_05_flagship_workflow/Steps/Step_02_implement-daily-briefing-artifact-pipeline|STEP-05-02 Implement Daily Briefing Artifact Pipeline]] - Depends on Step 01.
- [x] [[02_Phases/Phase_05_flagship_workflow/Steps/Step_03_build-calendar-detail-and-triage-surfaces|STEP-05-03 Build Calendar Detail And Triage Surfaces]] - Depends on Step 01; can run in parallel with Step 02.
- [x] [[02_Phases/Phase_05_flagship_workflow/Steps/Step_04_compose-end-to-end-command-center-workflow|STEP-05-04 Compose End To End Command Center Workflow]] - Depends on Steps 02-03.
<!-- AGENT-END:phase-steps -->

## Notes

- Phase 05 completed (2026-03-27), gaps fixed (2026-03-27 second session).
- Today and Calendar surfaces exist with fixture data; workflow acceptance slice explicit.
- Daily briefing pipeline implemented (68 tests pass) with in-memory artifact registry.
- IPC integration complete: `entities:list` wired to CanonicalStore with fixture data; `briefing:save` and `briefing:list` wired for filesystem persistence.
- Test infrastructure added: jsdom environment + @testing-library/react in desktop package.
- Walkthrough doc at `docs/flagship-workflow-walkthrough.md` documents the E2E validation path.
- Phase 07 Terminal Integration Hardening is the next phase.
