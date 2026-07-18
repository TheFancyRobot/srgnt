---
note_type: home_context
template_version: 1
contract_version: 1
title: Active Context
status: active
created: YYYY-MM-DD
updated: '2026-07-17'
tags:
  - agent-vault
  - home
  - context
last_updated: '2026-07-17'
tests: 'desktop 775, harness 112 (+2 gated), contracts 127 — all green on main'
coverage: 'pre-pivot metric; re-baseline when Phase 23 UI work starts'
target: 'suites green per step (ARCH-0009 validation rules)'
blockers: none
in_flight: 'Phases 21-22 executed and merged; phases 23-24 refined against DEC-0018; refine of 25-29 in progress; Phase 23 execution not started'
phase: Phase_23_chat_ui_v1_over_ephemeral_acp_sessions (next up — refined 2026-07-17; PHASE-21/22 completed, DEC-0018 accepted)
done: 'PHASE-21 (teardown + foundations), PHASE-22 (@srgnt/harness ACP core + Pi spike, DEC-0018 ratified)'
remaining: 'phases 23-29 (chat UI, persistence, opencode, generic harness, groups, pipelines, release)'
---

# Active Context

Keep this note short, current, and safe to overwrite as the repo focus changes.

## Current Objective

<!-- AGENT-START:current-focus -->
_Last refreshed: 2026-07-17._
- Session in progress: [[05_Sessions/2026-07-10-145042-delete-aggregator-packages-ui-ipc-and-cli-surfaces-claude-fable-5-worker|SESSION-2026-07-10-145042 claude-fable-5-worker session for Delete aggregator packages UI IPC and CLI surfaces]] - owner: claude-fable-5-worker - phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]] - updated: 2026-07-10
- Current step: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_01_build-chatview-streaming-surface-with-message-thought-and-markdown-rendering|STEP-23-01 Build ChatView streaming surface with message thought and markdown rendering]] - status: planned - phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|Phase 23 chat ui v1 over ephemeral acp sessions]]
- Active phase: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Phase|PHASE-23 Chat UI v1 Over Ephemeral ACP Sessions]] - status: planned - updated: 2026-07-10
- Also active: 46 more additional sessions, 65 more additional steps, 1 open critical bug.
<!-- AGENT-END:current-focus -->
- Session in progress: [[05_Sessions/2026-03-29-154243-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-154243 Session for Harden Previews Approvals And Run Logs]] - phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]] - status: in-progress - updated: 2026-03-29
- Current step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]] - status: in-progress - phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- Active phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|PHASE-07 Terminal Integration Hardening]] - status: partial - updated: 2026-03-29
- Resume point: Manual E2E validation of approval flow (7 validation steps outlined in Follow-Up Work)

## Repo Snapshot

- Repository: \`srgnt\`
- Shape: pnpm workspace monorepo
- Core stack: TypeScript, Electron, React, Effect Schema, Vitest
- Primary references: [[01_Architecture/System_Overview|System Overview]] and [[01_Architecture/Code_Map|Code Map]]

## In Scope Right Now

- Keep roadmap, phase notes, and step notes aligned with the implemented repo state.
- Finish the missing base-product work in workspace persistence, runtime indexing, live-ish connector behavior, and the flagship workflow.
- Preserve the local-first and renderer-secret boundaries while later phases move from scaffolding toward real behavior.

## Out Of Scope Right Now

- Live sync backend or remote source-of-truth work.
- Premium Fred workflow expansion before the base workflow is complete without AI.
- Remote telemetry or hosted crash collection beyond the current local-only posture.

## Working Assumptions

- This repo should use exactly one vault at \`.agent-vault/\`.
- The vault should not contain a second nested project folder.
- Notes should remain easy to read in raw Markdown without Obsidian-specific features.

## Blockers

<!-- AGENT-START:blockers -->
- No phase, step, or session notes are currently marked blocked.
<!-- AGENT-END:blockers -->

## Open Questions

- (Resolved 2026-03-29) Resume from SESSION-2026-03-29-132728: STEP-07-03 implementation complete, manual validation pending
- (Resolved 2026-03-29) Desktop app builds successfully for STEP-07-03 manual validation

- (Resolved 2026-03-26) Dataview feasibility: DEC-0011 accepted - Dataview extraction not feasible, SimpleQueryEngine over CanonicalStore for v1.
- How much of Phases 09-10 should remain architecture/scaffolding versus becoming executable backlog before the base workflow is truly complete?

## Critical Bugs

<!-- AGENT-START:critical-bugs -->
- [[03_Bugs/BUG-0010_slash-commands-trigger-logic-and-indentation-preservation-issues|BUG-0010 Slash commands trigger logic and indentation preservation issues]] - status: fixed - severity: sev-1 - reported: 2026-04-06
<!-- AGENT-END:critical-bugs -->

## Resume Point

[[SRGNT|Resume Point — Phase 02 Onward]] captures the immediate next steps for each phase.

## Next Actions

- **Resume point**: [[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622]] - STEP-07-03 manual E2E validation ongoing
- Manual E2E validation steps (described in session follow-up work)
- Keep phase and home notes honest whenever implementation status changes.
