---
note_type: home_context
template_version: 1
contract_version: 1
title: Active Context
status: active
created: YYYY-MM-DD
updated: '2026-03-29'
tags:
  - agent-vault
  - home
  - context
---

# Active Context

Keep this note short, current, and safe to overwrite as the repo focus changes.

## Current Objective

<!-- AGENT-START:current-focus -->
_Last refreshed: 2026-03-31._
- Session in progress: [[05_Sessions/2026-03-31-033706-add-ipc-channels-and-main-process-handlers-for-notes-file-operations-opencode|SESSION-2026-03-31-033706 OpenCode session for Add IPC channels and main process handlers for notes file operations]] - owner: OpenCode - phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]] - updated: 2026-03-31
- Current step: [[02_Phases/Phase_14_notes_view/Steps/Step_03_build-real-file-tree-component-for-notessidepanel|STEP-14-03 Build Notes tree and shared renderer selection state]] - status: planned - phase: [[02_Phases/Phase_14_notes_view/Phase|Phase 14 notes view]]
- Active phase: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]] - status: planned - updated: 2026-03-31
- Also active: 9 more additional sessions, 24 more additional steps.
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
- No open sev-1 or sev-2 bugs are currently recorded.
<!-- AGENT-END:critical-bugs -->

## Resume Point

[[SRGNT|Resume Point — Phase 02 Onward]] captures the immediate next steps for each phase.

## Next Actions

- **Resume point**: [[05_Sessions/2026-03-29-134622-harden-previews-approvals-and-run-logs|SESSION-2026-03-29-134622]] - STEP-07-03 manual E2E validation ongoing
- Manual E2E validation steps (described in session follow-up work)
- Keep phase and home notes honest whenever implementation status changes.
