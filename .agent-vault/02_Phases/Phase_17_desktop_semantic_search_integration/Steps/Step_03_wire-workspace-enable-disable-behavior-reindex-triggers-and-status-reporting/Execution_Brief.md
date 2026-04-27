# Execution Brief

## Why This Step Exists

- The feature goal is not just query execution. Users must be able to enable it for a workspace and get a complete initial index plus ongoing updates safely.

## Prerequisites

- STEP-17-01 and STEP-17-02 complete.

## Relevant Code Paths

- desktop main semantic-search host modules
- workspace lifecycle and settings wiring in `packages/desktop/src/main/index.ts`

## Execution Prompt

1. Wire feature enable/disable behavior to workspace-scoped state in a way that fits existing desktop architecture cleanly.
2. Ensure the first enable for a workspace triggers full initial indexing of supported markdown files.
3. Add file-watch or equivalent reindex triggers outside the renderer and exclude `.agent-vault`, hidden paths, symlinks, and the semantic index directory.
4. Expose status/progress data sufficient for future UI integration without overexposing internals.
5. Add tests for first-enable indexing, disable behavior, reindex triggers, and workspace switch safety.

## Related Notes

- Step: [[02_Phases/Phase_17_desktop_semantic_search_integration/Steps/Step_03_wire-workspace-enable-disable-behavior-reindex-triggers-and-status-reporting|STEP-17-03 Wire workspace enable-disable behavior, reindex triggers, and status reporting]]
- Phase: [[02_Phases/Phase_17_desktop_semantic_search_integration/Phase|Phase 17 desktop semantic search integration]]
