---
note_type: step
template_version: 2
contract_version: 1
title: Freeze Notes workspace contract and typed IPC surface
step_id: STEP-14-01
phase: '[[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]'
status: planned
owner: ''
created: '2026-03-31'
updated: '2026-03-31'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]]'
  - '[[05_Sessions/2026-03-31-034222-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-034222 OpenCode session for Add IPC channels and main process handlers for notes file operations]]'
  - '[[05_Sessions/2026-03-31-042636-freeze-notes-workspace-contract-and-typed-ipc-surface-opencode|SESSION-2026-03-31-042636 OpenCode session for Freeze Notes workspace contract and typed IPC surface]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Freeze Notes workspace contract and typed IPC surface

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add IPC channels and main process handlers for notes file operations.
- Parent phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]].

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

## Required Reading

- [[01_Architecture/System_Overview|System Overview]] - Desktop app architecture
- [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]] - Workspace file conventions
- `packages/contracts/src/ipc/contracts.ts` - Existing IPC channel patterns
- `packages/desktop/src/main/index.ts` - Existing ipcMain.handle() implementations

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

## Validation Commands

- `pnpm run typecheck` - Must pass with no errors
- Manual: Start app in dev mode and check console for IPC channel registration

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-31
- Next action: Start STEP-14-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
### Refinement (readiness checklist pass)

This section supersedes the vaguer template text above when they conflict.

**Exact outcome and success condition**
- Outcome: the workspace contract creates a top-level `Notes/` directory by default, and the typed notes IPC/preload/env surface exists before any service or UI work starts.
- Success condition: a junior engineer can name the canonical Notes root, the channel names, and the renderer API methods without inventing path shapes or handler payloads.

**Why this step matters to the phase**
- It removes the biggest phase-wide ambiguity first: where notes live and what the renderer is allowed to request.
- Every later step depends on these contracts staying stable.

**Prerequisites, setup state, and dependencies**
- Read the phase note, [[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]], and [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014]].
- Phase 13 layout work must already exist.

**Concrete starting files, directories, packages, commands, and tests**
- `packages/contracts/src/workspace/layout.ts` — add `"notes"` to `SWorkspaceDirectoryType` and `defaultWorkspaceLayout.rootDirectories`
- `packages/contracts/src/ipc/contracts.ts` — add `notes:*` channels and Effect Schema types
- `packages/desktop/src/preload/index.ts` — duplicate new channel strings and add invoke wrappers
- `packages/desktop/src/renderer/env.d.ts` — add typed method signatures to `SrgntAPI`
- `packages/desktop/src/main/settings.ts` — verify `ensureWorkspaceLayout()` picks up new layout entry
- `packages/contracts/src/ipc/contracts.test.ts` — add schema round-trip tests for new types
- `packages/desktop/e2e/app.spec.ts` — verify Notes/ directory exists after workspace bootstrap
- Commands: `pnpm run typecheck`, `pnpm run test`

**Required reading completeness**
- The files above plus the phase note and DEC-0014 are sufficient for this step.

**Implementation constraints and non-goals**
- Use `Notes` with capital `N` to match existing workspace root directory conventions.
- IPC channel names follow the existing `domain:action` kebab-case convention (e.g., `notes:list-dir`), not camelCase.
- IPC payloads must use workspace-relative or Notes-root-relative paths only. No absolute paths.
- The `ipcChannels` object must be updated in BOTH `contracts.ts` (canonical) AND `preload/index.ts` (inlined copy required by sandbox: true). Keeping these in sync is critical — a mismatch will silently fail at runtime.
- Forward-looking channels (`notes:search`, `notes:resolve-wikilink`, `notes:list-workspace-markdown`) should have schemas defined now but handlers can return empty/not-implemented until their respective steps.
- Do not add filesystem logic or editor packages in this step.
- Keep preload and `env.d.ts` in sync because preload cannot import runtime channel values.

**Validation commands, manual checks, and acceptance criteria mapping**
- Run `pnpm run typecheck`.
- Run targeted contract tests.
- Verify the E2E expectations no longer assume Notes is only a placeholder surface.
- This step supports the phase acceptance items for Notes-root creation and the typed IPC boundary.

**Edge cases, failure modes, and recovery expectations**
- Avoid naming drift between `contracts.ts`, preload, and `env.d.ts`.
- Distinguish Notes-root write DTOs from whole-workspace read/search DTOs now, rather than later.
- If a payload shape is still unclear, update this note before Step 02 starts.

**Security considerations**
- Renderer-facing APIs must remain relative-path and non-privileged. Accepting absolute paths fails this step.

**Performance considerations**
- Not applicable beyond keeping payloads minimal. No crawling, indexing, or editor rendering should happen yet.

**Integration touchpoints and downstream effects**
- Workspace bootstrap, preload, renderer typing, contract tests, and future main-process handlers all depend on this step.

**Blockers, unresolved decisions, and handoff expectations**
- No blockers remain.
- Handoff to Step 02 must include the finalized channel list and path field semantics.

**Junior-developer readiness verdict**
- PASS

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-31 - [[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]] - Session created.
- 2026-03-31 - [[05_Sessions/2026-03-31-034222-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-034222 OpenCode session for Add IPC channels and main process handlers for notes file operations]] - Session created.
- 2026-03-31 - [[05_Sessions/2026-03-31-042636-freeze-notes-workspace-contract-and-typed-ipc-surface-opencode|SESSION-2026-03-31-042636 OpenCode session for Freeze Notes workspace contract and typed IPC surface]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
