---
note_type: step
template_version: 2
contract_version: 1
title: Design Premium Workflow Concepts Without Base Coupling
step_id: STEP-10-03
phase: '[[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]'
status: scaffolded
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-10-01
  - STEP-10-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Design Premium Workflow Concepts Without Base Coupling

Sketch premium workflow ideas that layer onto the base product rather than replacing it.

## Purpose

- Explore higher-value premium concepts while protecting the base workflow and trust boundaries.
- Leave a roadmap of premium ideas that are consistent with the entitlement and minimization contracts.

## Why This Step Exists

- Premium planning should not be reduced to technical integration alone; the product still needs coherent premium concepts.
- This is the final check against accidentally making premium orchestration a hidden dependency.

## Prerequisites

- Complete [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_01_define-entitlements-and-base-vs-premium-contracts|STEP-10-01 Define Entitlements And Base Vs Premium Contracts]].
- Complete [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules|STEP-10-02 Specify Fred Integration Boundary And Minimization Rules]].

## Relevant Code Paths

- premium-prep notes and concept docs created in this step
- flagship workflow notes from Phase 05
- terminal and policy notes from Phases 06 and 03

## Required Reading

- [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
- [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Design premium workflow concepts that are clearly additive to the flagship base workflow.
2. Check each concept against the entitlement table and minimization rules before keeping it in scope.
3. Reject any concept that requires the base product to become dependent on Fred for core usefulness.
4. Validate by producing a short concept list with why each one is premium, optional, and policy-safe.
5. Update notes with rejected concepts too, not just the survivors.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: scaffolded
- Current owner:
- Last touched: 2026-03-22
- Next action: Replace the current scaffolding with the promised implementation and verification path.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Premium concepts should start from stronger orchestration or synthesis, not from locking away base usefulness.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/premium-concepts-roadmap.md` — premium workflow concepts and roadmap document covering:
  - Retained premium concepts: a numbered list of concrete premium features, each with: name, description, why it's premium (not base), which entitlement tier it requires, which minimization rules apply, and how it layers onto (not replaces) the base workflow
  - Rejected concepts: a list of concepts considered but rejected, with rationale (especially any that would have coupled the base product to premium)
  - Premium categories for this phase: Fred-assisted AI workflow concepts only. Cloud sync, team sharing, and other non-Fred premium families may be referenced as adjacent roadmap context, but they are not primary outputs of this step.
  - Per-concept validation: each retained concept checked against the STEP-10-01 entitlement table and STEP-10-02 minimization rules
  - Roadmap sequencing: rough priority ordering of premium concepts for future implementation phases

*Production scaffolding code (if applicable):*
- If shared premium interfaces emerge that don't belong in `packages/fred/` or `packages/entitlements/`, extend `packages/entitlements/src/interfaces/` with premium feature types (e.g., `IPremiumFeature`, `PremiumFeatureManifest`). Create a new `packages/premium/` package only if the surface area warrants a separate workspace package — typically this means 3+ modules or a distinct dependency graph. The default path is to extend `packages/entitlements/` unless the executing agent can justify separation.

**Key decisions to apply:**
- DEC-0002 (TypeScript + Effect.Schema) — any shared premium schemas in Effect Schema
- DEC-0005 (pnpm) — new package (if created) registered in workspace
- DEC-0006 (docs + scaffolding) — design doc is mandatory; code scaffolding is conditional on whether shared premium interfaces are needed beyond what `packages/fred/` and `packages/entitlements/` already provide
- DEC-0007 (markdown/Dataview) — premium features that involve data must work through the markdown/Dataview layer, not introduce a new storage backend

**Starting files:**
- STEP-10-01 entitlement design doc and `packages/entitlements/`
- STEP-10-02 Fred architecture doc and `packages/fred/`
- Flagship workflow docs from PHASE-05
- Sync architecture from PHASE-09

**Constraints:**
- Do NOT implement any premium features — this step produces concepts and interfaces only
- Do NOT create base-product dependencies on premium packages — base must work with premium packages completely absent
- Do NOT make a premium concept that degrades the base workflow when disabled (e.g., no "you need premium to see your tasks")
- Do NOT create a speculative backlog of 20+ ideas — aim for 3-7 well-validated premium concepts plus a concise rejected list
- Do NOT introduce a new storage backend for premium features — DEC-0007 applies even to premium

**Validation:**
1. Premium concepts roadmap doc exists with at least 3 retained concepts and at least 2 rejected concepts
2. Each retained concept has: name, description, required tier, minimization compliance, and layering-over-base explanation
3. Each retained concept is cross-referenced against the STEP-10-01 entitlement table (the entitlement key exists)
4. Each retained concept is cross-referenced against STEP-10-02 minimization rules (explicitly compliant)
5. No retained concept requires modifying base-product code to function — it must layer on top
6. If `packages/premium/` was created: `pnpm install && pnpm --filter premium build` succeeds
7. If shared interfaces were added to `packages/entitlements/` instead: build still succeeds
8. Rejected concepts list includes rationale, especially for any concept that would have coupled base to premium
9. Flagship base workflow is NOT listed as premium in any concept

**Junior-readiness verdict:** PASS — this is primarily a product design and documentation step with optional scaffolding. In this phase, premium concepts are Fred-assisted workflow features layered on top of the base product. The deliverables are clear (concept doc + optional interfaces in `packages/entitlements/`). The main risk is scope creep into non-Fred premium families; the phase now scopes those out explicitly.

## Human Notes

- A short list of good premium concepts is better than a broad speculative backlog.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means premium planning includes concrete, optional concepts that respect the established boundaries.
- Validation target: each retained concept is explicitly additive, entitled, and minimization-safe.
