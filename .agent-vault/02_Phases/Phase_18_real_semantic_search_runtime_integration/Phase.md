---
note_type: phase
template_version: 2
contract_version: 1
title: Real Semantic Search Runtime Integration
phase_id: PHASE-18
status: complete
owner: ''
created: '2026-04-16'
updated: '2026-04-16'
depends_on:
  - '[[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]]'
related_architecture: []
related_decisions: []
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 18 Real Semantic Search Runtime Integration

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Replace the desktop worker's stub semantic-search service with the real `@srgnt/runtime` Effect-based engine, validate indexing and retrieval against real markdown workspaces, and add the thinnest possible UI slice to prove true end-to-end search behavior.

## Why This Phase Exists

- Phase 17 proved the Electron integration boundary, preload API, status reporting, and packaging story, but it intentionally stopped short of real embedding-backed retrieval.
- The biggest remaining truth gap is whether the desktop app can index real markdown content, run the local runtime engine in-process, and return useful results through a minimal user-facing flow.
- This phase closes that gap before larger UX work or ranking polish begins.

## Scope

- Replace the worker stub with the real runtime semantic-search service graph.
- Pass real workspace, model, and index-root configuration into the worker.
- Add integration tests that index temporary markdown workspaces and assert meaningful retrieval results.
- Add failure-path and crash-recovery coverage for the real runtime host.
- Add a minimal semantic-search UI slice that can issue a query, display results, and open the selected note.

## Non-Goals

- Ranking polish, advanced result grouping, or relevance tuning beyond deterministic fixture-based validation.
- A full command palette, omnibox, or production-final search UX.
- Remote or cloud-backed search services.

## Dependencies

- Depends on [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]].
- Reuses the runtime subsystem completed in [[02_Phases/Phase_16_runtime_semantic_search_engine/Phase|PHASE-16 Runtime Semantic Search Engine]].
- Assumes the local model packaging direction from [[04_Decisions/DEC-0015_use-runtime-owned-local-semantic-search-with-worker-hosted-bundled-model-and-workspace-root-derived-index|DEC-0015 Semantic search runtime and hosting model]].

## Acceptance Criteria

- [ ] Desktop worker uses the real `@srgnt/runtime` semantic-search Effect layer rather than a stub service.
- [ ] Real markdown workspace fixtures can be indexed and queried end-to-end through the desktop boundary.
- [ ] Failure paths are covered for missing assets, workspace switches, crashes, rebuilds, and disabled/empty states.
- [ ] A minimal UI slice can submit a query, render results, and open the chosen document.
- [ ] Packaged and offline validation still pass with the real runtime engine wired in.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|PHASE-17 Desktop Semantic Search Integration]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
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
- [ ] [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_01_replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer|STEP-18-01 Replace desktop worker stub with real runtime semantic-search Effect layer]] -- swap the fake worker service for the real runtime layer graph.
- [ ] [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_02_wire-real-worker-configuration-model-asset-resolution-and-derived-index-paths|STEP-18-02 Wire real worker configuration, model asset resolution, and derived index paths]] -- ensure the worker receives real workspace and model configuration in dev and packaged builds.
- [ ] [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_03_add-real-corpus-indexing-and-retrieval-integration-tests-against-temporary-markdown-workspaces|STEP-18-03 Add real corpus indexing and retrieval integration tests against temporary markdown workspaces]] -- prove real indexing and retrieval with deterministic fixtures.
- [ ] [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_04_add-crash-restart-and-failure-mode-coverage-for-real-semantic-search-runtime-hosting|STEP-18-04 Add crash, restart, and failure-mode coverage for real semantic-search runtime hosting]] -- cover missing assets, rebuilds, and workspace-switch edge cases.
- [ ] [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Steps/Step_05_add-a-minimal-semantic-search-ui-slice-for-end-to-end-query-and-result-validation|STEP-18-05 Add a minimal semantic-search UI slice for end-to-end query and result validation]] -- prove a real user-facing query flow before broader UX work.
<!-- AGENT-END:phase-steps -->

## Parallel Work Map

- Step 01 must run first because the desktop worker still needs the real runtime engine wired in.
- Step 02 depends directly on Step 01 because real config, model path resolution, and derived index roots should be validated against the real worker, not the stub path.
- Step 03 depends on Steps 01-02 because truthful retrieval tests require the real runtime engine plus production-like config.
- Step 04 depends on Step 03 because failure and recovery coverage should exercise the real indexed/searchable path rather than a partially wired worker.
- Step 05 runs last because the UI slice should prove the already-validated end-to-end desktop stack rather than become a debugging crutch for unfinished backend work.

## Notes

- Keep the renderer API narrow even after real runtime wiring lands.
- Prefer deterministic markdown fixtures and explicit relevance assertions over vague manual spot checks.
- Do not treat this phase as ranking polish; the milestone is truthful end-to-end behavior with local data.
