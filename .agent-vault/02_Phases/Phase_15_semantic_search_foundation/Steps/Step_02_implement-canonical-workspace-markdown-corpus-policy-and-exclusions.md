---
note_type: step
template_version: 2
contract_version: 1
title: Implement canonical workspace markdown corpus policy and exclusions
step_id: STEP-15-02
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: complete
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

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: one reusable runtime service determines which workspace markdown files semantic search may crawl, index, watch, and return.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]

## Companion Notes

- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Implement one corpus policy shared by crawl, search, and watchers.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If a future product phase wants `.command-center` searchable, that should be a new decision note. Do not smuggle that change into semantic-search implementation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
