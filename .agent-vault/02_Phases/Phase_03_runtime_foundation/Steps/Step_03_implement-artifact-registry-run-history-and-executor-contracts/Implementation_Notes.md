# Implementation Notes

- Artifact registry and run history should align with the workspace layout defined in Phase 02.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/runtime/src/artifacts/registry.ts` — artifact registry: CRUD operations for artifact metadata stored as markdown files with YAML frontmatter in `.command-center/state/artifacts/` (or the exact artifact root frozen by STEP-02-03)
- `packages/runtime/src/runs/history.ts` — run history store: records each skill/executor invocation as a markdown file in `.command-center/logs/runs/` with status, timestamps, input summary, output references, and approval records
- `packages/contracts/src/artifacts.ts` — Zod schemas for artifact metadata (id, type, source skill, created/updated timestamps, tags, executor reference)
- `packages/contracts/src/runs.ts` — Zod schemas for run records (id, skill id, executor id, status enum, timestamps, approval reference, artifact references)
- `packages/contracts/src/executors.ts` — Zod schemas for executor request/result contracts (generic request envelope, typed result envelope, executor manifest shape)
- `packages/runtime/src/executors/` — executor contract interfaces and a no-op reference executor for testing
- Test fixtures proving: (a) create artifact → read back matches, (b) record run → history query returns it, (c) executor request/result round-trip through the no-op executor

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — all artifact, run, and executor schemas are Zod-validated
- DEC-0007 (Dataview over markdown) — artifacts and run records are markdown files, not database rows. The Dataview query engine (STEP-03-04) will later index these same files. File format must be compatible.
- DEC-0005 (pnpm) — workspace dependency wiring between contracts, runtime, and executors packages

**Starting files:**
- Completed STEP-03-01: manifest loaders and canonical store
- Completed STEP-03-02: capability policy engine (run records reference approval decisions)
- STEP-02-03 workspace layout: exact paths for `.command-center/state/artifacts/` and `.command-center/logs/`

**Constraints:**
- Do NOT hard-code a specific executor backend (e.g., OpenAI, local LLM) — executor contracts must be pluggable
- Do NOT use a database for artifact or run storage — markdown files per DEC-0007
- Do NOT couple artifact identity to file path — artifacts have stable IDs independent of their location
- Do NOT import Electron APIs — this is pure runtime code

**Validation:**
1. `pnpm test --filter runtime` passes with artifact, run, and executor contract tests
2. `pnpm typecheck` passes across contracts + runtime + executors
3. An end-to-end fixture test: load manifest → check policy → create run record → produce artifact → verify both records are persisted as markdown files with correct frontmatter
4. The no-op executor successfully processes a request and produces a typed result without any real backend
5. Run history can be listed/filtered by skill ID and status

**Junior-readiness verdict:** PASS — this is the most complex PHASE-03 step but has clear boundaries. The no-op executor pattern gives a concrete implementation target. The main risk is scope creep into real executor backends — the constraints section guards against this.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_03_implement-artifact-registry-run-history-and-executor-contracts|STEP-03-03 Implement Artifact Registry Run History And Executor Contracts]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
