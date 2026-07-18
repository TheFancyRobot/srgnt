# Execution Brief

## Why

- Harness configuration is currently file-only: `harnesses.json` exists (seeded by workspace v2 bootstrap) and the registry already merges it over built-ins with last-write-wins shadowing, but nothing in the product lets a user *operate* that mechanism. This step gives it a surface.
- The binary-path override is the remedy for STEP-25-01's detection states: `not-installed`/`probe-failed` frequently mean "installed somewhere PATH doesn't reach" (notably: macOS GUI-launched Electron lacks the login-shell PATH). Detection guidance without an override field would be a dead end.
- Per-project default harness is what makes the two-harness reality usable day-to-day: PHASE-24 gave `SProject.defaultHarnessId` storage and the `project:set-defaults` IPC; this step gives it an editing surface so "this repo uses opencode, that one uses Pi" sticks.

## Prerequisites

- STEP-25-01 merged (`detectHarness`, `detectCommand` field, opencode definition — the list this UI renders).
- STEP-24-02 merged (ProjectStore, `project:set-defaults` IPC, per-project `defaultHarnessId`).
- Read: `packages/harness/src/registry/registry.ts` (merge precedence — a workspace entry sharing an id **replaces the built-in wholesale**; this drives the override design below), `packages/contracts/src/workspace/layout.ts` (`workspaceFiles.harnesses`, seeded `{"version":1,"harnesses":[]}`), `packages/desktop/src/main/services/settings.ts` + `workspace.ts` (`registerSettingsHandlers` pattern; `afterRootChanged` re-root hook), `packages/desktop/src/renderer/components/Settings.tsx` (`SettingsPanel`/`SettingsSection` model — sections render as one scrollable column).

## Likely Code Paths

- `packages/contracts/src/ipc/contracts.ts` — new channels following the settings pattern (`parseSync` at the boundary):
  - `harness:list` → per harness: merged definition, `source`, whether a workspace override shadows a built-in, `DetectionResult`, and the cached last-negotiated summary (from STEP-25-01's cache) for the matrix step to reuse.
  - `harness:save-override` (definition record) and `harness:reset-override` (id) → mutate `harnesses.json`.
- `packages/desktop/src/main/services/harnesses.ts` (NEW service, `services/` module pattern): builds the registry from built-ins + `loadWorkspaceHarnesses(harnesses.json)`, runs `detectHarness` per definition (results cached per app run; re-probe on demand via a refresh param), writes `harnesses.json` atomically (tmp+rename), re-roots via `WorkspaceService` hooks exactly like semantic-search. `@srgnt/harness` import uses the lazy-ESM pattern (CJS main).
- **Override semantics (grounded + Decision needed, default recorded):** the registry's shadowing is wholesale-replace, so "override binary path/env" = write a *full copy* of the built-in definition with edited `launch.command`/`launch.env` into `harnesses.json`; "Reset to built-in" = delete that entry. Default: keep wholesale-shadow (zero new merge code; matches shipped registry semantics). Consequence to surface honestly: a shadowed Pi will NOT pick up future built-in changes (e.g. a `PI_ACP_VERSION` bump) until reset — the UI must show an "overridden" badge on shadowed built-ins. Alternative (delta-patch overrides merged at load) rejected for now; note it for Phase 26 if the lessons-learned demands it.
- Renderer — new Harnesses section in Settings (either a `SettingsSection` with custom rows or a dedicated `components/settings/HarnessSettings.tsx` rendered alongside `SettingsPanel`; follow whatever composition Phase-23/24 left in the settings route). Per-harness card: name, source (builtin/custom), detection status chip rendering all three `DetectionResult` states (`ok` + version / `probe-failed` + reason / `not-installed` + install hint from description + `docsUrl` link), binary path (`launch.command`) input, env var key/value editor, overridden badge + Reset. Semantic tokens only.
- Per-project default harness: a "Default harness for <active project>" selector in the same section, listing registry ids and writing through the existing `project:set-defaults` IPC. (**Recorded assumption:** it lives in Settings next to the harness list; the ProjectSwitcher side panel may mirror it later — don't build both now.)
- Env editor constraint: values persist as plaintext in `harnesses.json` under the workspace — UI copy must warn against pasting secrets (point users at their harness's own auth flow instead; STEP-25-03 surfaces those). The renderer only ever sees what the user typed — never `process.env`.

## Key Design Constraints

- Settings take effect **on next spawn**: the supervisor's handles are lazy per session — saving an override rebuilds the registry so new sessions launch with the new spec; already-running processes are deliberately untouched (no kill/respawn in this step; document that in the UI copy "applies to new sessions").
- **Per-harness permission policy defaults (phase scope line) — Decision needed, default recorded: DEFER.** No contract field exists for it; per-project `permissionPolicy` (STEP-24-02) remains the only relaxation surface this phase. If the human wants it now, the minimal shape is an optional `harnessDefaults` record on `SDesktopSettings` — but default is to leave it to Phase 26 with the lessons-learned as input.
- `harnesses.json` is user-editable by hand: the service must survive concurrent/external edits (reload on read; schema-invalid file → readable error + built-ins fallback, which `loadWorkspaceHarnesses` already returns as a typed failure — surface it in the section header, do not silently swallow).
- Custom (non-builtin) entries in `harnesses.json` must render and be editable too — but *creating* new custom harnesses is Phase 26 (editor); this UI edits/deletes what exists, no "Add harness" button.
- Default-ask permission stance untouched; nothing in this UI relaxes permissions.

## Execution Checklist

1. IPC contracts + preload surface (+ contracts tests).
2. `services/harnesses.ts`: registry build, per-definition detection, atomic save/reset, re-root hook; unit tests with injected probes and a temp workspace.
3. Renderer harness section: cards, detection chips, override editor, reset, overridden badge; component tests.
4. Per-project default harness selector wired to `project:set-defaults`.
5. Integration test: override `launch.command` to fake binary A, spawn a session (mock-driven), assert the spawned command is A; reset; assert built-in command again.
6. Manual pass: break PATH for opencode → chip shows not-installed + install guidance; set explicit binary path → chip flips to ok after re-probe.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (harnesses.json path; supervisor lazy-spawn lifecycle)
- Prior art: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02]] (per-project defaults storage + IPC this step builds on)
