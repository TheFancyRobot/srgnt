---
note_type: step
template_version: 2
contract_version: 1
title: Add semantic search contracts, configuration, and domain errors
step_id: STEP-15-01
phase: '[[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]'
status: in-progress
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

## Purpose

- Outcome: define the typed contract surface for semantic search before implementation spreads across runtime, contracts, and desktop.

## Why This Step Exists

- This step freezes the names, payloads, errors, and service boundaries that later steps must share.
- It prevents runtime and desktop from inventing competing models for status, search results, rebuild triggers, and feature enable behavior.

## Prerequisites

- Read the parent phase, [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]], and [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015]].

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/contracts/src/workspace/layout.ts`
- `packages/runtime/src/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008 File-backed record contract]]
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Add runtime-owned semantic-search domain types covering chunk metadata, search results, index status, feature state, manifest versions, and typed domain errors.
2. Add `AppConfig` and semantic-search config schema entries for workspace root, index root, model asset path, chunk size, overlap, batch size, and corpus exclusions.
3. Add typed IPC contracts only for the desktop-facing operations the renderer should call later: `init`, `enableForWorkspace`, `indexWorkspace`, `rebuildAll`, `search`, and status reporting.
4. Keep the contract high-level. Do not expose raw file paths, Vectra primitives, or model-execution internals to the renderer.
5. Add focused schema and type tests so the rest of the initiative can depend on these contracts safely.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Freeze the semantic search domain and IPC contract surface.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Keep result metadata aligned with the required chunk fields: `id`, `filePath`, `fileName`, `title`, `headingPath`, `chunkIndex`, `chunkText`, `wikilinks`, `mtimeMs`, `contentHash`, and `modelId`.
- Error types should distinguish configuration failure, model asset failure, index corruption, crawl-policy violation, and unsupported-file conditions.

## Human Notes

- If this step discovers that the initial renderer API needs fewer methods, prefer fewer. The user explicitly does not want a large renderer UX invented here.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-02 - [[05_Sessions/2026-04-02-090000-plan-local-semantic-search-subsystem-opencode|SESSION-2026-04-02-090000 OpenCode session for Plan local semantic search subsystem]] - Step created during initiative planning.
- 2026-04-12 - [[05_Sessions/2026-04-12-021506-add-semantic-search-contracts-configuration-and-domain-errors-executor-1|SESSION-2026-04-12-021506 executor-1 session for Add semantic search contracts, configuration, and domain errors]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion for this step means runtime, contracts, and desktop all share one typed semantic-search contract surface with targeted tests.
