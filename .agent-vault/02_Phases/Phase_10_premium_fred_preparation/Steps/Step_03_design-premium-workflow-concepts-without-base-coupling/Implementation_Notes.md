# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_03_design-premium-workflow-concepts-without-base-coupling|STEP-10-03 Design Premium Workflow Concepts Without Base Coupling]]
- Phase: [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
