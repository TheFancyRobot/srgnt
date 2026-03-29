---
note_type: phase
template_version: 2
contract_version: 1
title: Foundation Contracts
phase_id: PHASE-01
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-00
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0002_use-typescript-zod-for-all-contracts-and-schemas|DEC-0002 Use TypeScript + Zod for all contracts and schemas]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 01 Foundation Contracts

Define the first executable product contracts for `srgnt` before shell, runtime, or connector implementation begins.

## Objective

- Freeze the first executable product contracts for desktop-first `srgnt`: repo/package boundaries, canonical entities, skill and connector manifests, executor and run contracts, and a minimal validation path with worked examples.

## Why This Phase Exists

- This phase exists to prevent later product work from drifting away from one shared contract surface for schemas, examples, and runtime/package boundaries.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` recommends a contract-first phase before connector, runtime, and workflow implementation.

## Scope

- Freeze the repo layout that gives contracts, examples, and later desktop/runtime code a stable home.
- Define canonical entity contracts for the v1 entity set and shared envelope rules.
- Define the skill manifest, connector capability, executor request/result, and run/logging contracts.
- Plan at least one worked example skill package and one sample connector manifest that exercise the contract surface.
- Add a repeatable verification path and update linked notes as contract boundaries solidify.

## Non-Goals

- Building the Electron shell, renderer UI, terminal pane, or connector auth flows.
- Implementing live connectors, sync engines, Fred integration, or paid cloud services.
- Choosing the final package manager, query/index engine, or sync architecture beyond the constraints they impose on the contracts.

## Dependencies

- [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]] must freeze the desktop-first framing, v1 wedge, and success criteria first.
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]] and [[06_Shared_Knowledge/terminology_rules|Terminology Rules]] capture the frozen product boundary and language this phase must preserve.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` is the primary product source document for this phase.
- `[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]` resolves the document's Obsidian-first vs desktop-first ambiguity for implementation planning.
- `[[01_Architecture/System_Overview|System Overview]]` and `[[01_Architecture/Code_Map|Code Map]]` confirm there is no product code yet, so Step 01 must establish contract homes before schema work starts.

## Acceptance Criteria

- [x] A concrete repo/package layout exists for contracts, examples, and future desktop/runtime packages, and later phases point to exact target paths.
- [x] Canonical entity, skill, connector, executor, and run/logging contracts are specified in machine-readable and human-readable form.
- [x] At least one sample skill package and one sample connector manifest are planned to validate against those contracts.
- [x] The phase includes a repeatable verification path that can catch drift or incompatible examples before Phase 02 starts.
- [x] Linked notes record the desktop-first boundary, main assumptions, and the local-first/security constraints later phases must preserve.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
- Current phase status: completed
- Next phase: [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0002_use-typescript-zod-for-all-contracts-and-schemas|DEC-0002 Use TypeScript + Zod for all contracts and schemas]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]] - Start here; freezes target paths and contract homes.
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]] - Depends on Step 01.
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]] - Depends on Step 02; can run in parallel with Step 04.
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]] - Depends on Step 02; can run in parallel with Step 03.
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]] - Depends on Steps 02-04.
- [x] [[02_Phases/Phase_01_foundation_contracts/Steps/Step_06_add-contract-validation-and-worked-examples|STEP-01-06 Add Contract Validation And Worked Examples]] - Final integration; depends on Steps 03-05.
<!-- AGENT-END:phase-steps -->

## Notes

- The contract surface is now real in `packages/contracts/`, with shared schemas for entities, skills, connectors, executors, IPC, and workspace layout.
- Worked examples and validation coverage exist in `examples/` plus workspace typecheck, test, and build commands, which is enough to treat this phase as complete.
- Remaining detail gaps around persistence, live connectors, and execution flow were intentionally pushed into Phases 02-05 rather than hidden inside the contract milestone.
