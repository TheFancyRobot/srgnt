# Execution Brief

## Why This Step Exists

- Search, reindexing, deletion cleanup, and file watching must share identical scope rules or the subsystem will leak content or return inconsistent results.

## Prerequisites

- STEP-15-01 complete.

## Relevant Code Paths

- `packages/runtime/src/workspace/`
- `packages/runtime/src/semantic-search/` (new)
- `packages/desktop/src/main/notes.ts`
- `packages/contracts/src/workspace/layout.ts`

## Execution Prompt

1. Implement a canonical workspace-markdown corpus policy in runtime, not desktop.
2. Support `.md` and `.markdown` files only.
3. Exclude `.agent-vault/` and its contents completely.
4. Also exclude `.command-center/`, hidden directories, symlinks, escaped paths, the semantic index directory, and obviously non-user markdown artifacts.
5. Add deterministic tests for recursion, exclusion, path normalization, and symlink rejection.
6. Document any policy decision that differs from current Phase 14 rules before proceeding.

## Related Notes

- Step: [[02_Phases/Phase_15_semantic_search_foundation/Steps/Step_02_implement-canonical-workspace-markdown-corpus-policy-and-exclusions|STEP-15-02 Implement canonical workspace markdown corpus policy and exclusions]]
- Phase: [[02_Phases/Phase_15_semantic_search_foundation/Phase|Phase 15 semantic search foundation]]
