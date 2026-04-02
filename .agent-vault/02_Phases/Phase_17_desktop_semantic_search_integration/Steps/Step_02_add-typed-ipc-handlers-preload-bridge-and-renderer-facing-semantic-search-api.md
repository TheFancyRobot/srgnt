---
note_type: step
template_version: 2
contract_version: 1
title: Add typed IPC handlers, preload bridge, and renderer-facing semantic search API
step_id: STEP-17-02
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle|STEP-17-01]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_01_add-semantic-search-contracts-configuration-and-domain-errors|STEP-15-01]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Add typed IPC handlers, preload bridge, and renderer-facing semantic search API

## Purpose

- Outcome: the renderer can call the semantic-search subsystem safely through typed IPC and the sandboxed preload bridge.

## Why This Step Exists

- This is the user-facing access seam for future UI work, and it must stay narrow enough to preserve the Electron security posture.

## Prerequisites

- STEP-17-01 and STEP-15-01 complete.

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/preload/preload-ipc-sync.test.ts`
- `packages/desktop/src/renderer/env.d.ts`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- existing preload regression tests guarding BUG-0002 patterns

## Execution Prompt

1. Add typed main-process handlers for the semantic-search API and route them through the desktop host.
2. Mirror the channels safely in the sandboxed preload without importing runtime values.
3. Expose only the narrow renderer API needed by future UI consumers.
4. Add preload self-containment and contract-sync tests for the new channels.
5. Add a minimal renderer-facing type shape in `env.d.ts` without inventing a full UI.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Add the safe IPC and preload bridge for semantic search.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Reuse the repo’s existing preload discipline: no runtime imports, inlined channels, and tests guarding drift.

## Human Notes

- If a proposed renderer method feels generic or overpowered, remove it. The future titlebar search UI can always request another narrow method later.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means the renderer has a safe, typed semantic-search bridge and nothing more.
