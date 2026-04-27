# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_14_notes_view/Steps/Step_01_add-ipc-channels-and-main-process-handlers-for-notes-file-operations|STEP-14-01 Freeze Notes workspace contract and typed IPC surface]]
- Phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
