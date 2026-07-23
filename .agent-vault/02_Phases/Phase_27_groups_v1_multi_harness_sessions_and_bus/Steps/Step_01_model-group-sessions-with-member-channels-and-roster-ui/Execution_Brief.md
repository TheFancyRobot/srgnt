# Execution Brief

## ENTRY GATE (phase-level — do not start this step until resolved)

- Before any Phase-27 code is written, **re-open [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]]** (its accepted revisit trigger is literally "when Phase 27 begins"). The spike measured that `session/new.mcpServers` is **never forwarded** by `pi-acp@0.0.31` (probe 2), so the tier-1 MCP bus cannot work for Pi members today. Resolve to exactly one of:
  1. **Upstream landed** native `pi --mode acp` → re-run spike probe 2 against it, lift the `mcpServers: false` clamp in `packages/harness/src/registry/builtins.ts`, record the new version pin.
  2. **Fork built** (`packages/shims/pi-acp`) → same re-validation, point `piDefinition.launch` at the shim.
  3. **Neither** → Pi members run **tier-2/3 only** this phase. This is an acceptable outcome: the phase acceptance criterion requires tier 1 "on at least one harness" (mock agent and opencode both qualify), and tiers 2/3 (STEP-27-04) carry Pi.
- The gate is a *decision*, not necessarily code. Record the outcome as a dated update to DEC-0018's change log before starting. All briefs below are written to be correct under outcome 3 (the conservative case).

## Why

- Everything else in the phase hangs off the group model: the broker (02) routes between members created here, the timeline (03) interleaves the channels created here, tiers (04) attach to the member specs created here. Getting `kind: 'group'` sessions, member channels, and the roster/tabs shell right first means later steps are wiring, not modeling.
- This step is mostly *composition* of shipped machinery: `SSession` already carries `kind: 'single' | 'group'` and `parentSessionId` (`packages/contracts/src/session.ts`); the Phase-24 SessionStore owns JSONL channels; the Phase-23 `ChatSessionController` (`packages/desktop/src/main/chat/`, modeled on `DevSessionController`) owns the spawn→session/new→update-pump loop that each member reuses. New modeling is limited to the member spec and the group directory layout.

## Prerequisites

- Phases 23–26 merged (chat surface, SessionStore, opencode as second harness, conformance/quirk data). Entry gate above resolved and recorded.
- Read fully: `packages/contracts/src/session.ts`; the STEP-24-01 Execution Brief (SessionStore module layout: `paths.ts`/`event-log.ts`/`meta.ts`/`store.ts` under `packages/runtime/src/sessions/`); `packages/desktop/src/main/dev-console/session-controller.ts` + the Phase-23 STEP-23-01 brief (`ChatSessionController` shape: opaque handles, shared `Supervisor`, per-session update pump, lazy-ESM `Function('return import("@srgnt/harness")')` loading — desktop main is CJS, `@srgnt/harness` is ESM-only); ARCH-0009 "Important Paths" (group layout) and Invariants.
- `docs/pi-teams.md` + `.pi/teams.yaml` — the coordinator/researcher/executor/reviewer roles being productized; role naming should feel like this.

## Likely Code Paths

