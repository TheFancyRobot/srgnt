---
note_type: step
template_version: 2
contract_version: 1
title: Wire workspace enable-disable behavior, reindex triggers, and status reporting
step_id: STEP-17-03
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle|STEP-17-01]]'
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_02_add-typed-ipc-handlers-preload-bridge-and-renderer-facing-semantic-search-api|STEP-17-02]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Wire workspace enable-disable behavior, reindex triggers, and status reporting

## Purpose

- Outcome: desktop integrates the runtime engine into actual workspace behavior, including first-enable indexing and ongoing incremental updates.

## Why This Step Exists

- The feature goal is not just query execution. Users must be able to enable it for a workspace and get a complete initial index plus ongoing updates safely.

## Prerequisites

- STEP-17-01 and STEP-17-02 complete.

## Relevant Code Paths

- desktop main semantic-search host modules
- workspace lifecycle and settings wiring in `packages/desktop/src/main/index.ts`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Wire feature enable/disable behavior to workspace-scoped state in a way that fits existing desktop architecture cleanly.
2. Ensure the first enable for a workspace triggers full initial indexing of supported markdown files.
3. Add file-watch or equivalent reindex triggers outside the renderer and exclude `.agent-vault`, hidden paths, symlinks, and the semantic index directory.
4. Expose status/progress data sufficient for future UI integration without overexposing internals.
5. Add tests for first-enable indexing, disable behavior, reindex triggers, and workspace switch safety.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Wire semantic search into workspace lifecycle and incremental triggers.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Disable should stop active indexing/search participation but should not automatically destroy the derived index unless a later product decision says so.

## Human Notes

- Be conservative with watchers. If safe partitioning is unclear, prefer explicit reindex triggers over clever but fragile watch behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means semantic search behaves like a real workspace feature instead of an isolated API.
