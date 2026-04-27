# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the Notes side panel offers debounced whole-workspace markdown search with bounded indexing, stable result ordering, and result-click navigation into the editor.
- Success condition: search returns only user-facing markdown matches, excludes internal/unsafe paths, and opens the selected file correctly whether it lives in `Notes/` or elsewhere in the workspace.

**Why this step matters to the phase**
- The user explicitly chose whole-workspace search, so the plan can no longer rely on a notes-only filename filter.
- Search and wikilinks must agree on what counts as an in-scope workspace markdown file.

**Prerequisites, setup state, and dependencies**
- Step 03 must already provide side-panel state.
- Step 05 must already define the shared workspace markdown inclusion rules and resolver/index policy.
- Do not assume `SimpleQueryEngine` solves raw markdown search; it does not index note bodies.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/src/main/notes.ts` or a companion `workspace-markdown-search.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/components/sidepanels/NotesSidePanel.tsx`
- Commands: `pnpm run test`, `pnpm run typecheck`

**Required reading completeness**
- Read DEC-0011, DEC-0014, and the refined Step 05 note before building search.

**Implementation constraints and non-goals**
- Search scope: user-facing workspace markdown only.
- Exclude `.command-center/`, hidden directories, symlinks, non-markdown files, and oversized files.
- Return bounded results only; do not build an unbounded whole-workspace crawl in the renderer.
- Ranking can stay simple for v1: exact path/title hits before body hits, then deterministic path ordering.

**Validation commands, manual checks, and acceptance criteria mapping**
- Add tests for result filtering, snippet extraction, scope exclusion, and deterministic ordering.
- Manual: create unique content in both `Notes/` and another workspace markdown directory, search for it, and verify the correct result opens.
- Manual: confirm `.command-center/` content and symlinked markdown never appear in results.
- This step supports the phase acceptance item for whole-workspace search with bounded scope.

**Edge cases, failure modes, and recovery expectations**
- Duplicate filenames should show enough path context in results to disambiguate them.
- Snippet extraction must escape/format result text safely.
- Search should degrade gracefully on large workspaces via result caps and file-size limits rather than hanging the UI.

**Security considerations**
- Search must respect the same trusted path policy as Step 05. It must never become a backdoor to `.command-center/` or escaped paths.

**Performance considerations**
- Use a cached workspace markdown index or mtime-based memoization in the main process.
- Debounce renderer queries and cap result count and snippet length.

**Integration touchpoints and downstream effects**
- Reuses the workspace markdown resolver from Step 05.
- Lives in the side panel from Step 03 and opens files into the editor from Step 04.
- Step 08 will verify search remains correct while autosave and external file changes occur.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 08 should include any indexing invalidation edge cases discovered during testing.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_07_add-basic-full-text-search-across-notes|STEP-14-07 Add whole-workspace markdown search with bounded indexing]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
