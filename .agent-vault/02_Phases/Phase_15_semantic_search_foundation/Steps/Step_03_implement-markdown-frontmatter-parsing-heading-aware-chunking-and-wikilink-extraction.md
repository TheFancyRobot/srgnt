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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: runtime can convert one supported markdown file into deterministic chunk records ready for embedding and incremental reindexing.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]

## Companion Notes

- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_03_implement-markdown-frontmatter-parsing-heading-aware-chunking-and-wikilink-extraction/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement deterministic markdown-to-chunk transformation with focused tests.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Keep the chunker self-contained and runtime-owned. Avoid coupling it to Vectra or Electron-specific code.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
