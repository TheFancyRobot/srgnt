---
note_type: phase
template_version: 2
contract_version: 1
title: Desktop Semantic Search Integration
phase_id: PHASE-17
status: planned
owner: ''
created: '2026-04-02'
updated: '2026-04-02'
depends_on:
  - '[[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]]'
related_architecture:
  - '[[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]'
related_decisions:
  - '[[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]'
  - '[[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]'
related_bugs:
  - '[[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]'
tags:
  - agent-vault
  - phase
---

# Phase 17 Desktop Semantic Search Integration

## Objective

- Wire the runtime semantic-search engine into Electron safely: worker lifecycle, workspace switching, feature enablement, filesystem watchers, typed IPC, preload bridge, and packaged offline validation.

## Why This Phase Exists

- The runtime engine is only useful to the product once desktop can host it without widening the renderer boundary or freezing the shell.
- This phase turns the engine into a production desktop subsystem rather than a library in isolation.

## Scope

- Add a desktop semantic-search host that manages the worker thread, workspace root changes, initialization, teardown, and in-flight operation boundaries.
- Add typed IPC handlers and a preload-safe bridge for the minimal semantic-search API.
- Implement feature enable/disable flows, first-enable full indexing, and filesystem watching or equivalent incremental triggers outside the renderer.
- Add desktop integration tests and packaged offline validation proving the bundled model works in real desktop builds.

## Non-Goals

- Building the final titlebar or omnibox search UI.
- Exposing arbitrary filesystem access, raw model execution, or raw Vectra operations to the renderer.

## Dependencies

- Depends on [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]].
- Reuses Phase 14 workspace markdown path policy for shared user-facing markdown boundaries.

## Acceptance Criteria

- [ ] Desktop hosts semantic search in a dedicated worker lifecycle owned by the Electron main process.
- [ ] Enabling the feature for the first time for a workspace triggers full initial indexing of supported documents.
- [ ] Workspace switching tears down the old engine cleanly and prevents cross-workspace leakage.
- [ ] The preload bridge exposes only narrow semantic-search methods needed by future UI consumers.
- [ ] Desktop integration tests and packaged offline validation pass.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]]
- Current phase status: planned
- Next phase: not planned yet.
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/Semantic_Search_Subsystem|Semantic Search Subsystem]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014 Notes workspace boundary and cross-workspace navigation rules]]
- [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- [[03_Bugs/BUG-0001_research-query-engine-memory-scaling-for-thousands-of-documents|BUG-0001 Query engine memory scaling for thousands of documents]]
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle|STEP-17-01 Implement desktop semantic search host and worker lifecycle]] -- establishes the Electron-side runtime boundary.
- [ ] [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_02_add-typed-ipc-handlers-preload-bridge-and-renderer-facing-semantic-search-api|STEP-17-02 Add typed IPC handlers, preload bridge, and renderer-facing semantic search API]] -- depends on Step 01.
- [ ] [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_03_wire-workspace-enable-disable-behavior-reindex-triggers-and-status-reporting|STEP-17-03 Wire workspace enable-disable behavior, reindex triggers, and status reporting]] -- depends on Steps 01-02.
- [ ] [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_04_add-desktop-integration-tests-and-packaged-offline-validation|STEP-17-04 Add desktop integration tests and packaged offline validation]] -- final validation step.
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 must run first because it defines worker lifecycle and workspace boundaries.
- Step 02 depends on Step 01.
- Step 03 depends on Steps 01-02 and is intentionally sequential because it touches the same main-process lifecycle and handler files.
- Step 04 runs last.

## Notes

- No final renderer UX is planned here. The goal is a clean API a future titlebar search bar can call.
- Security posture: preload stays thin, sandbox rules stay unchanged, and renderer never receives generic file or model primitives.
- Validation posture: packaged offline tests are mandatory because this initiative is not done until the bundled model works in a real desktop build.
