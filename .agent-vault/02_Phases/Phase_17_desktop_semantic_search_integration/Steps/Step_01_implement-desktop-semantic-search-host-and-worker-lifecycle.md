---
note_type: step
template_version: 2
contract_version: 1
title: Implement desktop semantic search host and worker lifecycle
step_id: STEP-17-01
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: in_progress
owner: executor-1
created: '2026-04-02'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Implement desktop semantic search host and worker lifecycle

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Electron main can start, stop, and swap a dedicated semantic-search worker cleanly per workspace.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]

## Companion Notes

- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Establish the desktop host and worker lifecycle boundary.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If worker-thread packaging becomes unexpectedly fragile, document the issue and compare it against `utilityProcess` explicitly before changing direction.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
