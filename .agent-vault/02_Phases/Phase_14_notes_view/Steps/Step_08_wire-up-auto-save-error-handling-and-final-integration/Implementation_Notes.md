# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the full Notes surface is hardened for debounced autosave, save-state feedback, error handling, conflict/rename/delete recovery, and end-to-end validation across tree, editor, wikilinks, slash commands, and search.
- Success condition: the complete Notes flow survives common failure modes without data loss and is covered by automated checks plus a concrete manual validation script.

**Why this step matters to the phase**
- Earlier steps deliver capability. This step makes the feature safe to rely on in real use.
- It is where the phase proves the different Notes subfeatures actually work together as one product surface.

**Prerequisites, setup state, and dependencies**
- Steps 04-07 must be complete.
- Use a real temp workspace and at least one existing markdown file outside `Notes/` for integration validation.

**Concrete starting files, directories, packages, commands, and tests**
- All Notes-related files touched in Steps 03-07
- `packages/desktop/e2e/app.spec.ts`
- Renderer tests for save/error/conflict states
- Commands: `pnpm run typecheck`, `pnpm run test`, `pnpm run test:e2e`

**Required reading completeness**
- Read the refined notes from Steps 03-07 before changing integration behavior. No new design work should happen here unless a bug is discovered.

**Implementation constraints and non-goals**
- Keep atomic write semantics from Step 02 (write-to-temp, fsync, rename per DEC-0008).
- Surface save state in the Notes UI with at least `saving`, `saved`, and `error` states.
- On save failure: inline error banner in editor area with "Retry Save" + "Copy to Clipboard" buttons. Content stays in editor buffer.
- Handle open-file rename/delete and external modification predictably; do not silently clobber content.
- This step is not a sync/conflict-resolution phase for multi-device editing.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`.
- Manual validation script:
  1. Create a note in `Notes/`.
  2. Edit it and confirm autosave/status feedback.
  3. Use a slash command and confirm insertion + save.
  4. Add a wikilink to another workspace markdown file and open it.
  5. Search for content across both files and open the result.
  6. Rename/delete from the tree and verify the editor recovers correctly.
  7. Restart the app and confirm persistence.
- This step closes the phase acceptance items for autosave, error handling, and end-to-end integration.

**Edge cases, failure modes, and recovery expectations**
- Save failure must surface an inline error banner with "Retry Save" button and "Copy to Clipboard" fallback. No data loss.
- If the active file is renamed or deleted, the editor should show a clear recovery state rather than silently editing a stale path.
- External file modification should trigger a reload prompt on the next focus/poll cycle. If unsaved editor changes exist, show a conflict banner offering "Keep mine" (overwrite disk) or "Reload from disk" (discard editor buffer).
- Auto-retry on transient write failures with exponential backoff (1s, 2s, 4s) before surfacing the persistent error banner.

**Security considerations**
- Verify that all final UI flows still respect the Step 02 path policy and the Step 05/07 workspace markdown exclusions.

**Performance considerations**
- Debounced autosave and search must coexist without causing obvious UI stalls or redundant whole-document recomputation.
- Re-run through a modestly populated workspace to confirm the final integrated surface stays responsive.

**Integration touchpoints and downstream effects**
- This is the convergence point for the tree, shared Notes state, live-preview editor, slash commands, wikilinks, and search.
- Final E2E coverage becomes the handoff artifact for future Notes work.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- If any unresolved edge case remains after this step, record it as a bug or decision instead of leaving it implicit.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_08_wire-up-auto-save-error-handling-and-final-integration|STEP-14-08 Harden autosave, conflict recovery, and end-to-end Notes integration]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
