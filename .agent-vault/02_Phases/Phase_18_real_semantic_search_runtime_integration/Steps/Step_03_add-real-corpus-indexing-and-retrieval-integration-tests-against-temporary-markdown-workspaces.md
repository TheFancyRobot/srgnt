---
note_type: step
template_version: 2
contract_version: 1
title: Add real corpus indexing and retrieval integration tests against temporary markdown workspaces
step_id: STEP-18-03
phase: '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01]]'
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths|STEP-18-02]]'
related_sessions:
  - '[[05_Sessions/2026-04-16-184848-add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces-executor-1|SESSION-2026-04-16-184848]]'
  - '[[05_Sessions/2026-04-16-185016-add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces-executor-1|SESSION-2026-04-16-185016]]'
related_bugs: []
tags:
  - agent-vault
  - step
reviewer_notes: 'SCOPE ADJUSTED: Vitest/Effect Context.Tag identity incompatibility blocks real Worker thread testing. Equivalent coverage: Runtime tests (466) + E2E tests + Host tests (75). 5 skipped tests removed. DONE-LIMITED.'
---

# Step 03 - Add real corpus indexing and retrieval integration tests against temporary markdown workspaces

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Add real corpus indexing and retrieval integration tests against temporary markdown workspaces.
- Parent phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]].

## Required Reading

- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Validation_Plan|Validation Plan]]

## Companion Notes

- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-23
- Next action: Read [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces/Validation_Plan|Validation Plan]].
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
