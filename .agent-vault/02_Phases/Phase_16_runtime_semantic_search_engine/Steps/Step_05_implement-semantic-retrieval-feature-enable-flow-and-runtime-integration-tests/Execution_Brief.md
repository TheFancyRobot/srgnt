# Execution Brief

## Why This Step Exists

- This is the runtime milestone that Phase 17 can safely host. Without it, desktop would need to invent behavior that belongs in shared runtime code.

## Prerequisites

- STEP-16-04 complete.

## Relevant Code Paths

- runtime semantic-search modules and tests
- `packages/runtime/src/index.ts`

## Execution Prompt

1. Implement `search(query)` with bounded result counts, stable ranking behavior, and safe result payload shaping.
2. Implement runtime-level feature enable/disable behavior where natural, including initial full-workspace indexing when the feature is first enabled.
3. Ensure disable stops active runtime participation without destructive automatic index deletion.
4. Add runtime integration tests using mocked embeddings or vector storage where practical and at least one realistic end-to-end runtime path.
5. Export the finished runtime service cleanly for desktop integration.

## Related Notes

- Step: [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_05_implement-semantic-retrieval-feature-enable-flow-and-runtime-integration-tests|STEP-16-05 Implement semantic retrieval, feature enable flow, and runtime integration tests]]
- Phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]
