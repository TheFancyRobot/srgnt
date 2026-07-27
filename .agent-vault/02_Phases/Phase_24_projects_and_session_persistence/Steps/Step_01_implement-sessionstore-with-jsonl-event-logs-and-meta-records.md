---
note_type: step
template_version: 2
contract_version: 1
title: Implement SessionStore with JSONL event logs and meta records
step_id: STEP-24-01
phase: '[[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]'
status: complete
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-07-27'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-07-27-044923-implement-sessionstore-with-jsonl-event-logs-and-meta-records-claude-opus-5|SESSION-2026-07-27-044923 claude-opus-5 session for Implement SessionStore with JSONL event logs and meta records]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-07-27-044923
active_session_id: 05_Sessions/2026-07-27-044923-implement-sessionstore-with-jsonl-event-logs-and-meta-records-claude-opus-5
context_status: complete
context_summary: 'STEP-24-01 complete: the @srgnt/runtime SessionStore (append-only events.jsonl with dense store-owned seq, atomic meta.json, tolerant reader, repair-before-append tail recovery). Automated validation green across runtime, contracts, harness, typecheck and root build; no manual or GUI pass was performed, since the store is a headless disk layer not yet wired into the app.'
---

# Step 01 - Implement SessionStore with JSONL event logs and meta records

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Implement SessionStore with JSONL event logs and meta records.
- Parent phase: [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]].
- Exact outcome: `@srgnt/runtime` gains a SessionStore: append-only `events.jsonl` per session (envelope `{seq, ts, protocolVersion, kind, payload}` with raw ACP updates verbatim), `meta.json` CRUD, crash-safe appends, ordered reads with seq indexing, and tolerant decoding of unknown event kinds.
- Starting files: `packages/runtime/src/` (new `sessions/` module beside `workspace/`); `packages/contracts/src/` SessionEvent schema from Phase 21 Step 04.
- Validate: `pnpm --filter @srgnt/runtime test` — fast-check property tests for append/read round-trips, corrupt-tail-line tolerance, and envelope version handling.

## Why This Step Exists

- `events.jsonl` is the session source of truth (ARCH-0009 invariant); every later step — projects (02), session lists (03), resume (04), transcripts (05) — reads or writes through this store. Built first, pure and UI-free, so the rest of the phase is wiring, not storage design.
- The envelope schema and tolerant reader already exist and are fixture-pinned against real Pi traffic (contracts `SSessionEvent`/`readSessionEvent`; STEP-22-04 decode suite) — this step adds the disk layer only.

## Prerequisites

- PHASE-23 merged (or at minimum `main` green) — the store depends only on contracts, not the UI.
- Add `fast-check` to `packages/runtime/package.json` devDependencies (it is in contracts/harness/desktop but NOT runtime).
- `@srgnt/runtime` is CJS pure Node; desktop main (also CJS) imports it directly — no lazy-ESM indirection (that is only for `@srgnt/harness`).

## Relevant Code Paths

- `packages/runtime/src/sessions/` (new): `paths.ts`, `event-log.ts`, `meta.ts`, `store.ts` — layout `projects/<projectId>/sessions/<sessionId>/{events.jsonl, meta.json}` via `workspaceDirectories.projects`.
- `packages/contracts/src/session.ts` — envelope + `readSessionEvent` (do NOT change the schema in this step).
- `packages/harness/src/testing/fixtures/recorder.ts` (`FrameRecorder` — prior art for the exact line shape) and `fixtures/pi/*.jsonl` (real-Pi corpus; copy lines into runtime test fixtures, don't cross-import ESM).

## Required Reading

- [[02_Phases/Phase_24_projects_and_session_persistence/Phase|Phase 24 projects and session persistence]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (event envelope + source-of-truth invariants; corrupt-tail failure mode)

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

- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: claude-opus-5
- Last touched: 2026-07-27
- Result: `packages/runtime/src/sessions/` ships `events.jsonl` append/read with dense store-owned `seq`, atomic `meta.json`, tolerant reading, and repair-before-append tail recovery. 67 new tests; `pnpm --filter @srgnt/runtime test` 370 passed; typecheck, package build, and root `pnpm build` all clean. No manual or GUI pass (headless disk layer, not reachable from the app yet).
- Next action: [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_02_implement-project-auto-create-switcher-and-per-project-defaults|STEP-24-02 Implement project auto-create switcher and per-project defaults]] — the store validates `projectId` as a path-safe identifier but has no project entity behind it.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Durable findings live in [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Implementation_Notes|Implementation Notes]].
- The three that change how a reader should think about this module: a corrupt tail has **two** repairs, not one (truncate the undecodable bytes, but re-add the newline when a *valid* final record merely lost it — truncating that case silently loses a complete event); interior corruption is a typed throw and `open()` refuses to repair it, leaving the file byte-for-byte intact; and `seq` is assigned synchronously at `append()` call time, which is what makes `Promise.all` of N concurrent appends come out dense and in call order.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-07-27 - [[05_Sessions/2026-07-27-044923-implement-sessionstore-with-jsonl-event-logs-and-meta-records-claude-opus-5|SESSION-2026-07-27-044923 claude-opus-5 session for Implement SessionStore with JSONL event logs and meta records]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- **Complete.** `packages/runtime/src/sessions/` implements the SessionStore: append-only `events.jsonl` with store-owned dense monotonic `seq`, atomic `meta.json` CRUD, a tolerant reader, and repair-before-append corrupt-tail recovery. The contracts envelope schema was not changed. Exported from the `@srgnt/runtime` package root.
- Validated by commands actually run and observed: `pnpm --filter @srgnt/runtime test` (370 passed, 67 new), `typecheck`, `build`, `pnpm --filter @srgnt/contracts test` (159 passed), `pnpm --filter @srgnt/harness test` (114 passed / 2 skipped), and root `pnpm build`. A deliberate negative control (repair disabled, then reverted) failed exactly the two repair tests, so that coverage is not vacuous.
- **No manual or GUI verification was performed.** This step is a headless disk layer with no UI surface and no wiring into the running app, so there is nothing to click; that is a scope fact, not a deferred check.
- Follow-up, deliberately out of scope here: the Phase 23 carry-forward (swapping `ChatSessionController`'s in-memory `SessionEvent[]` sink for this store) belongs to a later step; `projectId` is validated as a path-safe identifier (same whitelist as session ids) but has no project *entity* behind it — creation, defaults, ownership and lifecycle are STEP-24-02. Full detail in [[02_Phases/Phase_24_projects_and_session_persistence/Steps/Step_01_implement-sessionstore-with-jsonl-event-logs-and-meta-records/Outcome|Outcome]].
