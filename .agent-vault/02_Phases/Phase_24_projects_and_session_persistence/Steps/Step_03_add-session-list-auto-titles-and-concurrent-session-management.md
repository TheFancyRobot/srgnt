---
note_type: step
template_version: 2
contract_version: 1
title: Add session list auto-titles and concurrent session management
step_id: STEP-24-03
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: completed
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-08-09'
depends_on:
  - STEP-24-01
related_sessions:
  - '[[05_Sessions/2026-08-09-203248-add-session-list-auto-titles-and-concurrent-session-management-claude-opus-5|SESSION-2026-08-09-203248 claude-opus-5 session for Add session list auto-titles and concurrent session management]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-08-09-203248
active_session_id: 05_Sessions/2026-08-09-203248-add-session-list-auto-titles-and-concurrent-session-management-claude-opus-5
context_status: completed
context_summary: 'STEP-24-03 complete: sessions persist to disk, are auto-titled from the first prompt, run concurrently across projects, and are listed with live status in the chat side panel. Validated with contracts 5x, runtime 5x, desktop 1099 tests, harness 114, workspace typecheck and 69 E2E specs. NOT validated: the manual pnpm dev / GUI pass, any real-Pi session, packaged-Linux E2E, and the 50-session responsiveness check.'
---

# Step 03 - Add session list auto-titles and concurrent session management

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add session list auto-titles and concurrent session management.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: Navigation lists sessions per project with harness badges and live status (idle/connecting/running/awaiting_permission/error/closed); sessions get auto-titles from the first prompt; multiple sessions run concurrently across projects with per-session IPC routing and supervisor bookkeeping.
- Starting files: renderer `Navigation.tsx` + new session-list components; main-process session service (routing map sessionId → connection); SessionStore + ProjectStore from earlier steps.
- Validate: E2E with two concurrent mock sessions in different projects streaming independently; status badges track mock scenario transitions; titles derive and persist.

## Why This Step Exists

- Makes sessions plural, named, and persistent-by-default — the visible payoff of 01/02, and the surface resume (04) and lifecycle cleanup (05) plug into.
- Forces the main-process session service into its final shape: per-session IPC routing and persistence taps replace Phase 23's single-ephemeral-session assumption; the STEP-23-03 in-memory audit stream becomes a real disk sink here.

## Prerequisites

- STEP-24-01 merged; STEP-24-02 API-stable (list is grouped by project). 02 and 03 can overlap after 01 per the phase note.
- Read the Phase-23 `ChatSessionController` and `packages/harness/src/supervisor/` — the Supervisor already supports many handles, `markActivity`, `disposeAll`; design guidance in the brief: move to ONE shared Supervisor (handle id = srgnt session id).

## Relevant Code Paths

