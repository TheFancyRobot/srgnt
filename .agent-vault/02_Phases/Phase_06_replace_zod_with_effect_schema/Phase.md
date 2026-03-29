---
note_type: phase
template_version: 2
contract_version: 1
title: Replace Zod with Effect Schema
phase_id: PHASE-06
status: completed
owner: ''
created: '2026-03-27'
updated: '2026-03-28'
depends_on:
  - '[[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]'
related_architecture: []
related_decisions:
  - '[[04_Decisions/DEC-0013_preserve-contracts-z-star-compatibility-wrappers-after-removing-zod|DEC-0013 Remove legacy contracts z-star exports and standardize on S-star schemas]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 06 Replace Zod with Effect Schema

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Replace Zod with Effect Schema milestone.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.

## Dependencies

- Depends on [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]].

## Acceptance Criteria

 - [x] Scope is concrete and linked to the right durable notes.
 - [x] Step notes exist for the first executable work units.
 - [x] Validation and documentation expectations are explicit.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]
- Current phase status: completed
- Next phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|PHASE-07 Terminal Integration Hardening]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0013_preserve-contracts-z-star-compatibility-wrappers-after-removing-zod|DEC-0013 Preserve contracts z-star compatibility wrappers after removing zod]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_01_audit-zod-usage-across-codebase|STEP-06-01 Audit Zod usage across codebase]]
- [x] [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_02_install-effect-schema-and-create-shared-custom-schemas|STEP-06-02 Install Effect Schema and create shared custom schemas]]
- [x] [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_03_migrate-contracts-package-schemas-to-effect-schema|STEP-06-03 Migrate contracts package schemas to Effect Schema]]
- [x] [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_04_migrate-consumer-packages-runtime-desktop-sync-entitlements-fred|STEP-06-04 Migrate consumer packages runtime desktop sync entitlements fred]]
- [x] [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_05_remove-zod-dependency-from-clean-up|STEP-06-05 Remove Zod dependency from clean up]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Phase 06 completed on 2026-03-28. All contracts and consumer packages now run on Effect Schema, full repo validation is green, and DEC-0013 captures the final choice to standardize on `S*` exports plus shared parse helpers.
