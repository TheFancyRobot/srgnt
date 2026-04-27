# Execution Brief

## Step Overview

Freeze the first concrete repo/package layout and the canonical homes for contracts, examples, docs, and later desktop/runtime packages.

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

## Execution Prompt

1. Confirm the repo is still vault-only and record any newly discovered manifests, packages, or tool choices before adding product structure.
2. Translate the desktop-first architecture into a minimal repo layout that reserves stable homes for contracts now and desktop/runtime implementations later.
3. Create or update the repo-level layout docs and any minimal scaffolding needed so downstream steps have exact target paths for entities, manifests, examples, and validation code.
4. Keep Phase 01 bounded: do not implement Electron UI, connectors, or runtime logic here; create placeholders only when they clarify file ownership.
5. Record why each top-level package or directory exists, especially the shared contracts location and the worked-example locations.
6. Validate by checking that every later Phase 01 step can name a single canonical target path, and update the phase note if any planned path changes.
7. Update Implementation Notes, Session History, and Outcome Summary with the final layout, any tooling choice, and any open question that remains.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
