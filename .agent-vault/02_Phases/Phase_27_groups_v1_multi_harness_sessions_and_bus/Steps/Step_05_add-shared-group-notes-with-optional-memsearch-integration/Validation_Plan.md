# Validation Plan

## Commands

- `pnpm --filter @srgnt/desktop test` — memsearch detection unit tests (PATH hit, fallback-dir hit, missing → `not-installed`, broken binary → `probe-failed`; PATH manipulated via injected env/lookup seam, not the real machine); NotesView scoped-root path-guard tests (traversal attempts like `../../` rejected); provider parse tests against a pinned CLI-output fixture.
- `pnpm --filter @srgnt/harness test` — `memory_search` relay: provider-registered path returns chunks; unregistered/unavailable path returns `{ available: false, hint }` (02 regression, now with hint).
- `pnpm --filter @srgnt/desktop test:e2e` — group Notes tab spec (scoped browsing, user edit round-trip).

## Acceptance Checks

- **Dual-configuration run (the step's headline):** the full phase E2E suite (group creation, bus exchange, nudges, timeline) passes twice — once with memsearch detected, once with detection forced off (env/settings switch). Identical results everywhere except `memory_search` availability. This is the ARCH-0009 "never load-bearing" proof.
- With memsearch installed: seed `group/notes/` with 2–3 markdown files containing distinctive phrases, let the watcher index, then call `memory_search` through the bus (mock member `call_mcp_tool memory_search`) — returned chunks contain the seeded phrase with correct relative paths. The mailbox mirror is searchable too (it lives under `notes/`).
- Without memsearch: `memory_search` returns the graceful unavailability payload; the roster shows search as unavailable; nothing else changes.
- NotesView in a group session browses only `group/notes/`; user-created note is visible to a member via `read_file`.

## Edge Cases

- Watcher process killed externally → status flips to degraded; group functions normally; no respawn loop beyond policy.
- Group dispose and app quit both kill the watcher — process-tree assertion includes the memsearch child (no orphans, same bar as agents).
- `memory_search` called mid-index (watcher just started, index cold) → empty/partial results are acceptable, errors are not.
- Binary present but `--version` probe fails (wrong arch, broken install) → `probe-failed`, treated exactly like not-installed at runtime, distinct in the UI hint.
- Packaged-app PATH gotcha: unit test asserts the fallback-dir list is consulted when PATH lookup fails (this is the case that will bite in a real .app).

## Regression Expectations

- Project-level NotesView (Phase 14 / DEC-0014 behavior) unchanged — scoping is additive.
- Existing semantic-search feature (`runtime/semantic-search`, DEC-0015) untouched and untangled — memsearch is a separate, group-scoped mechanism; no shared state.
- STEP-27-02's `memory_search` stub contract preserved for tier-1 members whose group has no provider.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_05_add-shared-group-notes-with-optional-memsearch-integration|STEP-27-05 Add shared group notes with optional memsearch integration]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
