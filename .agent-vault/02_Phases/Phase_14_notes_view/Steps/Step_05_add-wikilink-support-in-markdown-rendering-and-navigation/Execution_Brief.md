# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Obsidian-style wikilinks are a core requirement: `[[Note Name]]` and `[[Note Name|Display Text]]`
- Clicking a wikilink should navigate to that note (open in editor or create if doesn't exist)
- Must also work in edit mode for autocomplete

## Prerequisites

- STEP-14-04 must be complete (editor exists with markdown rendering)
- Understand wikilink syntax from Obsidian docs

## Relevant Code Paths

- `packages/desktop/src/renderer/components/NotesView.tsx` - Where rendering happens
- Markdown rendering library configuration

## Execution Prompt

1. Add wikilink parsing to markdown rendering:
   - Convert `[[Note Name]]` to clickable links in preview mode
   - Handle `[[Note Name|Alias]]` for custom display text
2. Implement click handler: when wikilink clicked, find file in workspace and open it
3. If linked note doesn't exist, offer to create it
4. In edit mode: add autocomplete popup when typing `[[` to suggest existing notes
5. Support linking to notes outside notes/ folder (e.g., `Daily/2024-01-15.md`)

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_05_add-wikilink-support-in-markdown-rendering-and-navigation|STEP-14-05 Add workspace-wide wikilink resolution, navigation, and note creation]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
