# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: wikilinks render and resolve across user-facing workspace markdown files, clicking an existing link opens that file, typing `[[` offers workspace suggestions, and missing-link creation is limited to `Notes/`.
- Success condition: a junior engineer can prove that existing links outside `Notes/` open correctly while missing links outside `Notes/` remain non-destructive.

**Why this step matters to the phase**
- The user explicitly wants whole-workspace navigation, not a notes-only island.
- This step is where the `Notes/` write boundary and whole-workspace read boundary meet in one user-facing behavior.

**Prerequisites, setup state, and dependencies**
- Step 04 must already provide the live-preview editor foundation.
- Reuse the Step 02 path policy rather than inventing a new resolver in the renderer.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/src/main/notes.ts` or a companion workspace-markdown resolver module
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/renderer/env.d.ts`
- `packages/desktop/src/renderer/components/NotesView.tsx`
- `packages/desktop/src/renderer/components/notes/TiptapEditor.tsx` — add custom wikilink node/mark
- `packages/desktop/src/renderer/components/notes/wikilink-extension.ts` — Tiptap extension for `[[...]]` syntax
- `packages/desktop/src/renderer/components/notes/markdown-serializer.ts` — extend to handle wikilink serialization/parsing
- Commands: `pnpm run test`, `pnpm run typecheck`

**Required reading completeness**
- Read DEC-0014 plus the Step 02 service and Step 04 editor notes before implementing wikilinks.

**Implementation constraints and non-goals**
- Existing files may open anywhere under the user-facing workspace markdown tree.
- Auto-create is allowed only when the normalized target resolves under `${workspaceRoot}/Notes/`.
- Exclude `.command-center/`, hidden directories, symlinks, and non-markdown files from resolution/autocomplete.
- Do not add backlinks, graph view, or unbounded path interpolation from note text.

**Validation commands, manual checks, and acceptance criteria mapping**
- Renderer tests and/or integration tests for `[[Note]]`, `[[Folder/Note]]`, and `[[Note|Alias]]` rendering.
- Manual: create note A, link to note B in `Notes/`, open it, then link to an existing markdown file under `Daily/` or `Meetings/` and confirm it opens.
- Manual: verify a missing link outside `Notes/` does not create a file.
- This step supports the phase acceptance item for workspace-wide wikilink navigation with controlled creation rules.

**Edge cases, failure modes, and recovery expectations**
- Duplicate basenames across the workspace must resolve predictably; use workspace-relative targets rather than basename-only guesses when ambiguous.
- Autocomplete should show enough path context to disambiguate duplicates.
- Broken links should render as broken/non-resolved state without mutating disk until the user confirms a create-in-Notes action.

**Security considerations**
- Do not let note text become a raw file-open primitive. All resolution must go through the trusted main-process resolver and path policy.

**Performance considerations**
- Build or reuse a cached workspace markdown index for suggestions and resolution rather than walking the entire workspace on every `[[` keystroke.
- The autocomplete list (Tiptap Suggestion or custom dropdown) should be populated from a main-process IPC call that returns cached results, not from a renderer-side filesystem walk.

**Integration touchpoints and downstream effects**
- Shares the same workspace markdown inclusion rules as Step 07 search.
- Extends the live-preview editor from Step 04 and feeds into the hardening work in Step 08.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 07 should include the shared workspace markdown index/resolver so search reuses the same scope rules.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
