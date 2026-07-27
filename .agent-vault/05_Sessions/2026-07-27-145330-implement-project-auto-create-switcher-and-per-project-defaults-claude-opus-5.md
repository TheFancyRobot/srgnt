---
note_type: session
template_version: 2
contract_version: 1
title: claude-opus-5 session for Implement project auto-create switcher and per-project defaults
session_id: SESSION-2026-07-27-145330
date: '2026-07-27'
status: completed
owner: claude-opus-5
branch: phase/24-step-02-projects
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
related_bugs: []
related_decisions: []
created: '2026-07-27'
updated: '2026-07-27'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-27-145330
  status: completed
  updated_at: '2026-07-27T15:25:00.000Z'
  current_focus:
    summary: 'STEP-24-02 complete: project entity (auto-create by directory, rename, merge with crash-recoverable journal), per-project defaults resolved into session creation, project-policy hook filled, and a ProjectSwitcher in the chat side panel. Automated validation green across contracts/runtime/desktop/harness, root build, root typecheck, and the new E2E spec; the manual GUI pass was NOT performed (headless session).'
    target: '[[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto-titles and concurrent session management]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto-titles and concurrent session management]]'
    section: Context Handoff
  last_action:
    type: completed
---

# claude-opus-5 session for Implement project auto-create switcher and per-project defaults

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Review [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]] before editing.
- Record changed paths and validation as the session progresses.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 14:53 - Created session note.
- 14:53 - Linked related step [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]].
<!-- AGENT-END:session-execution-log -->
- 14:55 - Read Execution Brief + Validation Plan; inspected `packages/contracts/src/project.ts`, `packages/runtime/src/sessions/`, `packages/runtime/src/permissions/engine.ts`, `packages/desktop/src/main/services/workspace.ts` (re-root hooks), `chat/index.ts` + `chat/session-controller.ts`, `renderer/main.tsx` panel registration. Readiness gate passed - brief is specific enough to execute.
- 14:58 - Contracts: `SProject` gains `permissionPolicy` (Record<kind, allow|reject|ask>) and a bounded non-empty `name`; added `project:*` channels and their request/response schemas; `SChatSessionNewRequest.target` made optional and gained `projectId`.
- 15:00 - Runtime: extracted `shared/atomic-json.ts` from `writeSessionMeta` (one atomic writer for `meta.json` and `project.json`), added `projects/paths.ts` (`deriveProjectId` = sha256(resolve(rootDir)).slice(0,12)), `projects/store.ts` (`ProjectStore`), `projects/policy.ts` (`createProjectPolicyHook`).
- 15:03 - Runtime suite green: 32 new store tests + 8 policy/engine tests; full runtime 415 passed.
- 15:05 - Desktop main: `services/projects.ts` (re-roots on workspace change, runs `recoverMerges` there), wired into `main/index.ts` IPC registration + `afterRootChanged`; `chat/index.ts` resolves the project (by id, else `ensureForDir(cwd)`), applies `defaultHarnessId` via `resolveChatTarget`, passes `permissionPolicy` and the project `rootDir` as cwd, and rejects a session whose `rootDir` no longer exists.
- 15:08 - Preload + `env.d.ts`: `projectList/Ensure/Rename/Merge/SetDefaults`; `chatSessionNew(target?, projectId?)`.
- 15:10 - Renderer: `ProjectsContext.tsx` + `ProjectSwitcher.tsx` mounted in `ChatPlanSidePanel`; `ProjectsProvider` wraps `ChatSessionProvider` in `main.tsx`; `.project-row` semantic-token styles.
- 15:14 - First E2E run failed: the shared default workspace (`~/srgnt-workspace`) leaked projects across runs. Spec now re-roots to a per-test temp workspace via `setWorkspaceRoot`.
- 15:17 - Second E2E run exposed a REAL bug (not a test artifact): `ProjectsProvider` preselected `projects[0]`, so a stale project silently captured session creation and broke every Phase-23 chat E2E. Fixed: preselect only the project whose `rootDir` equals the workspace root, else `null` (= let main derive from cwd).
- 15:20 - Full validation sweep: all package suites, root build, root typecheck, full desktop E2E.

