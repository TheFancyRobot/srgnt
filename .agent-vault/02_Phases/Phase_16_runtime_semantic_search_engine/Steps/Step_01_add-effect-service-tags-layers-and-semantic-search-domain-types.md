---
note_type: step
template_version: 2
contract_version: 1
title: Add Effect service tags, layers, and semantic search domain types
step_id: STEP-16-01
phase: '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|Phase 16 runtime semantic search engine]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Add Effect service tags, layers, and semantic search domain types

## Purpose

- Outcome: create the runtime module skeleton and Effect-first service boundaries that later implementation will fill.

## Why This Step Exists

- This step prevents the engine from starting as ad hoc classes and promises that later need to be retrofitted into Effect services.

## Prerequisites

- Phase 15 complete.

## Relevant Code Paths

- `packages/runtime/src/index.ts`
- `packages/runtime/src/semantic-search/` (new)
- existing runtime package structure under `packages/runtime/src/`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Add runtime module structure and exports for semantic search.
2. Define Effect tags and Layer constructors for each required service.
3. Add domain types and tagged errors that later steps can reuse without renaming churn.
4. Keep module boundaries small and explicit.
5. Add minimal tests proving service construction and error typing compile and run correctly.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Establish the runtime module and service skeleton.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Mirror the repo’s existing small-module package structure instead of placing everything in one monolithic file.

## Human Notes

- Keep names aligned with the user’s required service list unless repo conventions force a sharper boundary.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means the runtime semantic-search package shape is stable and Effect-first.
