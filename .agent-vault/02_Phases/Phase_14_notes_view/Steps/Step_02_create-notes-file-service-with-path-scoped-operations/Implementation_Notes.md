# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: a tested main-process notes service exists and owns all Notes tree/file operations plus workspace-wide markdown read helpers used later by wikilinks and search.
- Success condition: the service enforces `Notes/`-only writes, bounded whole-workspace markdown reads, atomic replace-in-place writes, and stable handler error shapes.

**Why this step matters to the phase**
- This is the actual trust boundary for the entire Notes feature.
- If path validation or write semantics are wrong here, later UI work becomes unsafe no matter how polished it looks.

**Prerequisites, setup state, and dependencies**
- Step 01 must already define the Notes root contract and typed IPC surface.
- Read DEC-0008 and DEC-0014 before writing path logic.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/settings.ts`
- `packages/desktop/src/main/notes.ts`
- `packages/desktop/src/main/notes.test.ts` or equivalent temp-dir coverage
- Commands: `pnpm run typecheck`, `pnpm run test`

**Required reading completeness**
- The phase note, DEC-0008, DEC-0014, `settings.ts`, and current `index.ts` are sufficient.

**Implementation constraints and non-goals**
- Writes stay limited to `${workspaceRoot}/Notes/`.
- Whole-workspace reads/search may inspect user-facing markdown only.
- Exclude `.command-center/`, hidden directories, symlinks, non-markdown files, and oversized files from workspace-wide reads.
- Allow file delete and empty-folder delete only. No recursive delete.
- Rename must fail on collision rather than overwrite.
- Atomic writes per DEC-0008: write content to a `.tmp` sibling, call `fsync`, then `rename` into place. If any step fails, the original file must remain intact.
- Path validation must use `path.resolve()` containment check PLUS `fs.lstat()` symlink rejection. String-prefix checks alone are bypassable.
- New note creation must insert minimal frontmatter: `title` (derived from filename) and `created` (ISO date).
- Extract IPC handler registration into a `registerNotesHandlers()` function rather than adding more inline handlers to the 689-line `main/index.ts`.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run `pnpm run typecheck`.
- Run targeted tests for traversal, absolute paths, symlink escape, atomic write, rename collision, and delete safety.
- Manual: create/read/rename/delete inside `Notes/` and confirm rejection of `../../etc/passwd`, absolute paths, and symlink escapes.
- This step supports the phase acceptance items for scoped file operations and safe persistence.

**Edge cases, failure modes, and recovery expectations**
- Missing workspace root should fail with a user-safe error.
- Atomic write failures must leave the original file intact.
- Open-file rename/delete should return stable errors that the renderer can surface later.
- Read helpers must not follow symlink loops.

**Security considerations**
- Critical. Use resolved-path containment plus symlink rejection. String-prefix checks alone are not sufficient.

**Performance considerations**
- Enforce file-size limits early because whole-workspace search will reuse this boundary later.
- Avoid eagerly reading file contents during tree listing.

**Integration touchpoints and downstream effects**
- Step 03 consumes tree/list/read APIs.
- Steps 04-08 depend on stable save/read/error behavior.
- Step 05 and Step 07 reuse the same workspace markdown inclusion rules.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 03 should include the exact tree node and file descriptor DTOs.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02 Implement main-process notes service and scoped filesystem handlers]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
