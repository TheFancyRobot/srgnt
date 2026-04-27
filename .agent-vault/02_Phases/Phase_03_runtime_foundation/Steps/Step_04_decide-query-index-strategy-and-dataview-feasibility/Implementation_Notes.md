# Implementation Notes

- The index layer is derived state, not the authoritative workspace.
- This decision is a blocker for dashboards, saved views, Today, and Calendar surfaces.
### Refinement (readiness checklist pass)

**Critical context — DEC-0007 and the Dataview research spike:**
DEC-0007 records Dataview as the default query/index direction, but it explicitly requires this step to confirm standalone feasibility before Phase 03 implementation proceeds. A **research spike** is required before any implementation:

1. **Feasibility audit:** Can Dataview's core query engine (`obsidian-dataview` npm package or its source) run outside Obsidian? Dataview depends on Obsidian's `MetadataCache`, `Vault`, and `App` APIs. The spike must determine which dependencies can be shimmed vs. which require a fork.
2. **Extraction prototype:** Build a minimal Node.js script that loads one markdown file with YAML frontmatter and executes one Dataview query against it. If this fails, document why and propose alternatives.
3. **Go/no-go decision:** If extraction is feasible with reasonable effort, reaffirm DEC-0007 and record the implementation constraints in the spike output. If not, document the blocker and create a superseding DEC note with the alternative chosen (e.g., custom query engine over gray-matter + simple filter/sort, or a lightweight alternative like `markdown-it` + custom indexer).

**Exact outcome:**
- A research spike document (session note or architecture note) recording Dataview extraction feasibility with evidence
- A minimal prototype script or sandbox proving the chosen direction can: index markdown files, filter by frontmatter field, sort by date, and list artifacts by type
- If not feasible: a superseding DEC note recording the alternative chosen, plus an implementation handoff note that STEP-03-05 can follow
- `packages/contracts/src/query.ts` may be sketched if that helps compare alternatives, but production query implementation belongs to STEP-03-05
- Documentation of rebuild/invalidation behavior: how the eventual index should refresh when files change

**Key decisions to apply:**
- DEC-0007 (Dataview query engine) — this is the default direction under confirmation. The spike either reaffirms it or supersedes it.
- DEC-0002 (TypeScript + Zod) — query schemas and results must be Zod-typed
- DEC-0007's corollary: the index is derived state — it must be fully rebuildable from markdown files alone, and deleting the index cache must not lose data

**Starting files:**
- Completed STEP-03-01: manifest loaders reading markdown + YAML frontmatter
- Completed STEP-02-03: workspace layout with artifact directories
- `obsidian-dataview` source code (to be audited during the spike — https://github.com/blacksmithgu/obsidian-dataview)

**Constraints:**
- Do NOT skip the research spike — do not assume Dataview extraction works without proving it
- Do NOT import Obsidian APIs as production dependencies — the product is standalone Electron, not a plugin
- Do NOT build a full SQL-like query engine from scratch if Dataview extraction is feasible
- Do NOT make the index authoritative — markdown files are always the source of truth
- Do NOT block on a perfect query language — v1 needs filter + sort, not a full DSL

**Validation:**
1. Research spike document exists with clear feasibility verdict and evidence
2. If go: a prototype indexes 5+ markdown fixture files and queries them successfully
3. If no-go: a superseding DEC note exists recording the alternative, and the alternative implementation plan names the same minimum query contract
4. Prototype notes explain how index rebuild would work from files alone
5. Phase 05 (workflow surfaces) team can name the exact query API family they will call after STEP-03-05 implements it

**BLOCKER — STEP-02-03 dependency gap:** The "Starting files" section references "Completed STEP-02-03: workspace layout with artifact directories." STEP-02-03's contracts exist but the file-backed bootstrap implementation does not yet exist. For this step's research spike, the blocker is soft — the Dataview feasibility spike can proceed against any local markdown directory. However, if the spike confirms Dataview, the STEP-03-05 implementation will need the real workspace bootstrap from STEP-02-03 first. Track this dependency: if STEP-02-03 implementation is not complete when STEP-03-05 begins, STEP-03-05 is blocked.

**Junior-readiness verdict:** PASS with guidance — this step is now scoped to the research spike only (no implementation). A junior dev can: (1) read Dataview source, (2) build the minimal extraction prototype, (3) document feasibility evidence. The go/no-go DECISION requires senior review, but the research itself is straightforward technical investigation. The implementation that depended on the spike verdict has been moved to [[02_Phases/Phase_03_runtime_foundation/Steps/Step_05_implement-query-index-subsystem|STEP-03-05]].

## Related Notes

- Step: [[02_Phases/Phase_03_runtime_foundation/Steps/Step_04_decide-query-index-strategy-and-dataview-feasibility|STEP-03-04 Decide Query Index Strategy And Dataview Feasibility]]
- Phase: [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
