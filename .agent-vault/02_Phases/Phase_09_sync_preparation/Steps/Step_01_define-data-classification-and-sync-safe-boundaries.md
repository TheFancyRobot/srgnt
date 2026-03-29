---
note_type: step
template_version: 2
contract_version: 1
title: Define Data Classification And Sync Safe Boundaries
step_id: STEP-09-01
phase: '[[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]'
status: partial
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-08
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define Data Classification And Sync Safe Boundaries

Classify what data exists in the product and what sync may or may not move later.

## Purpose

- Provide the privacy and architecture baseline for future sync design.
- Protect the local workspace source-of-truth model from accidental erosion.

## Why This Step Exists

- The framework explicitly treats data classification as sync-prep deliverable.
- Encryption and account design are not meaningful until data classes are clear.

## Prerequisites

- Complete the earlier runtime and hardening phases so real local data classes exist.

## Relevant Code Paths

- workspace layout and persistence docs from Phase 02
- runtime artifact/log/state models from Phase 03
- product hardening telemetry/crash policy from Phase 08

## Required Reading

- [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Inventory the product's local data classes: artifacts, settings, logs, connector metadata, cache, secrets references, run history, approvals, and derived indexes.
2. Classify each class by sensitivity, authoritativeness, and sync eligibility.
3. Record what must remain local-only, what may sync only in encrypted form, and what is derived and rebuildable.
4. Validate by checking that later sync architecture can reference this matrix without reclassifying core product data.
5. Update notes with the final classification matrix and any unresolved sensitive-data question.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: partial
- Current owner:
- Last touched: 2026-03-22
- Next action: Close the remaining implementation and validation gaps before marking this complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Derived indexes should stay clearly distinct from authoritative workspace data.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/data-classification-matrix.md` — a classification matrix table covering every local data class in the product. Each row includes: data class name, storage format (markdown file / YAML frontmatter / derived index / cache), sensitivity level (public / internal / confidential / secret), authoritativeness (authoritative source / derived / cache), sync eligibility (sync-safe / encrypted-only / local-only / rebuildable), and rationale

*Production scaffolding code:*
- `packages/sync/` — new pnpm workspace package initialized with `package.json`, `tsconfig.json`, `src/index.ts`
- `packages/sync/src/schemas/classification.ts` — Zod schemas defining:
  - `DataClassification` enum (`public`, `internal`, `confidential`, `secret`)
  - `SyncEligibility` enum (`syncSafe`, `encryptedOnly`, `localOnly`, `rebuildable`)
  - `DataClassEntry` schema (name, format, classification, eligibility, authoritative boolean)
  - `ClassificationMatrix` schema (array of `DataClassEntry`)
- `packages/sync/src/schemas/frontmatter.ts` — optional Zod helper schemas for classification metadata references used by sync tooling; do not require earlier phases to add new frontmatter fields just to satisfy this step

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — all schemas must be Zod, not plain TypeScript types
- DEC-0005 (pnpm monorepo) — `packages/sync/` must be registered in pnpm workspace config
- DEC-0006 (docs + production scaffolding) — this step must produce BOTH the design doc AND the code artifacts
- DEC-0007 (Dataview over markdown) — classification must account for markdown files with YAML frontmatter as the data format; no database tables to classify

**Starting files:**
- Workspace layout and persistence docs from PHASE-02
- Runtime artifact/log/state models from PHASE-03
- Telemetry/crash policy from PHASE-08 (defines what telemetry data exists)
- `pnpm-workspace.yaml` at repo root

**Constraints:**
- Do NOT implement sync logic — this step only classifies data and produces schemas
- Do NOT create a database or introduce any non-markdown storage — DEC-0007 applies
- Do NOT classify hypothetical future data — only classify data classes that currently exist in the product
- Do NOT make sync eligibility decisions that contradict the PHASE-08 telemetry policy (e.g., if crash logs are local-only per telemetry policy, they must be `localOnly` here too)
- Do classify non-markdown local artifacts that already exist or are explicitly planned, such as binary attachments, packaged crash dumps, and secure-storage references, even if they are not synced in v1

**Validation:**
1. `packages/sync/` exists and is listed in `pnpm-workspace.yaml`
2. `pnpm install` succeeds with the new package
3. `pnpm --filter sync build` (or `tsc`) succeeds with no type errors
4. Classification matrix doc exists and covers at least: workspace markdown files, YAML frontmatter metadata, Dataview indexes, connector credentials/tokens, crash logs, user settings, run history, approval records
5. Every Zod schema in `packages/sync/src/schemas/` can be imported and `.parse()` called with a valid example
6. Classification matrix and Zod schemas are consistent — every data class in the doc has a corresponding enum value or is representable by the schema
7. No data class is left as "TBD" — every class has a definitive sync eligibility assignment

**Junior-readiness verdict:** PASS — the deliverables are concrete (one doc, two schema files, one package scaffold). The classification exercise is conceptual but bounded by existing data classes. A junior dev needs access to PHASE-02/03/07 outputs to enumerate data classes. Provide a starter list of known data classes to prevent them from missing categories.

## Human Notes

- If a data class is hard to classify, that usually signals an earlier boundary problem worth surfacing.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means sync-prep work can reference one durable data-classification source.
- Validation target: every major local data class has an explicit sync posture.
