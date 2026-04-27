# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: typing `/` in valid edit contexts opens a keyboard-navigable command menu that inserts markdown snippets into the live-preview editor without breaking cursor placement or markdown source fidelity.
- Success condition: the supported command set inserts the correct markdown skeletons and the menu behaves reliably with keyboard navigation and filtering.

**Why this step matters to the phase**
- The user wants Notion-like insertion affordances layered onto an Obsidian-like editor.
- This step proves the live-preview editor is extensible rather than a dead-end custom surface.

**Prerequisites, setup state, and dependencies**
- Step 04 must already provide a stable Tiptap editor with the ProseMirror document model and markdown serialization.
- Use Tiptap's built-in `@tiptap/suggestion` extension for the slash-command menu trigger and keyboard navigation, rather than bolting on global DOM listeners.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/desktop/package.json` — add `@tiptap/suggestion` if not already installed via starter-kit
- `packages/desktop/src/renderer/components/notes/TiptapEditor.tsx`
- `packages/desktop/src/renderer/components/notes/slash-commands.ts` — command definitions and insertion transforms
- `packages/desktop/src/renderer/components/notes/SlashCommandMenu.tsx` — React component for the popup menu
- Renderer tests for keyboard navigation and insertion behavior
- Commands: `pnpm run test`, `pnpm run typecheck`

**Required reading completeness**
- Read the refined Step 04 note and the live-preview editor implementation before starting this step.

**Implementation constraints and non-goals**
- Supported commands for v1: heading 1-3, bullet list, numbered list, task list, quote, fenced code block, callout, divider, and table skeleton.
- This is markdown insertion via Tiptap commands, not full Notion block reordering or drag-and-drop manipulation.
- Use Tiptap's `@tiptap/suggestion` extension for trigger detection, filtering, and keyboard navigation.
- Trigger only in valid editor contexts; do not trigger inside code blocks, inline code, or URLs.

**Validation commands, manual checks, and acceptance criteria mapping**
- Renderer tests for command filtering, arrow-key navigation, enter-to-select, and escape-to-close.
- Manual: type `/h2`, `/todo`, `/code`, `/callout`, and `/table` and verify the exact markdown inserted plus cursor placement.
- This step supports the phase acceptance item for slash commands remaining in-scope for the clarified editor UX.

**Edge cases, failure modes, and recovery expectations**
- Slash menu should not open inside fenced code or inline code contexts.
- Insertion must preserve undo/redo behavior and not break live-preview decorations.
- Commands that insert multi-line markdown must place the cursor at the expected edit position.

**Security considerations**
- Not applicable beyond reusing the trusted editor state and not introducing HTML insertion or external command execution.

**Performance considerations**
- Keep command filtering local and cheap. The menu should not trigger workspace-wide indexing or rerender the whole editor on every keystroke.

**Integration touchpoints and downstream effects**
- Built directly on top of the Step 04 editor foundation.
- Step 08 will verify slash-command insertion coexists with autosave and error handling.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 08 should note any complex insertion cases that need end-to-end regression coverage.

**Junior-developer readiness verdict**
- PASS

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
