---
note_type: step
template_version: 2
contract_version: 1
title: Implement markdown slash commands on top of live preview
step_id: STEP-14-06
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: planned
owner: ''
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_04_implement-markdown-editor-with-syntax-highlighting|STEP-14-04]]'
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Implement markdown slash commands on top of live preview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement Notion-style slash commands menu.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

## Why This Step Exists

- Notion-style `/` commands are a key UX feature: type `/` to quickly insert blocks
- Supports: headings (H1-H3), bullet list, numbered list, to-do, quote, code block, callout, divider, table

## Prerequisites

- STEP-14-04 must be complete (editor exists)
- Editor must be in edit mode to show slash command popup

## Relevant Code Paths

- `packages/desktop/src/renderer/components/NotesView.tsx` - Editor component

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- Notion slash commands: `/heading`, `/bullet`, `/number`, `/todo`, `/quote`, `/code`, `/callout`, `/divider`, `/table`

## Execution Prompt

1. Implement slash command popup in edit mode:
   - Detect when `/` is typed at start of line or after whitespace
   - Show popup menu below cursor with matching commands (filter as user types)
   - Commands to support: heading 1, heading 2, heading 3, bullet list, numbered list, to-do, quote, code block, callout, divider
2. When command selected, insert appropriate markdown syntax at cursor position
3. Use keyboard navigation (up/down arrows, enter to select, esc to close)
4. Match visual style with app branding

## Validation Commands

- Manual: Type `/h2` in editor - should show "Heading 2" option, select it - should insert `## `

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-06.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
