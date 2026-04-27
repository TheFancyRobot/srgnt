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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: runtime can crawl the corpus, skip unchanged files, reindex changed files, remove deleted files, and rebuild the whole index when needed.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]

## Companion Notes

- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement the runtime indexing orchestration path end to end.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Prefer simple deterministic sequencing over speculative parallel crawl/write complexity in the first pass.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
