# Implementation Notes

- This step should consume Phase 01 contracts as-is; if loaders need schema changes, push those back into the contract notes.
### Refinement (readiness checklist pass)

**Dependency check:** `depends_on` now points to `STEP-02-04`, which is the Phase 02 checkpoint that proves the desktop shell, workspace contract, and renderer scaffolding all exist before runtime implementation begins.

**Exact outcome:**
- `packages/runtime/src/store/` — canonical entity store module that loads, validates, and indexes entities from workspace markdown files
- `packages/runtime/src/loaders/manifest.ts` — manifest loader for skill manifests and connector manifests, parsing YAML frontmatter + body against Zod schemas from contracts
- `packages/runtime/src/loaders/entity.ts` — entity loader that reads markdown files from the workspace artifacts directory and produces typed entity objects
- `packages/contracts/src/manifests/` — Zod schemas for skill manifest and connector manifest shapes (if not already in Phase 01)
- Test fixtures in `packages/runtime/test/fixtures/` — at least one valid skill manifest, one valid connector manifest, one valid entity file, one intentionally invalid file (for error path testing)
- All loaders consume workspace paths from the layout defined in STEP-02-03

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — all parsing must go through Zod schemas; runtime errors on invalid manifests, not silent coercion
- DEC-0007 (Dataview query engine) — loaders read markdown + YAML frontmatter, which is the same format Dataview will later query. Loader output shapes should be compatible with what a query engine would index.
- DEC-0005 (pnpm) — packages/runtime imports packages/contracts as a workspace dependency

**Starting files:**
- Completed PHASE-02: workspace layout, desktop shell, contracts package with Zod schemas
- Phase 01 contract definitions and worked examples

**Constraints:**
- Do NOT embed connector-specific or executor-specific logic in the base loaders
- Do NOT use a database — loaders read directly from the filesystem (markdown files)
- Do NOT skip Zod validation for "known good" files — every load path must validate
- Do NOT import Electron APIs — runtime package must be Electron-agnostic (pure Node.js)

**Validation:**
1. `pnpm test --filter runtime` passes with loader tests covering: valid manifest, valid entity, invalid manifest (expect error), missing file (expect error)
2. `pnpm typecheck` passes across contracts + runtime
3. Loader output types match the Zod schema inferred types exactly (no `as any` casts)
4. A fixture test loads a Phase 01 example contract end-to-end and produces a typed object
5. Runtime package has zero Electron imports (grep check)

**Junior-readiness verdict:** PASS — the dependency metadata now matches the prerequisite text. The step itself is well-scoped (loaders + validation), and the implementer needs access to Phase 01 contract schemas and STEP-02-03's workspace layout.

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
