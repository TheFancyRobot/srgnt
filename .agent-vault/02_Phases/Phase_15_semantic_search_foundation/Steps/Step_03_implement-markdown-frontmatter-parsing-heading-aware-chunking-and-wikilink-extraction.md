---
note_type: step
template_version: 2
contract_version: 1
title: Implement markdown frontmatter parsing, heading-aware chunking, and wikilink extraction
step_id: STEP-15-03
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: complete
owner: executor-1
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions|STEP-15-02]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Implement markdown frontmatter parsing, heading-aware chunking, and wikilink extraction

## Purpose

- Outcome: runtime can convert one supported markdown file into deterministic chunk records ready for embedding and incremental reindexing.

## Why This Step Exists

- Chunk shape is the semantic index contract. If title derivation, heading paths, or overlap rules drift later, vector persistence and rebuild behavior become brittle.

## Prerequisites

- STEP-15-01 and STEP-15-02 complete.

## Relevant Code Paths

- `packages/runtime/src/semantic-search/` (new)
- `packages/runtime/src/query/`
- `packages/runtime/src/workspace/`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]

## Execution Prompt

1. Parse YAML frontmatter when present and derive `title` from frontmatter `title` before falling back to the filename.
2. Split markdown by headings first and derive a stable `headingPath` for each chunk.
3. Split oversized sections again using configurable chunk size and overlap.
4. Extract wikilinks from chunk text and include them in metadata.
5. Compute deterministic content hashes and chunk ids from normalized metadata so stale-vector deletion is reliable.
6. Add tests for frontmatter title handling, heading-aware splitting, overlap behavior, and wikilink extraction.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement deterministic markdown-to-chunk transformation with focused tests.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Preserve source `mtimeMs` separately from the content hash so unchanged timestamp-only files and hash-only changes can both be reasoned about explicitly.
- Do not log full chunk bodies by default.

## Human Notes

- Keep the chunker self-contained and runtime-owned. Avoid coupling it to Vectra or Electron-specific code.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means one markdown file can be transformed into the required chunk metadata deterministically and testably.
