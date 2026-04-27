---
note_type: step
template_version: 2
contract_version: 1
title: Implement local EmbeddingService with bundled multilingual model loading and batching
step_id: STEP-16-02
phase: '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_01_add-effect-service-tags-layers-and-semantic-search-domain-types|STEP-16-01]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement local EmbeddingService with bundled multilingual model loading and batching

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: runtime can embed single queries and indexing batches locally through one reusable process-local model instance.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Companion Notes

- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_02_implement-local-embeddingservice-with-bundled-multilingual-model-loading-and-batching/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement the local embedding boundary with process-level reuse.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Favor deterministic configuration over dynamic backend switching in this first implementation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
