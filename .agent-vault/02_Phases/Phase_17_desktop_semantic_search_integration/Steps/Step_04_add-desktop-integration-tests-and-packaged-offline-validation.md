---
note_type: step
template_version: 2
contract_version: 1
title: Add desktop integration tests and packaged offline validation
step_id: STEP-17-04
phase: '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]'
status: complete
owner: executor-1
created: '2026-04-02'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_03_wire-workspace-enable-disable-behavior-reindex-triggers-and-status-reporting|STEP-17-03]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Add desktop integration tests and packaged offline validation

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: prove the finished subsystem works through the real desktop boundary and packaged offline builds.

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- existing preload and desktop E2E testing patterns in `packages/desktop/`

## Companion Notes

- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_04_add-desktop-integration-tests-and-packaged-offline-validation/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_04_add-desktop-integration-tests-and-packaged-offline-validation/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_04_add-desktop-integration-tests-and-packaged-offline-validation/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_04_add-desktop-integration-tests-and-packaged-offline-validation/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-02
- Next action: Prove the subsystem works in real desktop and packaged paths.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- If packaged validation is flaky, fix the packaging or test harness. Do not waive this requirement.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
