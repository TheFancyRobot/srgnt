---
note_type: phase
template_version: 2
contract_version: 1
title: Sync Preparation
phase_id: PHASE-09
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-04-16'
depends_on:
  - PHASE-08
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0006_phase-08-and-phase-09-produce-architecture-docs-plus-production-scaffolding|DEC-0006 Phase 09 and Phase 10 produce architecture docs plus production scaffolding]]'
  - '[[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 09 Sync Preparation

Prepare the local-first product for future encrypted sync without turning remote services into the source of truth.

## Objective

- Define the data boundaries, classification rules, and continuity assumptions that let sync be added later without rewriting the base product architecture.

## Why This Phase Exists

- The framework treats sync as a later paid layer, but it also insists the local model must already be organized so sync does not require architectural rewrites.
- If data classification and continuity assumptions stay implicit, future sync work risks breaking local-first guarantees or over-exposing sensitive content.

## Scope

- Define the data classification matrix and sync-safe workspace boundaries.
- Draft encrypted sync architecture and account/subscription models.
- Validate conflict, recovery, and continuity assumptions against the current local-first design.

## Non-Goals

- Shipping a live sync backend or cloud source of truth.
- Introducing collaboration/sharing flows before the local model is stable.

## Dependencies

- Depends on [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]].
- Depends on earlier runtime, artifact, and logging phases because sync boundaries must align with real local state.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` defines sync as continuity/replication, not the source of truth.

## Acceptance Criteria

- [x] Data classification and sync-safe boundaries are explicit.
- [x] An encrypted sync architecture draft exists and preserves the local workspace as the authoritative store.
- [ ] Account/subscription assumptions are documented at the architecture boundary level.
- [ ] Conflict and recovery scenarios are validated against the current workspace and metadata model.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- Current phase status: partial
- Next phase: [[02_Phases/Phase_10_premium_fred_preparation/Phase|PHASE-10 Premium Fred Preparation]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0006_phase-08-and-phase-09-produce-architecture-docs-plus-production-scaffolding|DEC-0006 Phase 09 and Phase 10 produce architecture docs plus production scaffolding]]
- [[04_Decisions/DEC-0012_default-crash-reporting-to-local-only-redacted-logs|DEC-0012 Default crash reporting to local-only redacted logs]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]] - Start here; classifies what sync may and may not move.
- [ ] [[02_Phases/Phase_09_sync_preparation/Steps/Step_02_draft-encrypted-sync-architecture-and-account-model|STEP-09-02 Draft Encrypted Sync Architecture And Account Model]] - Depends on Step 01.
- [ ] [[02_Phases/Phase_09_sync_preparation/Steps/Step_03_validate-conflict-recovery-and-continuity-assumptions|STEP-09-03 Validate Conflict Recovery And Continuity Assumptions]] - Depends on Steps 01-02.
<!-- AGENT-END:phase-steps -->

## Notes

- The sync package now contains real classification, device, conflict, and encrypted-payload scaffolding with test coverage, which is enough to justify a partial status instead of pure planning.
- The architecture boundary is still incomplete: account/subscription assumptions and validated recovery behavior are not yet durable enough to treat the phase as complete.
- DEC-0012 is linked here because crash-log classification materially affects what later sync boundaries may or may not replicate.
