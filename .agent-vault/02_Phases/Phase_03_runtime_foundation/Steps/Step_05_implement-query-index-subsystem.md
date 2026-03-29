---
note_type: step
template_version: 2
contract_version: 1
title: Implement Query Index Subsystem
step_id: STEP-03-05
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-03-01
  - STEP-03-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Implement Query Index Subsystem

Build the local query/index layer based on the direction decided in the Dataview feasibility spike.

## Purpose

- Implement the derived metadata/index layer that Today, Calendar, dashboards, and saved views depend on.
- Deliver a working query API that can filter and sort workspace artifacts without blocking later UI phases.

## Why This Step Exists

- The Dataview feasibility spike (STEP-03-04) determines whether we use Dataview or an alternative.
- Regardless of the outcome, downstream phases need a concrete query API — not a research note.
- This step converts the spike decision into production code.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]].
- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]] — the go/no-go decision must be recorded as a DEC note before this step begins.

## Relevant Code Paths

- `packages/runtime/src/query/` — query engine implementation (new)
- `packages/contracts/src/query.ts` — Zod schemas for query definitions (new)
- `packages/runtime/` — manifest loaders and workspace bootstrap from STEP-03-01
- `.agent-vault/04_Decisions/` — the DEC note from STEP-03-04 recording the chosen direction

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]] — read the feasibility verdict and DEC note first
- [[01_Architecture/Code_Map|Code Map]]
- [[04_Decisions/DEC-0007_use-dataview-query-engine-over-markdown-files-as-local-data-layer|DEC-0007 Use Dataview query engine over markdown files as local data layer]] plus any superseding decision created by STEP-03-04

## Execution Prompt

1. Read the STEP-03-04 feasibility verdict and the resulting DEC note. Confirm the implementation direction before writing any code.
2. Implement the query engine in `packages/runtime/src/query/` following the direction chosen (Dataview wrapper or alternative).
3. Create Zod schemas in `packages/contracts/src/query.ts` for query definitions, field filters, sort orders, and result shapes.
4. Implement index rebuild and invalidation: the index must be fully rebuildable from markdown files, and deleting the index cache must not lose data.
5. Write integration tests: index workspace fixture files, run queries that filter by type and sort by date, verify results.
6. Validate that Phase 05 (workflow surfaces) can name the exact query API they will call.
7. Update notes with the implemented APIs, any deviations from the spike plan, and performance observations.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-26
- Next action: None - SimpleQueryEngine implemented at packages/runtime/src/query/engine.ts with tests.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The index layer is derived state, not the authoritative workspace.
- This step is blocked until STEP-03-04 either reaffirms DEC-0007 with implementation constraints or records a superseding decision.
- **Senior review required before starting:** A senior engineer must review the STEP-03-04 spike verdict and approve the implementation direction. Do not begin implementation without this sign-off.

### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/runtime/src/query/` — query engine implementation (Dataview wrapper or alternative per STEP-03-04 DEC)
- `packages/contracts/src/query.ts` — Zod schemas for query definitions (field filters, sort orders, result shapes)
- At minimum supported operations: filter by frontmatter field, sort by date, list artifacts by type
- Integration test: index workspace artifacts directory, run filter + sort query, verify results match fixtures
- Documentation of rebuild/invalidation behavior: how the index refreshes when files change
- If Dataview: shims for Obsidian APIs needed by Dataview (documented and bounded)
- If alternative: the alternative engine implementation with equivalent query surface

**Key decisions to apply:**
- DEC-0007 (Dataview query engine) — validated or revised by STEP-03-04; follow the recorded direction
- DEC-0002 (TypeScript + Zod) — query schemas and results must be Zod-typed
- DEC-0007 corollary: index is derived state — must be fully rebuildable from markdown files alone

**Starting files:**
- Completed STEP-03-01: manifest loaders reading markdown + YAML frontmatter
- Completed STEP-03-02: workspace layout with artifact directories
- STEP-03-04 spike results and resulting DEC note
- If Dataview: the extraction prototype from the spike

**Constraints:**
- Do NOT start until STEP-03-04 DEC note is recorded and senior-reviewed
- Do NOT import Obsidian APIs as production dependencies if using Dataview — shim or fork only
- Do NOT make the index authoritative — markdown files are always the source of truth
- Do NOT build a full SQL-like query engine from scratch unless the spike rejected Dataview
- Do NOT block on a perfect query language — v1 needs filter + sort, not a full DSL

**Validation:**
1. STEP-03-04 output exists with a clear implementation direction: either reaffirmed DEC-0007 or a superseding decision
2. A test indexes 5+ markdown fixture files and queries them successfully (filter + sort)
3. Index rebuild test: delete the index cache, rebuild from files, verify identical results
4. `pnpm typecheck` and `pnpm test --filter runtime` pass
5. Phase 05 team can name the exact query API they will call
6. Query results are consistent with the source-of-truth markdown files (no stale index issues in tests)

**Edge cases / failure modes:**
- If Dataview extraction was flagged as "feasible but fragile" in the spike, this step may need to revise the approach mid-implementation. Stop and create a new DEC note rather than papering over the problem.
- If markdown files change during a query, the index may be stale. Document the invalidation strategy (watcher, polling, or manual refresh).

**Security:** N/A — the query engine operates on local workspace files only. No network, no user input injection.

**Performance:** Query latency on the workspace fixture set should be documented. If Dataview queries are slow on 100+ files, note this and propose an optimization path (background indexing, lazy loading).

**BLOCKER — STEP-02-03 dependency gap:** The "Starting files" section references "Completed STEP-02-03: workspace layout with artifact directories." STEP-02-03's contracts exist in `packages/contracts/src/workspace/layout.ts` but the bootstrap implementation in `packages/runtime/src/workspace/bootstrap.ts` does not yet exist. This step requires a real workspace directory structure to index. Do NOT begin implementation until STEP-02-03's file-backed bootstrap is complete, OR explicitly scope this step to index an arbitrary local directory of markdown files (acceptable for the prototype, but the production index must use the workspace layout from STEP-02-03).

**Junior-readiness verdict:** PASS — the implementation itself is standard TypeScript work once the STEP-03-04 decision gate is satisfied. The required senior sign-off is now an explicit prerequisite rather than hidden context: read the recorded decision, confirm approval, then implement the derived index exactly as specified.

## Human Notes

- This step was split from the original STEP-03-04 to separate the research spike (junior-executable with guidance) from the implementation (requires senior direction approval).

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means later UI phases know exactly what query/index substrate they can build on.
- Validation target: Phase 05 can point to explicit query/index modules and APIs.
