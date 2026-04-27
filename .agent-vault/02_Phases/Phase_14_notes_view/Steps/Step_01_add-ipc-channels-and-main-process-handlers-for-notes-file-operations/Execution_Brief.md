# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- Phase 14 requires file system operations (read, write, list, create, delete) scoped to the notes directory
- Currently no IPC channels exist for these operations; they're needed before any renderer-side notes functionality can work
- Establishes the secure IPC bridge with path-scoped operations to prevent path traversal attacks

## Prerequisites

- Phase 13 must be complete (activity bar and side panel scaffold exist)
- Must work with existing IPC channel patterns in `packages/contracts/src/ipc/contracts.ts`
- All new channels must be exposed through preload script in `packages/desktop/src/preload/index.ts`

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts` - Add new IPC channel constants
- `packages/desktop/src/main/index.ts` - Add ipcMain.handle() implementations
- `packages/desktop/src/preload/index.ts` - Expose new channels to renderer
- `packages/desktop/src/main/settings.ts` - Reference for existing workspace path patterns

## Execution Prompt

1. Read `packages/contracts/src/ipc/contracts.ts` to understand existing IPC channel pattern (lines 5-39 show channel definitions using `domain:action` kebab-case convention)
2. Add new IPC channels to `ipcChannels` object using the same `domain:action` convention:
   - `notes:list-dir`: list contents of a directory under Notes/
   - `notes:read-file`: read a note file
   - `notes:write-file`: write/save a note file
   - `notes:create-file`: create new note file (with minimal frontmatter: title + created date)
   - `notes:create-folder`: create new folder
   - `notes:delete`: delete file (or empty folder only)
   - `notes:rename`: rename file or folder
   - `notes:search`: full-text search across workspace markdown (forward-looking; handler returns empty results until Step 07 implements search)
   - `notes:resolve-wikilink`: resolve a wikilink target to a workspace-relative path (forward-looking for Step 05)
   - `notes:list-workspace-markdown`: list all user-facing markdown files for autocomplete/suggestions (forward-looking for Step 05)
3. Add corresponding request/response Effect Schema types for each channel (follow `S` prefix convention: `SNotesListDirRequest`, etc.)
4. **Critical**: Update BOTH `packages/contracts/src/ipc/contracts.ts` AND `packages/desktop/src/preload/index.ts` — the preload duplicates channel strings because sandbox: true prevents runtime imports
5. Update `packages/desktop/src/renderer/env.d.ts` SrgntAPI interface with typed method signatures for each new channel
6. Update `packages/contracts/src/workspace/layout.ts`:
   - Add `"notes"` to `SWorkspaceDirectoryType` literal
   - Add `{ type: "notes", path: "Notes", description: "Operational notes and artifacts" }` to `defaultWorkspaceLayout.rootDirectories`
7. Verify `packages/desktop/src/main/settings.ts` `ensureWorkspaceLayout()` will create `Notes/` automatically via the layout contract
8. Validate: Run `pnpm run typecheck` and ensure no type errors

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01 Freeze Notes workspace contract and typed IPC surface]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
