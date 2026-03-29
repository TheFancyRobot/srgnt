---
note_type: step
template_version: 2
contract_version: 1
title: Define Entitlements And Base Vs Premium Contracts
step_id: STEP-10-01
phase: '[[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-09
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define Entitlements And Base Vs Premium Contracts

Freeze which capabilities belong to the base product and which are premium candidates.

## Purpose

- Make commercial and capability boundaries explicit before premium AI features exist.
- Protect the base product from gradually inheriting premium dependencies.

## Why This Step Exists

- The framework insists the base product must stay useful without Fred.
- Entitlement drift is hard to undo once workflows assume premium services are present.

## Prerequisites

- Complete [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]].

## Relevant Code Paths

- premium-prep notes and boundary docs created in this step
- roadmap and workflow notes from earlier phases

## Required Reading

- [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Enumerate the base-product capabilities that must remain complete without Fred.
2. Identify the premium-only candidates and express them as explicit entitlements or feature flags.
3. Validate by checking that the flagship workflow and terminal integration still read as fully usable with premium disabled.
4. Update notes with the entitlement table and any ambiguous boundary that needs a decision note.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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

## Human Notes

- If a premium idea weakens the base workflow story, that is a product-design problem to fix early.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means premium planning starts from explicit entitlements rather than fuzzy aspiration.
- Validation target: base workflow still stands on its own with premium disabled.
