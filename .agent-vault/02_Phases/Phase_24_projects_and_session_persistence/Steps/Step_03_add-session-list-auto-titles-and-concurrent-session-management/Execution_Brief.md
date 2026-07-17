# Execution Brief

## Why

- Phase 23 shipped ONE ephemeral session; this step makes sessions plural, named, and persistent-by-default — the visible payoff of STEP-24-01/02. The session list with live status is also the surface resume (04) and lifecycle cleanup (05) plug into.
- Concurrency is an ARCH-0009 product pillar ("multiple sessions run concurrently across projects") and forces the main-process session service into its final shape: per-session routing instead of Phase 23's single-active-session assumption.

## Prerequisites

- STEP-24-01 merged; STEP-24-02 at least API-stable (03 can overlap 02 per the phase note, but the list is grouped by project, so the ProjectStore API must exist).
- Read the Phase-23 `ChatSessionController` (`packages/desktop/src/main/chat/`) and its ancestor `dev-console/session-controller.ts` — the per-handle `Map`, update pump, and dispose pattern are what this step generalizes and persists.
- Read `packages/harness/src/supervisor/supervisor.ts` + `types.ts`: `Supervisor` already supports many handles, `SupervisorEvent` (`spawning|ready|crashed|gave-up|reaped|exited`), `markActivity`, `disposeAll`. **Design guidance (recorded assumption): move from Phase 23's one-`Supervisor`-per-session to ONE shared `Supervisor` owned by the chat/session service, handle id = srgnt session id.** This gives 05 a single `disposeAll()` for quit and a single `idleTimeoutMs` config point; per-session isolation is preserved because handles are independent. If the executor keeps per-session supervisors instead, they must build the equivalent registry — record the swap in Implementation Notes.
- Read `packages/contracts/src/session.ts` `SSessionStatus` (`active|idle|interrupted|error|closed`) — the persisted status vocabulary; renderer-only states like `connecting` stay renderer-side (recorded assumption: the live push carries a superset — `connecting`, `awaiting_permission` — that is NEVER written to meta.json; meta persists only `SSessionStatus` values).

## Likely Code Paths

- `packages/desktop/src/main/chat/` — evolve the controller into the session service: `Map<srgntSessionId, {connection, acpSessionId, projectId, harnessId, turnInFlight}>`; every accepted prompt and streamed update is *also* appended to the SessionStore (`client/prompt`, `acp/session_update`, `client/stop`, plus the permission kinds from STEP-23-03's engine — the in-memory audit stream becomes a real sink, the "sink swap" 23-03 planned for). srgnt session id is `crypto.randomUUID()` — distinct from `acpSessionId` (the mock returns a fixed ACP id; collisions must be impossible).
- `packages/contracts/src/ipc/contracts.ts` — `chat:session:list` (per project: id, title, status, harnessId, updatedAt), `chat:session:open` (returns persisted events for instant render), `chat:session:status` push extended to carry `{sessionId, status}`; `chat:session:update` push already carries `sessionId` (Phase-23 shape) — the renderer must stop assuming a single active session and route by id.
- Renderer — `components/chat/SessionList.tsx` (new, in the chat panel's side-panel content under the STEP-24-02 `ProjectSwitcher`): rows with title, harness badge (from `harnessId`/name delivered at session creation), live status dot, sorted by `updatedAt` desc; "New session" affordance. Clicking a row opens it: transcript renders instantly from persisted events via the SAME `transcriptReducer` used for live updates (replay the `acp/session_update` payloads through it — one reducer, two feeds; no second render path).
- Auto-titles — derived in the main service on the FIRST `client/prompt` of a session: first non-empty line, trimmed to 60 chars with ellipsis, written to `meta.title` and pushed to the renderer (recorded assumption: deterministic derivation, NO LLM titling — cost + determinism; a later phase may add manual rename, not now).
- Renderer state — per-session transcript states keyed by srgnt session id (e.g. a `Map` in a `ChatSessionsContext`); switching sessions/projects must not lose in-memory streams of background sessions, and updates for hidden sessions still append (both to memory and disk).

## Key Design Constraints

- UI-open ≠ process-running stays true: listing sessions spawns nothing; opening a session renders from disk and spawns nothing (reconnect-on-prompt is STEP-24-04's flow — until it lands, prompting a reopened *closed* session may simply be disabled; only sessions with live connections accept prompts this step).
- Status transitions must derive from real signals: `active` on prompt start, `idle` on stop reason, `error` on `crashed`/`gave-up` supervisor events, `interrupted` when a truncated tail was detected at open, `closed` on explicit close. Persist transitions to meta.json as they happen (atomic writes are cheap; meta is tiny).
- Concurrency correctness over parallelism cleverness: per-session append chains (from 24-01) already serialize disk writes; the service must merely never route one session's updates to another's log (unit-test the routing map directly).
- Badges/titles/status render from data only — nothing hardcoded per harness (capability-driven UI invariant).

## Execution Checklist

1. Refactor the session service to the shared-Supervisor + routing-map shape with persistence taps; unit tests with two in-process mock connections streaming interleaved updates → each log gets only its own events, statuses tracked independently.
2. Add the `chat:session:list/open` contracts + status-push extension + preload surface.
3. Implement auto-title derivation + meta persistence + push (unit tests: multiline prompt, whitespace, >60 chars, unicode).
4. Build `SessionList` + per-session renderer state routing; component tests (routing by sessionId, background-session accumulation, status dots, badge rendering).
5. E2E: two projects, one mock session each (distinct `SRGNT_MOCK_SCENARIO` files), prompt both, switch between them mid-stream — both transcripts complete, titles derived, statuses tracked; reopen after app restart shows both sessions listed with instant transcript render.

## Related Notes

- Step: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto-titles and concurrent session management]]
- Phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (supervisor invariants; capability-driven UI)
