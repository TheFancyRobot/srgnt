---
note_type: step
template_version: 2
contract_version: 1
title: Implement desktop semantic search host and worker lifecycle
step_id: STEP-17-01
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Implement desktop semantic search host and worker lifecycle

## Purpose

- Outcome: Electron main can start, stop, and swap a dedicated semantic-search worker cleanly per workspace.

## Why This Step Exists

- The worker boundary is the main safeguard against UI freezes and cross-workspace leakage.

## Prerequisites

- Phase 16 complete.

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/` new semantic-search host modules

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Execution Prompt

1. Add a main-process semantic-search host that owns worker startup, shutdown, initialization, and error handling.
2. Ensure workspace root changes tear down the old worker and clear in-flight work safely.
3. Pass runtime config, model path, and index root into the worker explicitly.
4. Add structured logs around worker startup, shutdown, and workspace changes.
5. Add focused tests for lifecycle and workspace-switch isolation.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Establish the desktop host and worker lifecycle boundary.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Keep the host thin. Runtime logic belongs in the worker via `@srgnt/runtime`, not reimplemented in desktop main.

## Human Notes

- If worker-thread packaging becomes unexpectedly fragile, document the issue and compare it against `utilityProcess` explicitly before changing direction.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means desktop can host semantic search without running heavy work in the renderer or Electron UI thread.
