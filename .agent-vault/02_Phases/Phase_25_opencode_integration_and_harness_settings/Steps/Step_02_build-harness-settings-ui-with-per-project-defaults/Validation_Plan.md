# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `harness:*` IPC schemas decode/reject.
- `pnpm --filter @srgnt/harness test` — registry merge suites still green (this step consumes, not changes, merge semantics — if you had to touch `registry.ts`, stop and re-read the brief).
- `pnpm --filter @srgnt/desktop test` — harnesses service (temp workspace + injected probes) and harness-section component tests.
- `pnpm --filter @srgnt/desktop test:e2e` — override-takes-effect spec (remember: e2e specs must be added to the explicit `test:e2e*` file lists in `package.json` — the STEP-23-05 gotcha).
- Manual: `pnpm --filter @srgnt/desktop dev` → Settings → Harnesses.

## Acceptance Checks

- Harness list renders every registry entry (pi, opencode, plus any `harnesses.json` customs) with source, detection chip, and docsUrl link; all three `DetectionResult` states render distinctly with actionable copy (not-installed → install hint; probe-failed → reason + "check the binary path"; ok → version shown).
- Saving a binary-path override writes a valid `harnesses.json` (decodes via `SHarnessesFile`), the card gains the "overridden" badge, and the **next spawned session** launches the overridden command (integration test: point `launch.command` at a fake script, assert the spawn used it; existing running sessions untouched). The card also exposes `detectCommand`: editing it changes what `detectHarness` probes (test with the Pi definition — after overriding `launch.command` to an explicit path and updating `detectCommand`, the chip reflects the overridden probe, not bare `pi`).
- Reset removes the workspace entry, the effective definition returns to the built-in (Pi back to `npx pi-acp@0.0.31`), badge clears.
- Env vars added in the editor appear in the spawned process environment on next spawn (fake binary dumps its env to a marker file; assert).
- Per-project default harness selector persists via `project:set-defaults`; creating a session in that project without an explicit harness choice uses it (mock-driven E2E); switching projects switches the selector's shown value.
- Schema-invalid `harnesses.json` (hand-edited) → `harness:list` returns the top-level `workspaceLoad` error (distinct from the per-harness rows), the section renders that readable load error, and built-ins still function; a valid workspace with zero custom entries reports `workspaceLoad: ok` (the two states must be distinguishable in the response, not inferred). Fixing the file recovers without restart (re-read on next `harness:list`).

## Edge Cases

- Workspace root change mid-run → harnesses service re-roots (workspace hooks), re-reads the new root's `harnesses.json`, re-probes; no stale paths (mirror the semantic-search re-root test).
- Override pointing at a nonexistent path → detection chip flips to not-installed/probe-failed for the *overridden* command; spawning surfaces the supervisor's spawn error in chat, not a silent hang.
- Deleting the entry for a **custom** (non-builtin) harness removes it from the registry; deleting is refused for built-ins (only reset).
- `harnesses.json` entry with an id colliding with a built-in but a schema-invalid body → whole-file typed failure path (current `loadWorkspaceHarnesses` behavior) — verify the error surface names the file, and record in Implementation Notes if per-entry tolerance is wanted (Phase 26 candidate).
- Default-harness id that no longer resolves (override deleted, custom removed) → session creation falls back to explicit choice with a readable notice, never a crash on `require(id)` (`UnknownHarness` must be caught at the service boundary).
- Concurrent saves (two settings windows / rapid clicks) → serialized through the service's per-workspace write queue with re-read-before-mutate: two saves touching *different* entries both land (neither is silently discarded by the last rename), and the file is never torn. The test must assert preservation of both intended updates, not only file integrity.

## Regression Expectations

- Existing `settings:get`/`settings:save` round-trip untouched (`SDesktopSettings` unchanged unless the deferred per-harness-policy decision was overridden — in which case contracts tests cover the new field).
- Phase-23 chat E2E and Phase-24 project/session suites green — session creation path now resolves definitions through the harnesses service, so run the full desktop e2e list, not just the new spec.
- `pnpm build` at repo root green.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
