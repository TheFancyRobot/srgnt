---
note_type: step
template_version: 2
contract_version: 1
title: Wire real worker configuration model asset resolution and derived index paths
step_id: STEP-18-02
phase: '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]]'
status: done
owner: executor-1
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01]]'
  - '[[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_04_bundle-the-offline-model-assets-and-add-local-only-model-resolution|STEP-15-04]]'
related_sessions:
  - '[[05_Sessions/2026-04-16-182900-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-182900 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]]'
  - '[[05_Sessions/2026-04-16-183016-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-183016 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Wire real worker configuration model asset resolution and derived index paths

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: Wire real worker configuration model asset resolution and derived index paths.
- Parent phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]].

## Required Reading

- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[02_Phases/Phase_15_semantic_search_foundation/Phase|PHASE-15 Semantic Search Foundation]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01]]

## Companion Notes

- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-04-16
- Next action: Begin only after STEP-18-01 lands; then trace model/index path assembly from desktop bootstrap into worker config and make dev/packaged resolution explicit.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Treat asset and index paths as part of the production contract. A "works on my machine" path hack fails this step even if tests pass locally.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-16 - [[05_Sessions/2026-04-16-182900-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-182900 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]] - Session created.
- 2026-04-16 - [[05_Sessions/2026-04-16-183016-wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths-executor-1|SESSION-2026-04-16-183016 executor-1 session for Wire real worker configuration model asset resolution and derived index paths]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
