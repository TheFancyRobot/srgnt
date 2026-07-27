# Outcome

Complete. Projects are now a real entity: `projects/<id>/project.json` written by `ProjectStore`, created only by directory (`ensureProjectForDir`), renameable, mergeable with crash-recoverable semantics, and carrying per-project defaults that resolve into session creation. The permission engine's project-policy stub from STEP-23-03 is filled. A `ProjectSwitcher` lives in the chat panel's side panel.

Validation actually executed (all foreground): `@srgnt/contracts` 167 tests, `@srgnt/runtime` 415 tests **run 5 times** (the package includes a fast-check property suite - green on all 5 runs), `@srgnt/desktop` 1073 tests, `@srgnt/harness` 114 passed / 2 skipped, `pnpm build` at repo root, `pnpm -r run typecheck`, and `npx playwright test e2e/projects.spec.ts` 3/3. The full desktop E2E list ran 81 passed / 2 failed; both failures are environmental and touch no code from this step (`bug-0013-visual.spec.ts` needs a packaged Linux build; `app.spec.ts:129` needs a real PTY spawn - `posix_spawnp failed` in the sandboxed shell).

**Not performed:** the Validation Plan's manual `pnpm --filter @srgnt/desktop dev` pass (start a session in dir A, a second in dir B, switch/rename/merge by hand) was NOT run - the executing session was headless with no GUI, so no human-eyes check of the switcher's layout, spacing, or theming has happened. Real-Pi `defaultHarnessId` resolution was also not exercised; only the mock harness ran.

Follow-ups (none blocking): the manual GUI pass; a real-Pi default-harness check; 8 leftover E2E project directories in `~/srgnt-workspace/projects/` pointing at deleted temp dirs (harmless, delete by hand - removal was sandbox-blocked in-session); re-rooting the other E2E specs to per-test workspaces; project deletion and the `permissionPolicy` editing UI, both recorded non-goals for this step. Carried forward and still open: `ChatSessionController` still buffers `SessionEvent[]` in memory instead of writing through `SessionStore`.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
