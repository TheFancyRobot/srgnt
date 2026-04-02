---
note_type: step
template_version: 2
contract_version: 1
title: Implement semantic retrieval, feature enable flow, and runtime integration tests
step_id: STEP-16-05
phase: '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Steps/Step_04_implement-workspace-indexing-orchestration-and-stale-data-cleanup|STEP-16-04]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Implement semantic retrieval, feature enable flow, and runtime integration tests

## Purpose

- Outcome: runtime exposes the finished semantic retrieval API and the engine-level feature enable behavior expected by desktop integration.

## Why This Step Exists

- This is the runtime milestone that Phase 17 can safely host. Without it, desktop would need to invent behavior that belongs in shared runtime code.

## Prerequisites

- STEP-16-04 complete.

## Relevant Code Paths

- runtime semantic-search modules and tests
- `packages/runtime/src/index.ts`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Implement `search(query)` with bounded result counts, stable ranking behavior, and safe result payload shaping.
2. Implement runtime-level feature enable/disable behavior where natural, including initial full-workspace indexing when the feature is first enabled.
3. Ensure disable stops active runtime participation without destructive automatic index deletion.
4. Add runtime integration tests using mocked embeddings or vector storage where practical and at least one realistic end-to-end runtime path.
5. Export the finished runtime service cleanly for desktop integration.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Finish the runtime public API and integration tests.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Search result shaping should give desktop enough metadata for a future titlebar search bar without leaking internal store details.

## Human Notes

- If result ranking needs a lexical tie-breaker for obvious exact-title hits, keep it small and document it explicitly.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means desktop can consume a stable runtime semantic-search service without reimplementing engine behavior.