## Findings

- Record important facts learned during the session.
- Promote durable information into architecture, bug, or decision notes when appropriate.
- **A default "active project" must never be an arbitrary pick.** The first switcher implementation preselected `projects[0]`, which silently redirected `chat:session:new` into an unrelated project - and when that project's `rootDir` had been deleted, every Phase-23 chat E2E failed with "points at ... which no longer exists". The fix (`ProjectsContext.refresh`) preselects only the project whose `rootDir` equals the workspace root, else `null`, which main reads as "derive it from the cwd". Regression-tested in `ProjectSwitcher.test.tsx > active project selection`.
- **The merge journal does not need a `movedSessionIds` list.** Recovery re-reads whatever is still under the source and moves it, which is self-correcting and idempotent; the journal only has to carry the source's `rootDir` + `additionalDirectories`, because step 4 deletes the source `project.json` and a resume after that point could not read them back. This is a simplification of the shape the brief sketched.
- **Truncated-hash collisions are a tunable, not a correctness risk.** `ensureProjectForDir` compares the stored `rootDir` before reusing a project and throws `ProjectIdCollisionError` on a mismatch, so widening the 12-char slice is a free change later.
- **A corrupt `project.json` is repaired, not rejected.** It carries no trustworthy `rootDir`, so there is no other directory whose project could be stolen by rewriting it - and rejecting would wedge that directory forever. A valid record with a *different* `rootDir` is the only fail-closed case.
- `request.kind` is agent-supplied, so the project-policy lookup uses `Object.prototype.hasOwnProperty.call` - a bare `policy[kind]` would let `__proto__`/`constructor` return a function where a decision was expected. Covered by a test.
- **`~/srgnt-workspace` used to be shared by every desktop E2E run.** `completeOnboarding` clicks "Use Default Location", which resolved to the developer's real home workspace, so anything a spec wrote persisted across runs and leaked between tests. Fixed during PR review: `resolveDefaultWorkspaceRoot` honors `SRGNT_DEFAULT_WORKSPACE_ROOT` and `getElectronLaunchEnv` points it inside each test's own user-data dir, so every spec is isolated by the fixture. `e2e/projects.spec.ts` additionally re-roots at runtime via `setWorkspaceRoot`.
- The permission engine already had the `projectPolicy` hook from STEP-23-03; filling it needed no engine change at all, only `createProjectPolicyHook` and passing an engine into `createChatPermissionHost`.

## Context Handoff

- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.
- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.
STEP-24-02 is done and validated; the next unit is [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03]] (session list, auto-titles, concurrent session management).

What STEP-24-03 inherits:

