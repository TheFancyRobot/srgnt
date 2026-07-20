# Execution Brief

## Why

- Projects are the organizing entity of the whole product surface ("sessions organized into projects", ARCH-0009): the session list (03), resume flows (04), and the permission engine's project-policy hook (stubbed in STEP-23-03 to always fall through) all key off the project entity built here.
- "Project = directory" is the product heuristic: the user never explicitly creates a project — starting a session in a directory materializes one. Getting the identity rule right (stable id per directory) is what makes sessions from *any* harness coexist in one project and survive renames.
- Per-project defaults (harness, permission policy) are how DEC-0018's Pi capabilities become useful: model/thinking selection over ACP exists (spike probe 3), but which harness a project prefers is srgnt-side data that must live somewhere durable — `project.json`.

## Prerequisites

- STEP-24-01 merged (SessionStore + the `projects/<id>/sessions/<id>/` path layer it defines).
- Read: `packages/contracts/src/project.ts` (`SProject` — already has `id`, `name`, `rootDir`, `additionalDirectories`, `defaultHarnessId`), `packages/contracts/src/workspace/layout.ts` (`workspaceDirectories.projects`), `packages/desktop/src/main/services/workspace.ts` (`WorkspaceService` + hooks pattern — project services must re-root when the workspace root changes, exactly like semantic search does via `afterRootChanged`).
- Read STEP-23-03's brief + the shipped `packages/runtime/src/permissions/` engine: this step fills the project-policy stub it left (`resolve` order: session-remembered → **project policy** → default-ask).
- Renderer orientation: `Navigation.tsx` is actually the `AppLayout` shell (Titlebar/ActivityBar/SidePanel) — the switcher's real home is the chat panel's `sidePanelContent` (see `defaultPanels` registration in `renderer/main.tsx` and how Phase 23 registered the chat panel). Do not bolt project UI onto `AppLayout`.

## Likely Code Paths

