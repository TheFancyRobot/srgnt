# Implementation Notes

### Refinement (readiness checklist pass)

**Exact outcome / success condition**
- Worker config is derived from real desktop state, not hard-coded defaults in `host.ts`.
- Model asset resolution works in both dev and packaged builds.
- Derived semantic index root is stable, workspace-scoped, and excluded from watcher crawl loops.
- Configuration mismatches surface as explicit errors instead of silently falling back to a fake service.

**Concrete starting points**
- Current config assembly in `packages/desktop/src/main/semantic-search/host.ts`.
- Worker config/type definitions in `packages/desktop/src/main/semantic-search/types.ts`.
- Runtime config expectations in `packages/runtime/src/semantic-search/config.ts`.
- Existing workspace-root switch logic in `packages/desktop/src/main/index.ts`.

**Implementation constraints / non-goals**
- Do not hardcode project-root-relative model paths without packaged guards.
- Keep the semantic index outside user content and outside watcher recursion.
- Do not add environment-variable-only configuration that production desktop builds cannot reproduce.

**Validation commands**
- `pnpm --filter @srgnt/desktop test -- semantic-search`
- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/desktop test:e2e:packaged:linux` if packaged path handling changes materially

**Edge cases / failure modes**
- Missing model assets in dev.
- Packaged asset path differs from unpacked dev path.
- Workspace root contains symlinks, spaces, or hidden directories.
- Index root already exists with stale manifest data from older builds.

**Security / performance judgment**
- Security: applicable — config must not leak raw asset paths to renderer APIs.
- Performance: applicable — path resolution should happen once on init, not on every query.

**Integration touchpoints**
- Phase 15 model bundling work
- Phase 17 packaged validation tests
- Workspace watcher exclusions in `workspace-watcher.ts`

**Readiness verdict**
- PASS — execution is clear once STEP-18-01 lands, but implementers must prove both dev and packaged path resolution explicitly.

## Related Notes

- Step: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths|STEP-18-02 Wire real worker configuration model asset resolution and derived index paths]]
- Phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]
