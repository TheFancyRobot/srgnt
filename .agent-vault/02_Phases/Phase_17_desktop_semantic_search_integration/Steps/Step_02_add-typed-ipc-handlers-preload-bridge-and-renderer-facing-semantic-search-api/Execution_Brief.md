# Execution Brief

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

## Execution Prompt

1. Add typed main-process handlers for the semantic-search API and route them through the desktop host.
2. Mirror the channels safely in the sandboxed preload without importing runtime values.
3. Expose only the narrow renderer API needed by future UI consumers.
4. Add preload self-containment and contract-sync tests for the new channels.
5. Add a minimal renderer-facing type shape in `env.d.ts` without inventing a full UI.

## Related Notes

- Step: [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_02_add-typed-ipc-handlers-preload-bridge-and-renderer-facing-semantic-search-api|STEP-17-02 Add typed IPC handlers, preload bridge, and renderer-facing semantic search API]]
- Phase: [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]
