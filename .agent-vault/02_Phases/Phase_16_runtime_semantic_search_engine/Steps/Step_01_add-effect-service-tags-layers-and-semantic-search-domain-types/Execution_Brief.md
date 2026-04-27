# Execution Brief

## Why This Step Exists

- This step prevents the engine from starting as ad hoc classes and promises that later need to be retrofitted into Effect services.

## Prerequisites

- Phase 15 complete.

## Relevant Code Paths

- `packages/runtime/src/index.ts`
- `packages/runtime/src/semantic-search/` (new)
- existing runtime package structure under `packages/runtime/src/`

## Execution Prompt

1. Add runtime module structure and exports for semantic search.
2. Define Effect tags and Layer constructors for each required service.
3. Add domain types and tagged errors that later steps can reuse without renaming churn.
4. Keep module boundaries small and explicit.
5. Add minimal tests proving service construction and error typing compile and run correctly.

## Related Notes

- Step: [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_01_add-effect-service-tags-layers-and-semantic-search-domain-types|STEP-16-01 Add Effect service tags, layers, and semantic search domain types]]
- Phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]
