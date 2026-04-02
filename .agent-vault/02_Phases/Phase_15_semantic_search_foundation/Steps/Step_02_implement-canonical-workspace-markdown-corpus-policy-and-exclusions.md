---
note_type: step
template_version: 2
contract_version: 1
title: Implement canonical workspace markdown corpus policy and exclusions
step_id: STEP-15-02
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01]]'
related_sessions: []
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - step
---

# Step 02 - Implement canonical workspace markdown corpus policy and exclusions

## Purpose

- Outcome: one reusable runtime service determines which workspace markdown files semantic search may crawl, index, watch, and return.

## Why This Step Exists

- Search, reindexing, deletion cleanup, and file watching must share identical scope rules or the subsystem will leak content or return inconsistent results.

## Prerequisites

- STEP-15-01 complete.

## Relevant Code Paths

- `packages/runtime/src/workspace/`
- `packages/runtime/src/semantic-search/` (new)
- `packages/desktop/src/main/notes.ts`
- `packages/contracts/src/workspace/layout.ts`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]

## Execution Prompt

1. Implement a canonical workspace-markdown corpus policy in runtime, not desktop.
2. Support `.md` and `.markdown` files only.
3. Exclude `.agent-vault/` and its contents completely.
4. Also exclude `.command-center/`, hidden directories, symlinks, escaped paths, the semantic index directory, and obviously non-user markdown artifacts.
5. Add deterministic tests for recursion, exclusion, path normalization, and symlink rejection.
6. Document any policy decision that differs from current Phase 14 rules before proceeding.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement one corpus policy shared by crawl, search, and watchers.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This service should return workspace-relative or canonical absolute paths consistently so later manifests and search results do not drift.
- Treat the semantic index directory itself as excluded from day one to avoid self-indexing loops.

## Human Notes

- If a future product phase wants `.command-center` searchable, that should be a new decision note. Do not smuggle that change into semantic-search implementation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means semantic search, reindexing, and future watchers all depend on one tested corpus-policy service.
