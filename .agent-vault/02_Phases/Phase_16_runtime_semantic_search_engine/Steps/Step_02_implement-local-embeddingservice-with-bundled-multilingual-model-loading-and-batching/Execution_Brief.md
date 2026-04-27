# Execution Brief

## Why This Step Exists

- Embedding is the core quality and performance boundary. It must hide model details while honoring the offline guarantee.

## Prerequisites

- STEP-16-01 and STEP-15-04 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/`
- bundled model config and asset paths from Phase 15

## Execution Prompt

1. Implement `EmbeddingService` behind the local-only runtime boundary.
2. Load the model once per process and reuse it across query and indexing calls.
3. Add batched embedding for indexing and single-query embedding for search.
4. Emit lightweight structured logs for model initialization and batch execution without logging chunk bodies.
5. Add tests around initialization, local-only failure modes, and batch behavior with mocked or fixture-friendly boundaries where needed.

## Related Notes

- Step: [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching|STEP-16-02 Implement local EmbeddingService with bundled multilingual model loading and batching]]
- Phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]
