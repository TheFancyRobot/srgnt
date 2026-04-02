---
note_type: step
template_version: 2
contract_version: 1
title: Implement workspace indexing orchestration and stale-data cleanup
step_id: STEP-16-04
phase: '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching|STEP-16-02]]'
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_03_implement-vectrastore-and-persistent-index-state-manifests|STEP-16-03]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions|STEP-15-02]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction|STEP-15-03]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Implement workspace indexing orchestration and stale-data cleanup

## Purpose

- Outcome: runtime can crawl the corpus, skip unchanged files, reindex changed files, remove deleted files, and rebuild the whole index when needed.

## Why This Step Exists

- This is the step where semantic search becomes operational instead of just a collection of components.

## Prerequisites

- Steps 15-02, 15-03, 16-02, and 16-03 complete.

## Relevant Code Paths

- runtime semantic-search modules under `packages/runtime/src/semantic-search/`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]

## Execution Prompt

1. Implement `init`, `indexWorkspace`, `reindexFile`, `removeFile`, and `rebuildAll` in the runtime orchestration service.
2. Use both `mtimeMs` and content hash to skip unchanged files safely.
3. Delete stale vectors before writing new vectors for changed files.
4. Remove vectors and manifest entries for deleted files.
5. Add structured logs for workspace indexing start/end, file reindexing, and deletion cleanup.
6. Add deterministic tests for skip logic, changed-file behavior, and deleted-file cleanup.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement the runtime indexing orchestration path end to end.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step should stay runtime-only. Desktop watchers and lifecycle belong in Phase 17.

## Human Notes

- Prefer simple deterministic sequencing over speculative parallel crawl/write complexity in the first pass.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means runtime can maintain a local semantic index incrementally and recover safely from file churn.
