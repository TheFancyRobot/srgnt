# Implementation Notes

- Base usefulness is a non-negotiable framework constraint.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/entitlement-design.md` — entitlement design document covering:
  - Explicit definition of "Fred": the premium AI orchestration layer — optional, additive, not required for base product functionality
  - Base product capability inventory: every feature that works without Fred or any premium subscription (flagship workflow, terminal integration, connector status, workspace management, Dataview queries)
  - Premium candidate table: each premium feature with columns for feature name, premium family (`fred` or another premium family), entitlement key, and rationale for why it's premium
  - Feature flag strategy: how entitlements are checked at runtime (function call, not network check — must work offline)
  - Degradation rules: what happens when a premium feature is accessed without entitlement (graceful messaging, not broken UI)

*Production scaffolding code:*
- `packages/entitlements/` — new pnpm workspace package with `package.json`, `tsconfig.json`, `src/index.ts`
- `packages/entitlements/src/schemas/entitlement.ts` — Zod schemas:
  - `EntitlementTier` enum (`base`, `premium`)
  - `EntitlementKey` union/enum of all known feature-gate keys
  - `EntitlementConfig` schema (maps entitlement keys to required tier)
  - `UserEntitlements` schema (the user's current tier and any overrides)
- `packages/entitlements/src/interfaces/entitlement-checker.ts` — TypeScript interfaces:
  - `IEntitlementChecker` (checkAccess, getCurrentTier, isFeatureAvailable)
  - `EntitlementResult` (allowed: boolean, requiredTier, currentTier, upgradeMessage)
- `packages/entitlements/src/constants/base-features.ts` — an explicit list of base-product features that must NEVER require premium

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — all entitlement schemas in Zod
- DEC-0005 (pnpm) — `packages/entitlements/` registered in pnpm workspace
- DEC-0006 (docs + scaffolding) — both design doc and code package required
- DEC-0007 (markdown/Dataview) — premium feature preferences may be stored in workspace config, but entitlement truth must live in local app config or a signed license cache outside the syncable workspace; no database

**Starting files:**
- PHASE-09 must be complete (sync preparation informs which premium features involve sync)
- Flagship workflow docs from PHASE-05
- System overview and framework doc

**Constraints:**
- Do NOT implement entitlement enforcement — only schemas, interfaces, and design doc
- Do NOT make the base product depend on any premium package at import time — `packages/entitlements/` must be importable without Fred
- Do NOT require network access for entitlement checks — entitlements must work offline from local config
- Do NOT gate any current base-product feature behind premium — this step defines the boundary, it does not move features across it
- Fred must be explicitly named and defined in the design doc — not referred to vaguely as "AI features"
- Do NOT store signed entitlement state, license files, or subscription truth in syncable workspace markdown; only local non-secret prefs may live in workspace config

**Validation:**
1. `packages/entitlements/` exists and is in `pnpm-workspace.yaml`
2. `pnpm install && pnpm --filter entitlements build` succeeds
3. Design doc explicitly defines Fred as "the premium AI orchestration layer — optional, additive"
4. Design doc contains a base-product capability inventory with at least 5 features listed
5. Design doc contains a premium candidate table with at least 3 premium features
6. `base-features.ts` exports a list and every item matches the design doc's base inventory
7. Zod schemas parse valid examples without error
8. `IEntitlementChecker.checkAccess()` returns an `EntitlementResult` with `allowed` boolean and `upgradeMessage`
9. The design doc explicitly states where entitlement truth lives (local app config / license cache) and that the workspace only stores non-secret prefs if needed
10. Flagship workflow appears in the base features list, NOT in the premium table

**Junior-readiness verdict:** PASS — deliverables are concrete and the entitlement pattern is well-established in the industry. The design challenge is deciding what's premium vs. base, but the framework doc and this refinement provide strong guardrails (base must be useful without Fred). A junior dev can scaffold the package and write the schemas; the product-level decisions should be reviewed by a senior before the design doc is finalized.

## Related Notes

- Step: [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_01_define-entitlements-and-base-vs-premium-contracts|STEP-10-01 Define Entitlements And Base Vs Premium Contracts]]
- Phase: [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
