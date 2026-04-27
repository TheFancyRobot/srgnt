# Execution Brief

## Why This Step Exists

- Incremental indexing depends on two persistence layers: vectors plus a manifest describing what was indexed and under which assumptions.

## Prerequisites

- STEP-16-01 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/`
- workspace root derived index directory from Phase 15

## Execution Prompt

1. Implement Vectra-backed insert, query, delete-by-file, and delete-by-chunk-id operations.
2. Implement persistent manifest state for indexed files, chunk ids, content hashes, mtimes, model id, and index version.
3. Add rebuild triggers when the model id, chunking strategy, or manifest version changes.
4. Add corruption and missing-manifest handling that prefers safe rebuilds over partial reuse.
5. Add tests for manifest version mismatch, file-state persistence, and vector cleanup semantics.

## Related Notes

- Step: [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_03_implement-vectrastore-and-persistent-index-state-manifests|STEP-16-03 Implement VectraStore and persistent index state manifests]]
- Phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]