- `packages/contracts/src/group.ts` (new) — `SGroupMemberSpec`: `{ role, harnessId, name?, nudgePolicy? }` with `role` constrained to an id-safe slug (`^[a-z0-9][a-z0-9-]{0,31}$` — it becomes a directory name under `members/`); recorded assumption: extend `SSession` with optional `members: Schema.Array(SGroupMemberSpec)` (present iff `kind === 'group'`) rather than a separate group-meta file — one `meta.json` stays the single meta record. Export from `contracts/src/index.ts`; add IPC contracts for group create/list in `contracts/src/ipc/`.
- **The `kind`/`members` invariant must be enforced at decode, not by convention.** `Schema.Array(...)` being optional at the type level means a malformed `meta.json` (a `single` session carrying `members`, or a `group` session with none) would otherwise decode cleanly and reach the controller. Attach a `Schema.filter` refinement to `SSession` — the executable rule is exactly: `kind === 'group'` ⇒ `members` present with **length ≥ 2** and all `role` values unique; `kind === 'single'` ⇒ `members` absent (an empty array is a *rejection*, not a shortcut for absent). One-member and zero-member groups are invalid in v1 — a group is by definition more than one agent, and the roster/tab shell has no meaning below two. The filter message must name the offending field so a hand-edited meta produces a readable error rather than a downstream crash. Everything that reads meta (`SessionStore`, `GroupSessionController`, the session-list IPC) goes through this decode, so no caller re-checks it.
- `packages/runtime/src/sessions/paths.ts` — extend with `groupDir(ref)`, `memberEventsPath(ref, role)` (`.../sessions/<id>/group/members/<role>/events.jsonl`), `groupNotesDir(ref)` (`.../group/notes/`), `busLogPath(ref)` (`.../group/bus.jsonl`, consumed in 03). Store facade gains `createGroupSession(meta)` (creates `group/` skeleton incl. empty `notes/`) and member-channel append/read that reuse the existing `SessionEventLog` per role — member channels use the *same* envelope and tolerant-reader rules as single sessions.
- `packages/desktop/src/main/chat/` — `GroupSessionController` (new file beside `ChatSessionController`, or an extension of it — executor's call, record it): for each member, register `supervisor.register('<sessionId>:<role>', launch)` on the **shared** Supervisor (Phase-24 rule: one Supervisor, quit = one `disposeAll()`), `AcpAgentConnection.connect(...)` with the member harness's `capabilityOverrides` from the registry, `session/new` per member (all `cwd` = project root — v1 non-goal: no per-member cwd), then one update pump per member appending to that member's channel and fanning to the renderer keyed `(groupSessionId, role)`. Store each member's *effective* `connection.capabilities` — STEP-27-02/04 derive bus tiers from it.
- Renderer — group creation UI (member picker: role text field + harness dropdown from the existing registry-list IPC; validate role uniqueness); roster side panel registered via the chat panel's `sidePanelContent` (Phase-24 correction: NOT `Navigation.tsx`) showing per-member harness badge, live status, and quirk badges (reuse the STEP-23-03/25-03 badge components); member tabs over per-member `ChatView` instances (the existing ChatView keyed by member handle — no new chat rendering).
- Write-conflict guardrail (phase scope, lands here): since all v1 members share the project root, the roster shows a standing informational warning ("N agents share one working tree") linking the git-worktree-per-member recipe doc (`docs/group-worktrees.md`, written in this step — recipe only, no automation).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- Members are fixed at creation in v1 — no add/remove on a live group (defer; record if it bites).
- Member roles are unique per group and immutable (they name directories and bus addresses).
- A member crash is per-member state: its tab shows the recoverable-error surface from Phase 23; the group session and the other members keep running. Member statuses reuse `SSessionStatus` values in renderer state but are NOT persisted per member in v1 (group `meta.json` status = aggregate; recorded assumption).
- Group sessions appear in the Phase-24 session list with a `group` badge; `kind` already defaults to `'single'` so old metas decode unchanged.
- No broker, no bus, no cross-member traffic in this step — two independent members streaming side by side is the whole outcome.

## Execution Checklist

1. Confirm the entry gate outcome is recorded in DEC-0018; note which harnesses will be tier-1-capable for later steps.
2. Add `SGroupMemberSpec` + `SSession.members` in contracts with round-trip tests **and the `kind`/`members` refinement above**, covering each violating shape (single-with-members, group-without-members, group-with-empty-array, group-with-one-member, duplicate roles); add group-create IPC contracts.
3. Extend runtime `paths.ts` + `SessionStore` with the `group/` layout and member channels; tests for path shapes and channel isolation (append to role A never appears in role B's log).
4. Build `GroupSessionController` on the shared Supervisor with per-member pumps; unit-test with two injected in-process mock connections (`connectMockAgent` fixture pattern from `dev-console/session-controller.test.ts`).
5. Build creation UI, roster panel (with worktree warning + quirk badges), and member tabs hosting ChatView.
6. Write `docs/group-worktrees.md` (recipe: `git worktree add` per member, one branch each, cleanup).
7. Run the Validation Plan; record deviations in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui|STEP-27-01 Model group sessions with member channels and roster UI]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Gate: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] + [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (group data layout, supervisor invariants)
