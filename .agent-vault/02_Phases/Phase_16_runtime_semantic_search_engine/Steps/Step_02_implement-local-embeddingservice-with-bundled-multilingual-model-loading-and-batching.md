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

## Purpose

- Outcome: runtime can embed single queries and indexing batches locally through one reusable process-local model instance.

## Why This Step Exists

- Embedding is the core quality and performance boundary. It must hide model details while honoring the offline guarantee.

## Prerequisites

- STEP-16-01 and STEP-15-04 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/`
- bundled model config and asset paths from Phase 15

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Implement `EmbeddingService` behind the local-only runtime boundary.
2. Load the model once per process and reuse it across query and indexing calls.
3. Add batched embedding for indexing and single-query embedding for search.
4. Emit lightweight structured logs for model initialization and batch execution without logging chunk bodies.
5. Add tests around initialization, local-only failure modes, and batch behavior with mocked or fixture-friendly boundaries where needed.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement the local embedding boundary with process-level reuse.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Model id and embedding dimension belong in the service output and manifest boundary so Vectra data can be validated later.

## Human Notes

- Favor deterministic configuration over dynamic backend switching in this first implementation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means the runtime can produce local embeddings without any remote dependency or per-call model reload.