- **`ProjectStore`** (`packages/runtime/src/projects/`): `ensureProjectForDir(rootDir)` (idempotent, per-id locked, `ProjectIdCollisionError` on a rootDir mismatch), `get`, `list()` -> `{projects, skipped}`, `rename`, `setDefaults`, `merge`, `recoverMerges()`. Id = `sha256(path.resolve(rootDir)).slice(0,12)`; `rootDir` is `path.resolve`d, never `realpath`ed.
- **Main-process ownership**: `packages/desktop/src/main/services/projects.ts`. Re-rooted (and merge-recovered) from `main/index.ts`'s `afterRootChanged`. Channels: `project:list|ensure|rename|merge|set-defaults`. There is deliberately **no** `project:get` and **no** project deletion.
- **Session creation already carries a project**: `chat:session:new` takes an optional `projectId` (absent = derive from the workspace cwd) and an optional `target` (absent = the project's `defaultHarnessId`, then `mock`). The response and the `client/session_created` audit event both carry `projectId`. The session cwd is the project's `rootDir`.
- **Renderer state**: `ProjectsContext.tsx` holds `projects` + `activeProjectId`; `ProjectSwitcher` lives in `ChatPlanSidePanel`. The active project defaults to the one whose `rootDir` is the workspace root and is `null` otherwise - **do not "helpfully" preselect an arbitrary project**, that exact change broke every chat E2E this session (see Findings).
- **Still in memory**: `ChatSessionController` keeps `SessionEvent[]` per session and does NOT write through `SessionStore`. The persistence swap is still open work; when it lands, mind the recorded `ponytail:` ceiling in `sessions/event-log.ts` - `readEventLog` reads the whole file and `readEvents({fromSeq})` filters after parsing, so a poll-from-zero loop is quadratic. Read once and follow the tail.
- **E2E specs each get their own default workspace** via `SRGNT_DEFAULT_WORKSPACE_ROOT` in `getElectronLaunchEnv` (added during PR review). Nothing a spec writes reaches the developer's real `~/srgnt-workspace`; no per-spec action is needed.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- Itemized below. Post-review additions: `runtime/src/projects/store.ts` (both-project merge lock, pre-flight collision check, moved-session retarget, corrupt-record collision guard), `runtime/src/shared/atomic-json.ts` (parent-directory fsync), `desktop/src/main/settings.ts` + `desktop/e2e/fixtures.ts` (per-test default workspace), `renderer/components/chat/{ProjectsContext,ProjectSwitcher,ChatView,ChatSessionContext}.tsx`, `contracts/src/ipc/contracts.test.ts` (duplicate import).
<!-- AGENT-END:session-changed-paths -->
- `packages/contracts/src/project.ts` - `SProjectPermissionPolicy`, `PROJECT_NAME_MAX_LENGTH`, bounded `name`, optional `permissionPolicy`.
- `packages/contracts/src/ipc/contracts.ts` - `project:*` channels; ensure/rename/merge/set-defaults/list schemas; `SChatSessionNewRequest.target` optional + `projectId`; `SChatSessionNewResponse.projectId`.
- `packages/contracts/src/project.test.ts`, `packages/contracts/src/ipc/contracts.test.ts` - new schema coverage.
- `packages/runtime/src/shared/atomic-json.ts` (new), `packages/runtime/src/shared/index.ts` (new) - `writeJsonAtomic`, extracted from `writeSessionMeta`.
- `packages/runtime/src/sessions/meta.ts` - now delegates to `writeJsonAtomic` (behavior unchanged).
- `packages/runtime/src/projects/paths.ts`, `store.ts`, `policy.ts`, `index.ts` (all new) - `ProjectStore`, `deriveProjectId`, `createProjectPolicyHook`.
- `packages/runtime/src/projects/store.test.ts`, `policy.test.ts` (new) - 32 + 8 tests.
- `packages/runtime/src/index.ts` - re-exports `projects/` and `shared/`.
- `packages/desktop/src/main/services/projects.ts` (new) + `projects.test.ts` (new, 8 tests).
- `packages/desktop/src/main/index.ts` - projects service composed, IPC registered, re-rooted in `afterRootChanged`, passed to `registerChatHandlers`.
- `packages/desktop/src/main/chat/index.ts` - `resolveChatTarget`, project resolution, deleted-rootDir guard.
- `packages/desktop/src/main/chat/session-controller.ts` - `newSession(target, project)`, project cwd, project-policy-backed permission engine, `projectId` in the response and audit event.
- `packages/desktop/src/main/chat/ipc.test.ts` - 6 new project-resolution tests.
- `packages/desktop/src/preload/index.ts`, `packages/desktop/src/renderer/env.d.ts` - project bridge + `chatSessionNew(target?, projectId?)`.
- `packages/desktop/src/renderer/components/chat/ProjectsContext.tsx`, `ProjectSwitcher.tsx` (new) + `ProjectSwitcher.test.tsx` (new, 14 tests).
- `packages/desktop/src/renderer/components/chat/ChatSessionContext.tsx` - reads the active project, sends it with `chatSessionNew`, refreshes the list after a session opens.
- `packages/desktop/src/renderer/components/sidepanels/ChatPlanSidePanel.tsx` - hosts the switcher above the plan.
- `packages/desktop/src/renderer/main.tsx` - `ProjectsProvider` wraps `ChatSessionProvider`.
- `packages/desktop/src/renderer/components/chat/ChatView.test.tsx` - assertion updated for the new `chatSessionNew` arity.
- `packages/desktop/src/renderer/styles.css` - `.project-row` (semantic tokens only).
- `packages/desktop/e2e/projects.spec.ts` (new, 3 specs) + `packages/desktop/package.json` (added to the explicit `test:e2e` spec list).

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: `pnpm --filter @srgnt/{runtime,desktop,contracts,harness} test`, `pnpm -r run typecheck`, `pnpm build`, `playwright test`
- Result: PASS — runtime 415 (5 consecutive runs, fast-check), desktop 1073, contracts 167, harness 114 + 2 skipped; E2E 81 passed / 2 pre-existing environmental failures.
- Notes: per-command detail below. Post-review re-runs are recorded at the end of this section.
<!-- AGENT-END:session-validation-run -->
All commands below were run in the foreground on macOS (darwin 25.5.0); results are verbatim.

- `pnpm --filter @srgnt/contracts test` - PASS, 167 tests / 7 files.
- `pnpm --filter @srgnt/runtime test` - PASS, 415 tests / 21 files. **Run 5 times back to back** (the suite includes the fast-check property file `sessions/event-log.property.test.ts`): 415 passed on every run, no seed-dependent flake.
- `pnpm --filter @srgnt/desktop test` - PASS, 1073 tests / 59 files.
- `pnpm --filter @srgnt/harness test` - PASS, 114 passed / 2 skipped.
- `pnpm build` (repo root) - PASS.
- `pnpm -r run typecheck` - PASS (all three desktop tsconfigs, contracts, runtime, harness).
- `npx playwright test e2e/projects.spec.ts` (packages/desktop) - PASS, 3/3.
- Full desktop E2E list (`app.spec.ts chat.spec.ts projects.spec.ts gfm-compliance.spec.ts ui-coverage-matrix.spec.ts bug-0013-visual.spec.ts`) - **81 passed, 2 failed**. Both failures are environmental and unrelated to this step:
  - `bug-0013-visual.spec.ts` - requires a packaged **Linux** build at `release/linux-unpacked/srgnt`; ENOENT on macOS.
  - `app.spec.ts:129 "exercises preload APIs for persistence, PTY launch, and renderer security"` - `terminal:launch-with-context` fails with `posix_spawnp failed` (PTY spawn blocked in this sandboxed shell). This step touches no terminal/PTY code.
  - The 8 Phase-23 `chat.spec.ts` specs that failed on the FIRST full run were a genuine regression this run caught (the `projects[0]` preselection); they all pass after the fix.

**NOT performed, explicitly:** the Validation Plan's manual pass (`pnpm --filter @srgnt/desktop dev` -> start a session in dir A, second in dir B, switch/rename/merge by hand) was NOT run - this was a headless agent session with no GUI. The same flows are covered by `e2e/projects.spec.ts` against the real Electron stack, but no human-eyes check of layout, spacing, or theming of the switcher has happened. Real-Pi (`target: 'pi'`) per-project `defaultHarnessId` resolution was also not exercised against a live Pi binary; only the mock harness ran.

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- None.
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [x] STEP-24-02 is complete; continue at [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto titles and concurrent session management]].
<!-- AGENT-END:session-follow-up-work -->
- [ ] Manual/GUI pass on the switcher (`pnpm --filter @srgnt/desktop dev`): layout, spacing, theming, and the merge confirm copy. NOT done in this session (headless agent, no GUI).
- [ ] Real-Pi check of per-project `defaultHarnessId` (only the mock harness ran here).
- [ ] `~/srgnt-workspace/projects/` on this machine holds 8 leftover project directories from this session's failed E2E runs, all pointing at deleted `/var/folders/.../srgnt-e2e-projects-*` temp dirs. Harmless (never preselected) and no longer accumulating now that E2E is isolated, but they clutter the switcher; delete by hand.
- [x] Resolved during PR review: `getElectronLaunchEnv` sets `SRGNT_DEFAULT_WORKSPACE_ROOT` under each test's user-data dir, so every spec onboards into its own workspace.
- [ ] Project *deletion* is a recorded non-goal for this step (merge only) - Phase 25 or later.
- [ ] `permissionPolicy` has storage + lookup but no editing UI (Phase 25, as recorded in the brief).
- [x] Resolved during PR review: `ProjectStore.merge` and `recoverMerges` now hold BOTH projects' locks, acquired in sorted order so a concurrent pair cannot deadlock.
- [ ] Carried forward from STEP-24-01 and still open: `ChatSessionController` still buffers `SessionEvent[]` in memory rather than writing through `SessionStore`. This step deliberately did not touch it - the Execution Brief scopes the sink swap elsewhere, and `readEventLog`'s whole-file read (the recorded `ponytail:` perf ceiling) is untouched because nothing added here polls the event log.

