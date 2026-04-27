# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Notion-style `/` commands are a key UX feature: type `/` to quickly insert blocks
- Supports: headings (H1-H3), bullet list, numbered list, to-do, quote, code block, callout, divider, table

## Prerequisites

- STEP-14-04 must be complete (editor exists)
- Editor must be in edit mode to show slash command popup

## Relevant Code Paths

- `packages/desktop/src/renderer/components/NotesView.tsx` - Editor component

## Execution Prompt

1. Implement slash command popup in edit mode:
   - Detect when `/` is typed at start of line or after whitespace
   - Show popup menu below cursor with matching commands (filter as user types)
   - Commands to support: heading 1, heading 2, heading 3, bullet list, numbered list, to-do, quote, code block, callout, divider
2. When command selected, insert appropriate markdown syntax at cursor position
3. Use keyboard navigation (up/down arrows, enter to select, esc to close)
4. Match visual style with app branding

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_06_implement-notion-style-slash-commands-menu|STEP-14-06 Implement markdown slash commands on top of live preview]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
