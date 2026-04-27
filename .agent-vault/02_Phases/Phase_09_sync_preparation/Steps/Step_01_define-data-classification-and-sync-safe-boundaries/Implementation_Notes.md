# Implementation Notes

- Derived indexes should stay clearly distinct from authoritative workspace data.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/data-classification-matrix.md` — a classification matrix table covering every local data class in the product. Each row includes: data class name, storage format (markdown file / YAML frontmatter / derived index / cache), sensitivity level (public / internal / confidential / secret), authoritativeness (authoritative source / derived / cache), sync eligibility (sync-safe / encrypted-only / local-only / rebuildable), and rationale

*Production scaffolding code:*
- `packages/sync/` — new pnpm workspace package initialized with `package.json`, `tsconfig.json`, `src/index.ts`
- `packages/sync/src/schemas/classification.ts` — Effect Schema definitions:
  - `DataClassification` enum (`public`, `internal`, `confidential`, `secret`)
  - `SyncEligibility` enum (`syncSafe`, `encryptedOnly`, `localOnly`, `rebuildable`)
  - `DataClassEntry` schema (name, format, classification, eligibility, authoritative boolean)
  - `ClassificationMatrix` schema (array of `DataClassEntry`)
- `packages/sync/src/schemas/frontmatter.ts` — optional Effect Schema helpers for classification metadata references used by sync tooling; do not require earlier phases to add new frontmatter fields just to satisfy this step

**Key decisions to apply:**
- DEC-0002 (TypeScript + Effect.Schema) — all schemas must be Effect Schema, not plain TypeScript types
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
5. Every Effect Schema in `packages/sync/src/schemas/` can be imported and `parseSync()` called with a valid example
6. Classification matrix and Effect Schema definitions are consistent — every data class in the doc has a corresponding enum value or is representable by the schema
7. No data class is left as "TBD" — every class has a definitive sync eligibility assignment

**Junior-readiness verdict:** PASS — the deliverables are concrete (one doc, two schema files, one package scaffold). The classification exercise is conceptual but bounded by existing data classes. A junior dev needs access to PHASE-02/03/07 outputs to enumerate data classes. Provide a starter list of known data classes to prevent them from missing categories.

## Related Notes

- Step: [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
- Phase: [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
