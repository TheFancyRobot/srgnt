# Implementation Notes

### Refinement (readiness checklist pass)

**Exact outcome / success condition**
- `packages/desktop/src/main/semantic-search/worker.ts` stops returning `createStubService()` in the happy path.
- Worker bootstraps the real `@srgnt/runtime` semantic-search layer graph and keeps a real service instance for `init`, `indexWorkspace`, `rebuildAll`, `search`, `removeFile`, and `dispose`.
- Existing host + IPC tests continue to pass without widening the renderer boundary.
- The worker still fails safely with a structured error if the runtime graph cannot initialize.

**Concrete starting points**
- Read the current stub path in `packages/desktop/src/main/semantic-search/worker.ts` (`createSemanticSearchService` + `createStubService`).
- Compare with runtime exports in `packages/runtime/src/semantic-search/index.ts` and `packages/runtime/src/semantic-search/services/layers.ts`.
- Inspect `packages/desktop/src/main/semantic-search/worker.test.ts`, `host.test.ts`, and `ipc-handlers.test.ts` before editing.

**Implementation constraints / non-goals**
- Keep the host thin; do not move runtime orchestration into `host.ts` or `main/index.ts`.
- Do not add renderer-visible filesystem or model APIs.
- Preserve the worker-thread boundary chosen in Phase 17.
- If packaged import resolution breaks, document the failure and add a guarded fallback path rather than silently reverting to a stub.

**Validation commands**
- `pnpm --filter @srgnt/runtime test`
- `pnpm --filter @srgnt/runtime typecheck`
- `pnpm --filter @srgnt/desktop test -- semantic-search`
- `pnpm --filter @srgnt/desktop typecheck`
- If the worker bootstrap changes public behavior, run the full desktop suite before handoff.

**Edge cases / failure modes**
- Runtime module resolves but layer construction fails.
- Worker receives commands before successful `init`.
- Runtime `dispose()` throws during teardown.
- Search is called against an empty index.

**Security / performance judgment**
- Security: applicable — renderer must still see only high-level IPC, never raw runtime handles.
- Performance: applicable — avoid re-creating the runtime graph per request; initialize once per worker lifecycle.

**Integration touchpoints**
- Desktop worker message protocol in `worker.ts`
- Host lifecycle in `host.ts`
- IPC handlers in `packages/desktop/src/main/index.ts`
- Runtime semantic-search services in `packages/runtime/src/semantic-search/`

**Readiness verdict**
- PASS — a junior developer can start here if they preserve the worker boundary and validate against the semantic-search desktop tests first.

## Related Notes

- Step: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01 Replace desktop worker stub with real runtime semantic-search Effect layer]]
- Phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]
