---
note_type: phase
template_version: 2
contract_version: 1
title: Premium Fred Preparation
phase_id: PHASE-10
status: user_blocked
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-09
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

# Phase 10 Premium Fred Preparation

Define the optional premium boundary for Fred so later AI orchestration work can be layered on without weakening the base product.

## Objective

- Produce the entitlement, integration-boundary, and data-minimization decisions needed to add premium orchestration later while keeping the base product complete without it.

## Why This Phase Exists

- The framework explicitly says Fred is additive, not foundational. That boundary needs a durable plan before premium work starts.
- If entitlement and minimization rules are left implicit, later premium features may leak into base-product assumptions or over-share workspace data.

## Scope

- Define entitlements and base-vs-premium contracts.
- Specify the Fred integration boundary and AI-safe data-minimization rules.
- Design premium workflow concepts that layer on top of, rather than replace, the base workflow model.

## Non-Goals

- Shipping premium backend services.
- Making the base workflow depend on Fred for usefulness.

## Dependencies

- Depends on [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]].
- Depends on earlier workflow, logging, and policy work because premium boundaries operate on those existing local concepts.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` frames Fred as optional premium orchestration with explicit data minimization.

## Acceptance Criteria

- [x] Base-vs-premium entitlement boundaries are explicit.
- [x] Fred integration boundary is defined in a way that preserves local-first and privacy constraints.
- [ ] AI-safe minimization rules are documented for premium workflows.
- [ ] Premium workflow concepts do not break the requirement that the base product remain useful without Fred.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]]
- Current phase status: user_blocked
- Next phase: none yet.
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
- [x] [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_01_define-entitlements-and-base-vs-premium-contracts|STEP-10-01 Define Entitlements And Base Vs Premium Contracts]] - Start here; freezes the commercial and capability boundary.
- [ ] [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules|STEP-10-02 Specify Fred Integration Boundary And Minimization Rules]] - Depends on Step 01.
- [ ] [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_03_design-premium-workflow-concepts-without-base-coupling|STEP-10-03 Design Premium Workflow Concepts Without Base Coupling]] - Depends on Steps 01-02.
<!-- AGENT-END:phase-steps -->

> user_blocked: Phase 10 work is paused pending explicit user approval. No further assignments should be made for this phase.

## Notes

- Entitlements and Fred boundary packages now exist with tests, so the commercial and technical premium boundary is no longer documentation-only.
- This phase remains partial because minimization rules and premium workflow concepts are still thinner than the phase objective requires, even though the base-vs-premium boundary is explicit.
- DEC-0012 is linked here because any premium orchestration work must inherit the same privacy and redaction posture as the rest of the local-first product.
