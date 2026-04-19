---
note_type: step
template_version: 2
contract_version: 1
title: Implement main-process notes service and scoped filesystem handlers
step_id: STEP-14-02
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: completed
owner: ''
created: '2026-03-31'
updated: '2026-03-31'
depends_on:
  - '[[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01]]'
related_sessions:
  - '[[05_Sessions/2026-03-31-044642-implement-main-process-notes-service-and-scoped-filesystem-handlers-opencode|SESSION-2026-03-31-044642 OpenCode session for Implement main-process notes service and scoped filesystem handlers]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement main-process notes service and scoped filesystem handlers

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Create notes file service with path-scoped operations.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

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

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- `packages/desktop/src/main/settings.ts` - Path handling patterns and workspace layout
- `packages/desktop/src/main/index.ts` - Where current IPC handlers are registered (all inline, ~689 lines)
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] - Atomic write pattern: write-to-temp, fsync, rename-into-place

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

## Validation Commands

- `pnpm run typecheck` - Must pass
- Manual: Create a test note via IPC, verify it appears in `{workspaceRoot}/notes/`
- Manual: Try path traversal `../../etc/passwd` - should be rejected with error

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-31 - [[05_Sessions/2026-03-31-044642-implement-main-process-notes-service-and-scoped-filesystem-handlers-opencode|SESSION-2026-03-31-044642 OpenCode session for Implement main-process notes service and scoped filesystem handlers]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
