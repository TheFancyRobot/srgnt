---
note_type: phase
template_version: 2
contract_version: 1
title: Runtime Semantic Search Engine
phase_id: PHASE-16
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]'
related_architecture:
  - '[[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]'
  - '[[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]'
related_decisions:
  - '[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]'
  - '[[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - phase
---

# Phase 16 Runtime Semantic Search Engine

## Objective

- Implement the production runtime engine for local semantic search, including embedding, Vectra persistence, incremental indexing, retrieval, typed errors, and runtime tests.

## Why This Phase Exists

- Once the foundation is frozen, the highest-value milestone is a runtime engine that can index and search a workspace without any Electron-specific assumptions.
- This keeps the core feature portable, testable, and aligned with the repo rule that shared product logic lives in `packages/runtime`.

## Scope

- Add Effect service tags and layers for `AppConfig`, `EmbeddingService`, `MarkdownChunker`, `IndexStateStore`, `VectraStore`, `WorkspaceIndexer`, and `SemanticSearchService`.
- Implement local-only embedding with model reuse and batched indexing calls.
- Implement Vectra-backed vector persistence with metadata-driven deletes and filtered retrieval.
- Implement persistent index manifests that use both `mtimeMs` and content hash to skip unchanged files and trigger rebuilds when the model or schema changes.
- Implement runtime orchestration for `init`, `indexWorkspace`, `reindexFile`, `removeFile`, `rebuildAll`, `search`, and feature enable/disable entry points where natural.
- Add deterministic runtime tests for skip logic, file-change reindexing, deleted-file cleanup, and semantic retrieval with mocked boundaries where practical.

## Non-Goals

- Electron IPC, preload exposure, or renderer UI.
- Final filesystem watcher wiring in desktop.
- Hybrid lexical-plus-semantic ranking.

## Dependencies

- Depends on [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]].
- Reuses the workspace markdown corpus policy, chunk metadata contract, and bundled model path established there.

## Acceptance Criteria

- [ ] Runtime exports a semantic-search subsystem that is Effect-first, typed, and test-covered.
- [ ] Local embedding loads once per process, batches indexing work, and never attempts a remote fetch.
- [ ] Vectra persistence stores vectors plus chunk metadata and supports removal of stale vectors for changed or deleted files.
- [ ] Persistent state uses both `mtimeMs` and content hash to skip unchanged files safely.
- [ ] Runtime search returns bounded semantic results with stable metadata and no dependence on Electron.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_01_add-effect-service-tags-layers-and-semantic-search-domain-types|STEP-16-01 Add Effect service tags, layers, and semantic search domain types]] -- unlocks runtime implementation.
- [ ] [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching|STEP-16-02 Implement local EmbeddingService with bundled multilingual model loading and batching]] -- depends on Step 01 and Phase 15 model bundling.
- [ ] [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_03_implement-vectrastore-and-persistent-index-state-manifests|STEP-16-03 Implement VectraStore and persistent index state manifests]] -- depends on Step 01.
- [ ] [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup|STEP-16-04 Implement workspace indexing orchestration and stale-data cleanup]] -- joins Steps 02-03 with Phase 15 corpus and chunking outputs.
- [ ] [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_05_implement-semantic-retrieval-feature-enable-flow-and-runtime-integration-tests|STEP-16-05 Implement semantic retrieval, feature enable flow, and runtime integration tests]] -- final runtime integration step.
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 unlocks Steps 02 and 03.
- Step 04 depends on Steps 02-03 plus the Phase 15 corpus and chunking outputs.
- Step 05 depends on Step 04 and should run last because it validates the public runtime surface.

## Notes

- Pressure-tested risk: Vectra keeps the index in memory, so this phase must keep metadata bounded and cleanup reliable rather than assuming unbounded corpora.
- Runtime tests should mock the embedding boundary where possible, but at least one integration path should prove manifest versioning and vector persistence work together.
- Search failure should fail open. Editing, browsing, and other product flows must remain usable if semantic search cannot initialize.
