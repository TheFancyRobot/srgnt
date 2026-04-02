---
note_type: step
template_version: 2
contract_version: 1
title: Add desktop integration tests and packaged offline validation
step_id: STEP-17-04
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_03_wire-workspace-enable-disable-behavior-reindex-triggers-and-status-reporting|STEP-17-03]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Add desktop integration tests and packaged offline validation

## Purpose

- Outcome: prove the finished subsystem works through the real desktop boundary and packaged offline builds.

## Why This Step Exists

- This initiative is not done until the packaged app can perform local semantic search with the bundled model and safe Electron boundary intact.

## Prerequisites

- STEP-17-03 complete.

## Relevant Code Paths

- desktop integration tests and E2E tests
- packaged build scripts under `packages/desktop/`

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- existing preload and desktop E2E testing patterns in `packages/desktop/`

## Execution Prompt

1. Add desktop integration or E2E tests covering preload access, search execution, result delivery, and workspace switching.
2. Add offline validation proving the bundled model loads and semantic indexing/search work with network unavailable.
3. Add packaged-build validation so the model path and worker host behave in real release artifacts.
4. Add failure-path tests for corrupt index state, missing bundled assets, and stale workspace cleanup where practical.
5. Record any residual performance or packaging risk explicitly instead of leaving it implicit.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Prove the subsystem works in real desktop and packaged paths.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step is the final gate for the user’s offline-first and Electron-safe requirements.

## Human Notes

- If packaged validation is flaky, fix the packaging or test harness. Do not waive this requirement.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Not started yet. Completion means the semantic-search subsystem is validated in the same boundary it will ship with.
