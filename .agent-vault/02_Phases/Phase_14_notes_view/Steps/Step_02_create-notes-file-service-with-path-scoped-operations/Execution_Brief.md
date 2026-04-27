# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Why This Step Exists

- The IPC channels from Step 01 need actual implementation logic
- Must implement path-scoping to ensure notes operations stay within `{workspaceRoot}/Notes/`
- Critical security requirement: block path traversal attacks (e.g., `../../../etc/passwd`)

## Prerequisites

- STEP-14-01 must be complete (IPC channels exist)
- Understand workspace root from `packages/desktop/src/main/settings.ts`

## Relevant Code Paths

- `packages/desktop/src/main/index.ts` - Where ipcMain handlers live
- `packages/desktop/src/main/settings.ts` - `ensureWorkspaceLayout()`, path patterns
- New file: `packages/desktop/src/main/notes.ts` - Notes service module

## Execution Prompt

1. Create `packages/desktop/src/main/notes.ts` with:
   - `getNotesDir(workspaceRoot: string): string` - returns `{workspaceRoot}/Notes/`
   - `ensureNotesDir(workspaceRoot: string): Promise<void>` - creates Notes dir if missing
   - `validateNotesPath(workspaceRoot: string, requestedPath: string): string | null` - resolves and validates path stays within Notes dir using `path.resolve()` containment check plus `fs.lstat()` symlink rejection (string-prefix checks alone are not sufficient)
   - `listNotes(workspaceRoot: string, subPath?: string): Promise<NoteEntry[]>` - returns file/folder tree
   - `readNote(workspaceRoot: string, fileName: string): Promise<string>` - reads file content
   - `writeNote(workspaceRoot: string, fileName: string, content: string): Promise<void>` - writes file using atomic pattern: write to `.tmp` file, `fsync`, then `rename` into place (per DEC-0008)
   - `createNote(workspaceRoot: string, fileName: string): Promise<void>` - creates note with minimal frontmatter (`title` from filename, `created` ISO date)
   - `createFolder(workspaceRoot: string, folderName: string): Promise<void>` - creates folder
   - `deleteEntry(workspaceRoot: string, entryName: string): Promise<void>` - deletes file or empty folder only; reject recursive delete with a clear error
   - `renameEntry(workspaceRoot: string, oldName: string, newName: string): Promise<void>` - renames; fails on collision rather than overwrite
   - `searchNotes(workspaceRoot: string, query: string): Promise<SearchResult[]>` - full-text search (stub returning empty results until Step 07)
   - Workspace-wide markdown read helpers: `listWorkspaceMarkdown()` and `resolveWikilink()` (stubs returning empty results until Step 05)

2. Register `ipcMain.handle()` handlers in `packages/desktop/src/main/index.ts` calling the notes service. Extract note-specific handler registration into a `registerNotesHandlers(workspaceRoot)` function to avoid further bloating the already 689-line file.
3. Ensure notes directory is created on first access if missing

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_02_create-notes-file-service-with-path-scoped-operations|STEP-14-02 Implement main-process notes service and scoped filesystem handlers]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