- `packages/contracts/src/project.ts` — extend `SProject` with an optional `permissionPolicy` field (recorded assumption: `Schema.optional(Schema.Record({key: Schema.String, value: Schema.Literal('allow','reject','ask')}))` keyed by tool-call kind, mirroring the engine's normalized request kinds; keep it minimal — the policy *editing* UI is Phase 25, only the storage + engine hook land now). Tests beside `project.test.ts`.
- `packages/runtime/src/projects/` (new module):
  - `store.ts` — `ProjectStore`: `ensureProjectForDir(rootDir)` (auto-create), `get/list`, `rename(id, name)`, `merge(sourceId, targetId)`, `setDefaults(id, {defaultHarnessId, permissionPolicy})`; persists `projects/<id>/project.json` with the same atomic tmp+rename discipline as `meta.json`.
  - **Identity rule (recorded assumption):** `id = sha256(path.resolve(rootDir)).slice(0, 12)` — deterministic, path-safe, stable across app restarts without a lookup table; `rootDir` is stored `path.resolve`d (NOT `realpath` — a symlinked checkout stays its own project; recorded). Same dir → same project, always. Rename changes `name` only, never `id`. **Truncated-hash collision is possible** (12 hex chars ≈ 48 bits) and MUST NOT silently merge two directories: before treating an existing `projects/<id>/project.json` as "the project for this dir," `ensureProjectForDir` reads it and compares the stored `rootDir` against `path.resolve(rootDir)`. On match → reuse. On mismatch (a genuine hash collision) → **fail closed**: return a typed `ProjectIdCollision` error rather than reusing or overwriting the other directory's project. (Escalation path if collisions ever surface in practice — recorded, non-blocking: widen the slice or store the full digest; the fail-closed check makes the slice length a tunable, not a correctness risk.)
  - **Merge semantics (Decision needed — default recorded, non-blocking):** merge = move every `sessions/<id>` directory from source to target project, union `additionalDirectories` (plus the source's `rootDir` into the target's `additionalDirectories` so fs path-guards keep covering old sessions' files), keep the target's name/defaults, delete the source `project.json` and its now-empty directory. Sessions keep their ids. Collision of session ids across projects is practically impossible (UUID) but must error loudly, not overwrite. Executor takes this default unless the human overrides.
  - **Merge must be crash-recoverable (not atomic by itself):** moving session directories then deleting the source `project.json` is a multi-step mutation; a crash in the middle can split sessions across two projects or orphan the source metadata. Guard it with a durable journal/commit marker: write `projects/<targetId>/merge.journal` (or a `mergeInProgress: {sourceId, movedSessionIds[]}` marker on the target's `project.json`) BEFORE moving anything, update it as each session dir is moved, and only clear it after the source `project.json` is deleted. **On startup, `ProjectStore` scans for incomplete merge journals and resumes/rolls forward** — re-move any not-yet-moved sessions, finish deleting the source, then clear the marker — so a merge is idempotent and never loses or overwrites a session. Recorded assumption; the journal shape is the executor's call.
- `packages/contracts/src/ipc/contracts.ts` — `project:list`, `project:rename`, `project:merge`, `project:set-defaults` channels (follow the `SDevSession*` schema + `parseSync` boundary pattern); the Phase-23 `chat:session:new` request gains an optional `projectId`/cwd resolution: main derives the project from the session cwd via `ensureProjectForDir` before `session/new`.
- `packages/desktop/src/main/` — a `projects` service (`services/` module pattern from STEP-21-03): constructed with `getRoot` from `WorkspaceService`, registered next to the other handlers in `main/index.ts`, torn down/re-rooted via workspace hooks. Runtime is CJS — direct import, no lazy-ESM.
- `packages/desktop/src/main/chat/` — session creation resolves per-project defaults: `defaultHarnessId` picks the harness when the user didn't choose one; `permissionPolicy` is passed into the permission engine's project-policy hook.
- Renderer — `components/chat/ProjectSwitcher.tsx` (new) in the chat panel's side-panel content: current project name, dropdown of projects (name + rootDir hint), rename affordance (inline edit), merge behind an explicit confirm dialog (irreversible). Semantic tokens only.

## Key Design Constraints

- Auto-create must be idempotent and race-safe — but a deterministic id is NOT by itself race protection: two concurrent `ensureProjectForDir` calls can both pass `mkdir`/`wx` and then still race on the tmp-file + rename that writes `project.json`, so a `wx`/EEXIST check alone can return a project whose metadata is half-written. Serialize creation with a **per-project (per-id) async lock / create-once protocol**: the first caller writes `project.json` atomically (tmp+rename) and releases; concurrent callers wait, then **validate the existing `project.json` (schema-decodes AND stored `rootDir` matches) before returning it** — incomplete or invalid metadata is repaired (rewritten) or rejected with a typed error, never accepted as an initialized project. Tests must cover an interrupted write (leftover `project.json.tmp`, or a zero-byte/partial `project.json`) recovering cleanly, not only the duplicate-id no-op case.
- The default project name is the directory basename; duplicate basenames across different paths are allowed (id differs) — the switcher shows the rootDir hint to disambiguate.
- No in-repo `.srgnt/` storage (phase non-goal, decision log D17): everything lives under the central workspace.
- The permission-policy hook must default to fall-through (`ask`) when no policy entry matches — default-ask stays absolute (ARCH-0009 invariant); this step adds *storage and lookup*, not relaxation UI.
- Project deletion is NOT in scope (only merge); recorded as a non-goal to avoid scope creep.

## Execution Checklist

1. Extend `SProject` (+ contracts tests) with `permissionPolicy`.
2. Build `packages/runtime/src/projects/` store with unit tests: auto-create idempotency (incl. concurrent create serialized by the per-id lock and interrupted-write recovery from a partial `project.json`/leftover `.tmp`), stable-id-by-rootDir, hash-collision fail-closed (`ProjectIdCollision` when a stored `rootDir` mismatches), rename keeps id, merge semantics (session dirs moved, additionalDirectories unioned, source removed) plus crash-in-merge recovery via the journal (resume after a simulated mid-merge crash loses no session), path-unsafe input rejection.
3. Add IPC contracts + preload surface + main-process service wiring (workspace re-root hooks included).
4. Wire session creation: cwd → `ensureProjectForDir` → session created under that project with defaults resolved; permission engine's project-policy stub now reads the project's `permissionPolicy`.
5. Build `ProjectSwitcher` with component tests (list/switch/rename; merge confirm flow).
6. E2E: two projects (two temp dirs), one session each — switcher swaps the visible session context correctly.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (workspace v2 layout; fs path-guard rule fed by `rootDir` + `additionalDirectories`)
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (per-project defaults may rely on `session/load` config + `session/set_mode` for Pi)
