# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `SProject.permissionPolicy` + new `project:*` IPC schemas decode/reject correctly.
- `pnpm --filter @srgnt/runtime test` — `projects/` store suite (auto-create, identity, rename, merge, defaults).
- `pnpm --filter @srgnt/desktop test` — main-process project service + `ProjectSwitcher` component tests.
- `pnpm --filter @srgnt/desktop test:e2e` — the two-project switcher spec (added to the explicit spec list in `package.json`, same gotcha as STEP-23-05).
- Manual: `pnpm --filter @srgnt/desktop dev` → start a mock session with cwd A → project appears; second session cwd B → second project; switch, rename, merge.

## Acceptance Checks

- Starting a session in a directory with no project auto-creates `projects/<id>/project.json` with `name` = dir basename, `rootDir` = resolved path; a second session in the same directory reuses the same project id (stable-id-by-rootDir).
- `ensureProjectForDir` is idempotent under concurrency (two parallel calls → one project, no torn writes) and across restarts (id is derived, not random).
- Rename updates `name` (and `updatedAt`), preserves `id` and all sessions; the switcher reflects it immediately.
- Merge moves all source session directories under the target, unions `additionalDirectories` (including the source `rootDir`), deletes the source project.json; the merged sessions list under the target afterwards. Merge is behind an explicit confirm in the UI.
- Per-project `defaultHarnessId` is applied when creating a session without an explicit harness choice; `permissionPolicy` entries reach the permission engine's project-policy hook (engine unit test: policy `allow` for a kind short-circuits the prompt; absent kind falls through to ask).
- Switcher lists all projects with rootDir hints, marks the active one, and switching swaps the visible session context.
- Sessions from different harnesses (mock + pi definitions) coexist under one project (meta lists both; no per-harness partitioning anywhere in the paths).

## Edge Cases

- Workspace root change mid-run (Settings → change workspace): project service re-roots via the workspace hooks; no stale paths (mirror the semantic-search re-root test pattern).
- Two directories with the same basename → two projects, distinguishable in the switcher.
- `rootDir` that no longer exists on disk (deleted checkout) → project still lists; creating a *new* session in it fails with a readable error, not a crash.
- Merge target == merge source → rejected with a readable error.
- Renaming to an empty/whitespace name → rejected; name length is bounded (recorded: 120 chars) to keep `project.json` and UI sane.
- Aggregator-era directories in the workspace are never touched (bootstrap additivity invariant — assert the test workspace's extra dirs survive).

## Regression Expectations

- STEP-24-01 store suite untouched and green; Phase-23 chat E2E still green (session creation path changed — it now derives a project — so re-run the full `test:e2e` chat specs, not just the new spec).
- `pnpm build` at repo root green.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
