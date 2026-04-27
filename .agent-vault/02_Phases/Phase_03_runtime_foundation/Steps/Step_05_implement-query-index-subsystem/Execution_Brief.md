# Execution Brief

## Step Overview

Build the local query/index layer based on the direction decided in the Dataview feasibility spike.

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

## Execution Prompt

1. Read the STEP-03-04 feasibility verdict and the resulting DEC note. Confirm the implementation direction before writing any code.
2. Implement the query engine in `packages/runtime/src/query/` following the direction chosen (Dataview wrapper or alternative).
3. Create Zod schemas in `packages/contracts/src/query.ts` for query definitions, field filters, sort orders, and result shapes.
4. Implement index rebuild and invalidation: the index must be fully rebuildable from markdown files, and deleting the index cache must not lose data.
5. Write integration tests: index workspace fixture files, run queries that filter by type and sort by date, verify results.
6. Validate that Phase 05 (workflow surfaces) can name the exact query API they will call.
7. Update notes with the implemented APIs, any deviations from the spike plan, and performance observations.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05 Implement Query Index Subsystem]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
