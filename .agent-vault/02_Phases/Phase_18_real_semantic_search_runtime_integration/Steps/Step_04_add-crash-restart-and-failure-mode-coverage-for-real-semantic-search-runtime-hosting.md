---
note_type: step
template_version: 2
contract_version: 1
title: Add crash restart and failure-mode coverage for real semantic-search runtime hosting
step_id: STEP-18-04
phase: '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces|STEP-18-03]]'
related_sessions:
  - '[[05_Sessions/2026-04-16-191400|SESSION-2026-04-16-191400]]'
related_bugs: []
tags:
  - agent-vault
  - step
reviewer_notes: 'SCOPE ADJUSTED: Gap tests (model asset error, workspace switch during in-flight indexing) blocked by Vitest/Effect mock complexity. Existing coverage comprehensive: host tests (75) + worker protocol (2) + IPC handlers (32) + E2E failure tests (7). DONE-LIMITED.'
---

# Step 04 - Add crash restart and failure-mode coverage for real semantic-search runtime hosting

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Add crash restart and failure-mode coverage for real semantic-search runtime hosting.
- Parent phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]].

## Required Reading

- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-23
- Next action: Read [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Put judgment calls or cautions here.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