- `packages/desktop/src/main/chat/` — session service: routing map srgnt-sessionId → connection state; persistence taps (`client/prompt`, `acp/session_update`, `client/stop`, permission kinds); auto-title derivation on first prompt.
- `packages/contracts/src/ipc/contracts.ts` — `chat:session:list`/`chat:session:open` + status push carrying `{sessionId, status}`.
- `packages/desktop/src/renderer/components/chat/SessionList.tsx` (new, chat panel side-panel content) + per-session transcript state keyed by session id; persisted events replay through the SAME `transcriptReducer` as live updates.
- `packages/contracts/src/session.ts` `SSessionStatus` — persisted status vocabulary (renderer-only states like `connecting` are never written to meta).

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (supervisor invariants; capability-driven UI)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: claude-opus-5
- Last touched: 2026-08-09
- Next action: None for this step. Continue with [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Session ids are `crypto.randomUUID()` (`packages/desktop/src/main/chat/session-controller.ts`). They name the on-disk directory and outlive the process; the mock returns one fixed ACP session id for every session, so the two must never be the same value.
- Persistence seam: `ChatSessionControllerOptions.getStore()` returns a four-method `ChatSessionPersistence`, read per call so a workspace-root change is picked up rather than captured. A session with no `projectId` (no workspace root, headless test) stays memory-only exactly as in Phase 23 - one audit sink per session, never two.
- `meta.json` writes go through a per-session promise chain (`metaChain`), because `updateMeta` is a read-modify-write and a supervisor crash landing mid-turn could otherwise drop a field. `flushMeta()` is the test/quit drain.
- `chat:session:list` and `chat:session:open` (`packages/desktop/src/main/chat/index.ts`) are answered entirely from the store and never construct the controller; `open` only asks `has()` of an already-constructed one. `ipc.test.ts` asserts `createController` was never called - that is how "UI-open != process-running" is enforced.
- **Swap from the Execution Brief, recorded as required:** per-session `Supervisor` kept instead of the one shared `Supervisor` the brief sketched. The controller's `sessions` map plus `dispose`/`disposeAll` already is the equivalent registry the brief allowed, handles are independent either way, and no harness change was needed. Noted as a `ponytail:` comment on the controller class; revisit if STEP-24-05 wants one central `idleTimeoutMs`.
- **Conflict with STEP-24-02, resolved deliberately:** `ProjectSwitcher` refused to switch projects while a session was live. That made this step's own acceptance check (two sessions in two projects) unreachable, so the lock was removed. Every session now carries its own `projectId` and cwd, so switching only decides where the NEXT session opens; no running agent moves. A `project-sessions-elsewhere` note counts sessions still running in other projects. `ProjectSwitcher.test.tsx` and `e2e/projects.spec.ts` were updated to assert the new behaviour rather than deleted.
- Auto-titles: `deriveSessionTitle` in `@srgnt/contracts` (first non-empty line, trimmed, 60 code points with an ellipsis, surrogate-safe). Deterministic and LLM-free. Both sides call it, so no title push channel was added; the renderer re-reads the list on a `listRevision` bump.
- Renderer: `ChatSessionContext` now holds many sessions keyed by srgnt id, with per-session rAF update batches. The single-session fields are a projection of the active one, which is why every Phase-23 view compiled and passed unchanged.
- Replay: `replayEvents` feeds persisted `acp/session_update` payloads (plus `client/prompt` and `client/stop`) through the SAME `transcriptReducer` as the live feed. `SessionList.test.tsx` asserts reducer(live) deep-equals reducer(replay).
- The STEP-24-01 `ponytail:` perf ceiling on `readEvents` was read first. This step reads a log exactly once, at open - no polling loop, so the quadratic path is not reachable and no streaming reader was needed.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-08-09 - [[05_Sessions/2026-08-09-203248-add-session-list-auto-titles-and-concurrent-session-management-claude-opus-5|SESSION-2026-08-09-203248 claude-opus-5 session for Add session list auto-titles and concurrent session management]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

Complete. Sessions are plural, named and persistent-by-default.

Delivered: `SessionStore` wired into main behind `services/sessions.ts`; every prompt, streamed update, permission decision, stop and lifecycle transition of a project-backed session written to `events.jsonl` and `meta.json`; auto-titles derived from the first prompt and never rewritten; `chat:session:list` / `chat:session:open` as pure disk reads that spawn nothing; a multi-session renderer with per-session transcript routing; and a `SessionList` panel with harness badges and live status dots. The STEP-24-02 project-switch lock was removed - see Implementation Notes.

Validation performed (all foreground, macOS): `pnpm --filter @srgnt/contracts test` 5 consecutive runs (174 each, fast-check repeated on purpose); `pnpm --filter @srgnt/runtime test` 5 consecutive runs (419 each); `pnpm --filter @srgnt/desktop test` (61 files, 1099); `pnpm --filter @srgnt/harness test` (114 passed, 2 skipped, untouched); `pnpm -r run typecheck` clean; Playwright over `chat`, `sessions`, `projects`, `gfm-compliance`, `ui-coverage-matrix` - 69 passed, 0 failed, including every Phase-23 chat spec.

NOT performed, and not claimed: the Validation Plan's manual `pnpm dev` pass (two real dirs, mock + Pi concurrently, app restart), any real-Pi session, the packaged-Linux E2E, and the 50-session responsiveness measurement. Two E2E failures observed on this machine are pre-existing and unrelated: `bug-0013-visual.spec.ts` needs a packaged Linux build, and `app.spec.ts`'s node-pty `posix_spawnp` failure reproduces with the command sandbox disabled.

Follow-up is recorded in the session note: `OpenSession.live` is stored but the composer does not yet act on it (STEP-24-04's reconnect-on-prompt), and `ChatTerminalProvider` still routes only the active session's terminal output.
