# Execution Brief

## Why This Step Exists

- The worker boundary is the main safeguard against UI freezes and cross-workspace leakage.

## Prerequisites

- Phase 16 complete.

## Relevant Code Paths

- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/` new semantic-search host modules

## Execution Prompt

1. Add a main-process semantic-search host that owns worker startup, shutdown, initialization, and error handling.
2. Ensure workspace root changes tear down the old worker and clear in-flight work safely.
3. Pass runtime config, model path, and index root into the worker explicitly.
4. Add structured logs around worker startup, shutdown, and workspace changes.
5. Add focused tests for lifecycle and workspace-switch isolation.

## Related Notes

- Step: [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_01_implement-desktop-semantic-search-host-and-worker-lifecycle|STEP-17-01 Implement desktop semantic search host and worker lifecycle]]
- Phase: [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]
