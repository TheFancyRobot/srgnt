---
note_type: step
template_version: 2
contract_version: 1
title: Add semantic search contracts, configuration, and domain errors
step_id: STEP-15-01
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: complete
owner: executor-1
created: '2026-04-02'
updated: '2026-04-12'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-02-090000-plan-local-semantic-search-subsystem-opencode|SESSION-2026-04-02-090000 OpenCode session for Plan local semantic search subsystem]]'
  - '[[05_Sessions/2026-04-12-021506-add-semantic-search-contracts-configuration-and-domain-errors-executor-1|SESSION-2026-04-12-021506 executor-1 session for Add semantic search contracts, configuration, and domain errors]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - step
---

# Step 01 - Add semantic search contracts, configuration, and domain errors

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: define the typed contract surface for semantic search before implementation spreads across runtime, contracts, and desktop.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Companion Notes

- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Freeze the semantic search domain and IPC contract surface.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If this step discovers that the initial renderer API needs fewer methods, prefer fewer. The user explicitly does not want a large renderer UX invented here.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-02 - [[05_Sessions/2026-04-02-090000-plan-local-semantic-search-subsystem-opencode|SESSION-2026-04-02-090000 OpenCode session for Plan local semantic search subsystem]] - Step created during initiative planning.
- 2026-04-12 - [[05_Sessions/2026-04-12-021506-add-semantic-search-contracts-configuration-and-domain-errors-executor-1|SESSION-2026-04-12-021506 executor-1 session for Add semantic search contracts, configuration, and domain errors]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
