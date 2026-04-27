# Execution Brief

## Why This Step Exists

- This is the step where semantic search becomes operational instead of just a collection of components.

## Prerequisites

- Steps 15-02, 15-03, 16-02, and 16-03 complete.

## Relevant Code Paths

- runtime semantic-search modules under `packages/runtime/src/semantic-search/`

## Execution Prompt

1. Implement `init`, `indexWorkspace`, `reindexFile`, `removeFile`, and `rebuildAll` in the runtime orchestration service.
2. Use both `mtimeMs` and content hash to skip unchanged files safely.
3. Delete stale vectors before writing new vectors for changed files.
4. Remove vectors and manifest entries for deleted files.
5. Add structured logs for workspace indexing start/end, file reindexing, and deletion cleanup.
6. Add deterministic tests for skip logic, changed-file behavior, and deleted-file cleanup.

## Related Notes

- Step: [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup|STEP-16-04 Implement workspace indexing orchestration and stale-data cleanup]]
- Phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]
