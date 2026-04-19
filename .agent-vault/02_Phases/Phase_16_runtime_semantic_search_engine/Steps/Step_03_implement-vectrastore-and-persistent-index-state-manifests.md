---
note_type: step
template_version: 2
contract_version: 1
title: Implement VectraStore and persistent index state manifests
step_id: STEP-16-03
phase: '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_01_add-effect-service-tags-layers-and-semantic-search-domain-types|STEP-16-01]]'
related_sessions: []
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - step
---

# Step 03 - Implement VectraStore and persistent index state manifests

## Purpose

- Outcome: runtime can persist semantic vectors and track index-manifest state needed for skip logic and rebuild safety.

## Why This Step Exists

- Incremental indexing depends on two persistence layers: vectors plus a manifest describing what was indexed and under which assumptions.

## Prerequisites

- STEP-16-01 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/`
- workspace root derived index directory from Phase 15

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]

## Execution Prompt

1. Implement Vectra-backed insert, query, delete-by-file, and delete-by-chunk-id operations.
2. Implement persistent manifest state for indexed files, chunk ids, content hashes, mtimes, model id, and index version.
3. Add rebuild triggers when the model id, chunking strategy, or manifest version changes.
4. Add corruption and missing-manifest handling that prefers safe rebuilds over partial reuse.
5. Add tests for manifest version mismatch, file-state persistence, and vector cleanup semantics.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement vector persistence and manifest-based state tracking together.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Keep the Vectra metadata fields aligned with the required chunk metadata contract so file-scoped cleanup stays cheap and reliable.

## Human Notes

- Derived state must stay disposable. If anything looks half-valid, rebuild instead of guessing.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means vector persistence and manifest state are durable enough to support incremental reindexing safely.
