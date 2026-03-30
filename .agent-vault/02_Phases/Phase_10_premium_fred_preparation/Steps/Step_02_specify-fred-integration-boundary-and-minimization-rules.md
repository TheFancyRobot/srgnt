---
note_type: step
template_version: 2
contract_version: 1
title: Specify Fred Integration Boundary And Minimization Rules
step_id: STEP-10-02
phase: '[[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]'
status: partial
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-10-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Specify Fred Integration Boundary And Minimization Rules

Define how premium orchestration can touch product data without overreaching.

## Purpose

- Set the data minimization and integration rules for future Fred-powered flows.
- Preserve local-first and privacy constraints even when premium AI enters the stack.

## Why This Step Exists

- The framework treats AI-safe minimization as a first-class requirement, not an afterthought.
- Premium orchestration becomes risky if the data boundary is left implicit.

## Prerequisites

- Complete [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_01_define-entitlements-and-base-vs-premium-contracts|STEP-10-01 Define Entitlements And Base Vs Premium Contracts]].

## Relevant Code Paths

- premium-prep notes and policy docs created in this step
- classification matrix from Phase 09
- runtime/policy notes from Phase 03

## Required Reading

- [[02_Phases/Phase_10_premium_fred_preparation/Phase|Phase 10 premium fred preparation]]
- [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Define which data classes premium orchestration may access, in what form, and under what user approval or policy controls.
2. Keep the Fred boundary optional, explicit, and narrower than the full local workspace.
3. Record what must stay local-only even for premium flows.
4. Validate by checking that the boundary aligns with the Phase 09 classification matrix and does not require renderer-side secret access.
5. Update notes with the minimization rules and any unresolved policy or compliance issue.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: partial
- Current owner:
- Last touched: 2026-03-22
- Next action: Close the remaining implementation and validation gaps before marking this complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Premium AI should receive the minimum data needed for the selected workflow, never the entire workspace by default.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/fred-architecture.md` — Fred boundary and minimization architecture document covering:
  - Fred definition recap: premium AI orchestration layer, optional and additive
  - Data access rules: which data classes (per STEP-09-01 classification) Fred may access, in what form (raw, redacted, summarized), and under what user-approval conditions
  - Minimization rules: Fred receives the minimum data needed for the selected workflow, never the entire workspace by default
  - Local-only data boundaries: what stays on-device even when Fred is active (secrets, credentials, full file contents unless explicitly shared)
  - API surface between base product and Fred: the exact interface through which base product exposes context to Fred and receives results back
  - Renderer isolation: Fred logic does not run in the renderer; all AI calls go through the main process or a dedicated service
  - User consent model: how the user approves what data Fred can access per-workflow or per-session
  - Alignment check: explicit cross-reference to PHASE-09 classification matrix and STEP-08-02 telemetry policy

*Production scaffolding code:*
- `packages/fred/` — new pnpm workspace package with `package.json`, `tsconfig.json`, `src/index.ts`
- `packages/fred/src/interfaces/fred-orchestrator.ts` — TypeScript interfaces:
  - `IFredOrchestrator` (executeWorkflow, getAvailableWorkflows, getStatus)
  - `FredWorkflowRequest` (workflowId, context: minimized data payload, userConsent)
  - `FredWorkflowResult` (output, tokensUsed, dataAccessed audit trail)
- `packages/fred/src/interfaces/data-accessor.ts` — TypeScript interfaces:
  - `IFredDataAccessor` (requestContext, getMinimizedPayload)
  - `DataAccessScope` (which files/fields Fred may read, per user consent)
  - `MinimizedPayload` (only the data Fred needs, with redaction applied)
- `packages/fred/src/schemas/fred-request.ts` — Effect Schema definitions:
  - `FredWorkflowRequestSchema`
  - `DataAccessScopeSchema`
  - `MinimizedPayloadSchema`
  - `FredWorkflowResultSchema`

**Key decisions to apply:**
- DEC-0002 (TypeScript + Effect.Schema) — interfaces + Effect Schema definitions for all Fred contracts
- DEC-0005 (pnpm) — `packages/fred/` registered in workspace
- DEC-0006 (docs + scaffolding) — architecture doc + package scaffolding
- DEC-0007 (markdown/Dataview) — Fred reads markdown files through the data accessor, never directly; Dataview queries may be used to select relevant files

**Starting files:**
- `packages/entitlements/` from STEP-10-01 (Fred must check entitlements)
- `packages/sync/src/schemas/classification.ts` from STEP-09-01 (data classes to reference)
- Telemetry policy from STEP-08-02 (redaction rules apply to Fred too)
- STEP-10-01 entitlement design doc (what tier gates Fred)

**Constraints:**
- Do NOT implement Fred logic — only interfaces, schemas, and architecture doc
- Do NOT allow `packages/fred/` to import from `packages/desktop/` — Fred is a standalone package with no app-level coupling
- Do NOT give Fred raw access to the full workspace — every access must go through `IFredDataAccessor` with an explicit scope
- Do NOT put AI API keys or model configuration in this step — those are implementation details for later
- Do NOT make any base-product package depend on `packages/fred/` — the dependency arrow points FROM fred TO base, never the reverse

**Validation:**
1. `packages/fred/` exists and is in `pnpm-workspace.yaml`
2. `pnpm install && pnpm --filter fred build` succeeds
3. Fred architecture doc references the STEP-09-01 classification matrix by name
4. Fred architecture doc contains explicit minimization rules (not just "we'll be careful")
5. `IFredOrchestrator` interface exists with executeWorkflow method
6. `IFredDataAccessor` interface exists with requestContext and getMinimizedPayload methods
7. `FredWorkflowRequest` includes a `userConsent` field — not optional
8. No import in `packages/entitlements/` or any `packages/*` (other than fred itself) references `packages/fred/`
9. Effect Schema definitions decode valid examples
10. Architecture doc explicitly lists data that Fred must NEVER access (secrets, credentials, etc.)

**Junior-readiness verdict:** PASS — the step is well-scoped as interface design + documentation. The minimization rules and data access boundaries require careful thought, but STEP-09-01's classification matrix provides a strong foundation. The main risk is a junior dev making the Fred boundary too broad; the constraints above ("never the full workspace," "every access through IFredDataAccessor") provide guardrails.

## Human Notes

- If a premium use case needs broad raw workspace access, challenge the product design rather than expanding the boundary casually.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means future Fred work starts from explicit minimization rules.
- Validation target: premium boundary aligns with Phase 09 classifications and local-first constraints.
