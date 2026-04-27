# Implementation Notes

- Local workspace on disk is authoritative.
- Derived metadata/index storage is allowed only as an acceleration layer.
### Refinement (readiness checklist — revised 2026-03-22)

**Exact outcome and success condition:**
- A working workspace bootstrap module at `packages/runtime/src/workspace/bootstrap.ts` that:
  1. Accepts a user-chosen workspace root path (string)
  2. Creates the expected directory tree on first run
  3. Validates an existing tree on reopen (detect missing dirs, permissions errors)
  4. Returns a typed `WorkspaceLayout` object describing what was created/validated
- Updated Zod schemas at `packages/contracts/src/workspace/layout.ts` (already exist — verify they cover all directories below)
- At least 2 tests: one for fresh bootstrap, one for reopen validation of an existing tree
- The architecture note (already covered in System_Overview + srgnt_framework) is cross-linked from the step

**Why this step matters to the phase:**
- This is the **only unchecked acceptance criterion** on PHASE-02. Without it, the phase cannot be marked completed.
- Every later phase (runtime persistence, connector state, artifact storage, sync preparation) depends on knowing where workspace data lives on disk.

**Prerequisites and setup state:**
- STEP-02-01 is completed — `packages/contracts/` and `packages/runtime/` exist with TypeScript, Zod, and Vitest configured.
- `packages/contracts/src/workspace/layout.ts` already defines `WorkspaceDirectoryLayout`, `WorkspaceFileConvention`, and related Zod schemas. Read these first.
- `packages/runtime/` has a `src/` directory with existing modules (`store.ts`, `manifests.ts`, etc.) — follow their patterns.

**Concrete starting files:**
- `packages/contracts/src/workspace/layout.ts` — existing Zod schemas (READ FIRST)
- `packages/runtime/src/` — existing runtime modules (follow import/style patterns)
- `packages/runtime/src/__tests__/` — place new bootstrap tests here
- `packages/contracts/src/index.ts` — verify workspace types are re-exported

**Required reading completeness:**
- `[[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02]]` — acceptance criteria
- `[[01_Architecture/System_Overview|System Overview]]` — `.command-center/` layout description
- `[[06_Shared_Knowledge/srgnt_framework|srgnt_framework]]` — workspace model section (search for "workspace" and "file-backed")
- `[[04_Decisions/DEC-0008_define-file-backed-record-contract-for-canonical-workspace-data|DEC-0008]]` — file-backed record contract (status: proposed — note this is not yet accepted)

**Implementation constraints and non-goals:**
- NO SQLite, LevelDB, or any database — DEC-0007 mandates markdown files as the data layer
- NO derived index/cache that is authoritative — must be rebuildable from files alone
- NO hard-coded workspace paths — must be configurable (user selects root at app launch)
- NO connector-specific or executor-specific storage — keep it generic
- NO raw tokens, refresh tokens, or API secrets inside workspace files — only references to OS secure-storage entries
- NO async file I/O library beyond Node.js built-in `fs/promises` unless the codebase already uses one (check `packages/runtime/package.json`)

**Validation commands:**
1. `pnpm --filter @srgnt/runtime build` — compiles
2. `pnpm --filter @srgnt/runtime test` — bootstrap tests pass
3. `pnpm typecheck` — full monorepo typecheck passes
4. Manual: write a test that calls `bootstrapWorkspace("/tmp/test-workspace")` and asserts the expected directories exist

**Edge cases and failure modes:**
- Workspace root already exists with partial directories — bootstrap must create missing dirs, not fail
- Permission denied on workspace root — must surface a clear error via the typed result, not crash
- Race condition: two bootstrap calls on same path — idempotent creation is safe, no locking needed for v1
- Path with special characters or spaces — use `path.join()` everywhere, never concatenate strings

**Security considerations:**
- Bootstrap must NOT write any secrets or credentials to disk
- Bootstrap must NOT set overly permissive file permissions (use 0o755 for directories)
- Workspace root path comes from user selection via the Electron main process — it is already behind the privileged boundary

**Performance considerations:**
- N/A for bootstrap (runs once per workspace open). Directory creation is inherently fast.

**Integration touchpoints and downstream effects:**
- `packages/desktop/main/index.ts` — the IPC handler for "workspace:open" must call bootstrap after the user selects a path
- Phase 03 canonical store — will read workspace files from the layout defined here
- Phase 04 connector state — will write under `.command-center/connectors/` using paths from this layout
- Phase 09 sync — will use this layout to know which files are sync-safe vs derived

**Blockers and unresolved decisions:**
- DEC-0008 (file-backed record contract) is still `proposed` — the directory tree design should not conflict with whatever DEC-0008 finalizes, but the step does NOT block on DEC-0008 acceptance since the basic layout is already agreed upon in the framework.

**Junior-developer readiness verdict: FAIL → PASS after updates above**
- Previous PASS was premature — the step note described the outcome but the bootstrap code does not exist yet.
- After this refinement, a junior developer has: exact file paths, existing schemas to build on, test patterns to follow, constraint list, and validation commands.
- The DEC-0008 blocker is explicitly non-blocking with reasoning.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