## Completion Summary

- State what finished, what remains, and whether the session ended in a clean handoff state.
STEP-24-02 is complete. All six items of the Execution Checklist landed:

1. `SProject.permissionPolicy` + bounded `name`, with contracts tests.
2. `packages/runtime/src/projects/` `ProjectStore` with 32 tests covering auto-create idempotency, concurrent-create serialization via the per-id lock, interrupted-write recovery (zero-byte / truncated / schema-invalid `project.json` plus leftover `.tmp`), stable-id-by-rootDir, `ProjectIdCollisionError` fail-closed, rename-keeps-id, merge semantics, crash-in-merge recovery via the journal, and path-unsafe id rejection.
3. `project:*` IPC contracts, preload surface, and a main-process projects service re-rooted through the workspace hooks (8 tests, including re-root isolation and merge recovery at root change).
4. Session creation resolves the project (by id, else auto-create from cwd), applies `defaultHarnessId`, and feeds `permissionPolicy` into the permission engine's project-policy hook - the stub STEP-23-03 left (6 chat-IPC tests + 8 policy/engine tests).
5. `ProjectSwitcher` in the chat panel's side panel with 14 component tests (list with rootDir hints, switch, inline rename, merge behind an explicit confirm).
6. `e2e/projects.spec.ts` - 3 specs against the real Electron stack, registered in the explicit `test:e2e` list.

Validated in the foreground: contracts 167, runtime 415 (**run 5x** for the fast-check property suite - green every time), desktop 1073, harness 114; `pnpm build` and `pnpm -r run typecheck` green; `e2e/projects.spec.ts` 3/3; full desktop E2E 81 passed / 2 failed, both environmental (`bug-0013-visual.spec.ts` needs a packaged Linux build; `app.spec.ts:129` needs a real PTY spawn, `posix_spawnp failed` in this sandbox) and neither touching code this step changed.

**Scope of that claim:** every result above is an automated run I executed. The Validation Plan's manual `pnpm dev` pass (start a session in dir A, a second in dir B, switch/rename/merge by hand) was **NOT performed** - this was a headless session with no GUI, so nobody has looked at the switcher's layout, spacing, or theming. Real-Pi `defaultHarnessId` resolution was also **not** exercised; only the mock harness ran.

One real regression was found and fixed mid-session rather than shipped: the switcher originally preselected `projects[0]`, which captured session creation for an arbitrary project and broke all 8 Phase-23 chat E2E specs. It now preselects only the workspace-root project, else nothing.

Clean handoff. Nothing is half-applied; no git operations were performed (the orchestrator owns git). `resume_target` points at STEP-24-03.
