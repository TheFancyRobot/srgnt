---
note_type: step
template_version: 2
contract_version: 1
title: Freeze Repo Layout And Contract Locations
step_id: STEP-01-01
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - PHASE-00
related_sessions:
  - '[[05_Sessions/2026-03-21-044133-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-044133 OpenCode session for Freeze Repo Layout And Contract Locations]]'
  - '[[05_Sessions/2026-03-21-045659-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-045659 OpenCode session for Freeze Repo Layout And Contract Locations]]'
  - '[[05_Sessions/2026-03-22-031913-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-22-031913 opencode session for Freeze Repo Layout And Contract Locations]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Freeze Repo Layout And Contract Locations

Freeze the first concrete repo/package layout and the canonical homes for contracts, examples, docs, and later desktop/runtime packages.

## Purpose

- Establish the repo/package layout that downstream Phase 01 work will use without guessing.
- Document the canonical homes for contract files, worked examples, and later desktop/runtime packages.

## Why This Step Exists

- The repo currently has no product directories, so later steps would either invent parallel structures or bury durable specs in vault prose.
- This step is the dependency root for the entire phase and the main guardrail against layout churn.

## Prerequisites

- Read [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]].
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]].
- Read [[01_Architecture/System_Overview|System Overview]] and [[01_Architecture/Code_Map|Code Map]].

## Relevant Code Paths

- `AGENTS.md`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`
- `.agent-vault/01_Architecture/System_Overview.md`
- `.agent-vault/01_Architecture/Code_Map.md`
- Proposed targets to ratify or adjust: `packages/contracts/`, `packages/runtime/`, `packages/desktop/`, `packages/connectors/`, `packages/executors/`, `packages/sync/`, `packages/entitlements/`, `packages/fred/`, `examples/skills/daily-briefing/`, `examples/connectors/jira/`, `docs/contracts/`

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]

## Execution Prompt

1. Confirm the repo is still vault-only and record any newly discovered manifests, packages, or tool choices before adding product structure.
2. Translate the desktop-first architecture into a minimal repo layout that reserves stable homes for contracts now and desktop/runtime implementations later.
3. Create or update the repo-level layout docs and any minimal scaffolding needed so downstream steps have exact target paths for entities, manifests, examples, and validation code.
4. Keep Phase 01 bounded: do not implement Electron UI, connectors, or runtime logic here; create placeholders only when they clarify file ownership.
5. Record why each top-level package or directory exists, especially the shared contracts location and the worked-example locations.
6. Validate by checking that every later Phase 01 step can name a single canonical target path, and update the phase note if any planned path changes.
7. Update Implementation Notes, Session History, and Outcome Summary with the final layout, any tooling choice, and any open question that remains.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Repo evidence today: only `AGENTS.md` and `.agent-vault/` exist at the project root.
- `srgnt_framework.md` recommends a monorepo-style repo strategy, but no package layout has been implemented yet.
### Refinement (readiness checklist pass)

**Exact outcome**: A `pnpm-workspace.yaml` and directory tree committed to the repo with these packages:
- `packages/contracts/` — shared Zod schemas and inferred types (entities, manifests, executor)
- `packages/runtime/` — placeholder for PHASE-03 runtime code
- `packages/desktop/` — placeholder for PHASE-02 Electron shell
- `packages/connectors/` — placeholder for PHASE-04 connector packages
- `packages/sync/` — reserved for PHASE-09 sync-preparation schemas and interfaces
- `packages/entitlements/` — reserved for PHASE-10 entitlement contracts
- `packages/fred/` — reserved for PHASE-10 premium orchestration interfaces
- `examples/skills/daily-briefing/` — worked skill example
- `examples/connectors/jira/` — worked connector example

**Key decisions to apply**:
- DEC-0002: All contract files are TypeScript + Zod. Package uses `zod` as a dependency.
- DEC-0005: Monorepo uses pnpm. This step creates `pnpm-workspace.yaml` and root `package.json`.
- DEC-0007: Entity data is stored as markdown with YAML frontmatter. The contracts package defines Zod schemas that validate frontmatter shapes.

**Starting files**: Only `AGENTS.md` and `.agent-vault/` exist. This step creates all new product directories.

**Constraints**:
- Do not install Electron, UI frameworks, or runtime dependencies — only `zod` and `typescript` in the contracts package.
- Do not create package stubs with business logic — only `package.json`, `tsconfig.json`, and a `src/index.ts` barrel export per package.
- Do not create an `apps/desktop/` root; downstream notes must use `packages/desktop/` as the canonical desktop package path.

**Validation**:
- `pnpm install` succeeds from repo root.
- `pnpm -r run typecheck` succeeds (all packages compile).
- Every later PHASE-01 step can name an exact file path under `packages/contracts/src/`.

**Junior-readiness verdict**: PASS. The step now has explicit directory names, tooling choices, and a validation command.

## Human Notes

- Integrity risk: if this step chooses provider- or UI-specific directories too early, later contract work will inherit the wrong boundary.
- Prefer a small shared contracts surface plus examples over a wide skeleton of empty packages.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-21 - [[05_Sessions/2026-03-21-044133-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-044133 OpenCode session for Freeze Repo Layout And Contract Locations]] - Planning session created.
- 2026-03-21 - [[05_Sessions/2026-03-21-045659-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-21-045659 OpenCode session for Freeze Repo Layout And Contract Locations]] - Session created.
- 2026-03-22 - [[05_Sessions/2026-03-22-031913-freeze-repo-layout-and-contract-locations-opencode|SESSION-2026-03-22-031913 opencode session for Freeze Repo Layout And Contract Locations]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the repo has a documented package/path map and every later Phase 01 step names concrete targets without placeholders.
- Validation target: manual review of the phase and step notes plus the updated code-map-facing docs shows one canonical home for each contract family.
