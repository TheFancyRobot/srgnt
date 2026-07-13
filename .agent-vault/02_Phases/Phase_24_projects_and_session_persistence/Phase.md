---
note_type: phase
template_version: 2
contract_version: 1
title: Projects and Session Persistence
phase_id: PHASE-24
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - '[[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 24 Projects and Session Persistence

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Projects and Session Persistence milestone.
- Persist everything locally: SessionStore in `@srgnt/runtime` writing append-only JSONL event logs (raw ACP `session/update` payloads in a versioned envelope) plus `meta.json`, under the workspace v2 layout.
- Projects become real: auto-created from `cwd` ("project = directory" heuristic), renameable, with a switcher and per-project defaults; sessions from any harness coexist in one project.
- Honest resume: `session/load` / `session/resume` where the harness supports it; read-only reopen with explicit "Continue in new session" fork-with-handoff where it doesn't. Auto-titles, concurrent sessions, idle reaping, quit cleanup, and `transcript.md` checkpointing round out the lifecycle.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- SessionStore in `@srgnt/runtime`: append-only `events.jsonl` (versioned envelope `{seq, ts, protocolVersion, kind, payload}` storing raw ACP updates verbatim + srgnt client events), `meta.json` per session, crash-safe appends, seq-indexed reads.
- Project entity + store: auto-create on first session in a directory, rename/merge, per-project defaults (harness, permission policy), `project.json` layout.
- Navigation UI: project switcher, session list with status/harness badges, auto-titles from first prompt.
- Resume flows: capability-gated `session/load` (replay) / `session/resume` (no replay); read-only reopen + "Continue in new session" fork with explicit handoff summary and `parentSessionId` linkage for harnesses without load support.
- Supervisor lifecycle integration: UI-open ≠ process-running; lazy spawn on prompt, idle reaping, respawn-on-activity, quit cleanup with best-effort `session/cancel`.
- `transcript.md` derived render, checkpointed (on close + periodic), not dual-written per token.
- Concurrent sessions across projects; permission decisions and lifecycle events now persisted to the event log (audit trail).

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- SQLite or any database — files/JSONL only; a rebuildable index cache is the documented escape hatch, not this phase's work.
- Cross-machine sync or backup tooling (explicitly out of v1 scope per DEC-0017).
- Silent context re-priming for harnesses without `session/load` — read-only + explicit fork is the contract.
- Search over transcripts (Phase 29 stretch).
- In-repo `.srgnt/` storage — workspace stays central (decision log D17).

## Dependencies

- Depends on [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (workspace v2 layout, event envelope, resume invariants).
- Requires PHASE-23's chat surface (persistence attaches to a working session UI) and PHASE-21's workspace v2 bootstrap.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] Killing the app mid-turn loses at most the in-flight chunk; reopening shows the persisted transcript instantly from `events.jsonl`.
- [ ] Projects auto-create from cwd; sessions list per project with harness badges, statuses, and auto-titles; switching projects swaps session lists.
- [ ] With a load-capable harness, reopening + prompting transparently respawns and restores via `session/load`/`session/resume`; with a non-capable harness the session is read-only with a working fork-with-handoff flow (`parentSessionId` recorded).
- [ ] Multiple sessions run concurrently across projects; idle sessions are reaped and respawn on activity; quit leaves no agent processes.
- [ ] `transcript.md` checkpoints on close and renders faithfully; permission decisions and lifecycle events appear in the event log.
- [ ] Event envelope carries `protocolVersion`; store round-trip property tests pass (fast-check is already a dependency).

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- None yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records|STEP-24-01 Implement SessionStore with JSONL event logs and meta records]]
- [ ] [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]]
- [ ] [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_03_add-session-list-auto-titles-and-concurrent-session-management|STEP-24-03 Add session list auto-titles and concurrent session management]]
- [ ] [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_04_implement-resume-flows-load-resume-read-only-reopen-and-fork-with-handoff|STEP-24-04 Implement resume flows load resume read-only reopen and fork with handoff]]
- [ ] [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_05_add-transcript-checkpointing-and-lifecycle-cleanup|STEP-24-05 Add transcript checkpointing and lifecycle cleanup]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Storage decisions (decision log D7/D8/D17): files/JSONL over SQLite (escape hatch: SQLite as rebuildable index only); raw ACP updates stored verbatim in a versioned envelope; central workspace (`~/srgnt-workspace`) not in-repo `.srgnt/`.
- Workspace v2 layout: `projects/<id>/project.json`, `projects/<id>/sessions/<id>/{meta.json, events.jsonl, transcript.md}`, plus `groups/templates/`, `harnesses.json`, `settings.json` (bootstrap landed in Phase 21; this phase populates it).
- Step order: SessionStore (01) → projects (02) → session list/concurrency (03) → resume/fork (04) → transcript + lifecycle cleanup (05). 02 and 03 can overlap after 01.
- Resume honesty is a product stance: no silent re-priming; fork-with-handoff is explicit and linked (`parentSessionId`).
- Validation: store round-trip property tests (fast-check), crash-mid-turn E2E (kill agent process, restart app, verify transcript), quit-cleanup process-tree assertion.
