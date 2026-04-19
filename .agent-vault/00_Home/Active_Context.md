---
note_type: home_context
template_version: 1
contract_version: 1
title: Active Context
status: active
created: YYYY-MM-DD
updated: '2026-04-19'
tags:
  - agent-vault
  - home
  - context
last_updated: '2026-04-19'
tests: 1684/1684 passing, 0 failures (vault note had 641 - corrected by tester)
coverage: 95.11% (statements + lines)
target: 95%+ coverage — ACHIEVED
blockers: none
in_flight: none
phase: Phase_19_SHIPPED_all_suites_green
done: Titlebar 100%, pty-service 99.36%, crash.ts 96.41%, ConnectorStatus ~97%, SlashCommands 95.09%, notes.ts IPC ~95%, NotesView 93.15%, TerminalPanel 92.45%, Onboarding 96.08%, TodaySidePanel 100% (isolation)
remaining: notes.ts 87.06%, SlashCommandsExtension.ts 91.69%, NotesView.tsx 93.15%, SidePanel.tsx 92.75%
---

# Active Context

Keep this note short, current, and safe to overwrite as the repo focus changes.

## Current Objective

<!-- AGENT-START:current-focus -->
_Last refreshed: 2026-04-19._
- Session in progress: [[05_Sessions/2026-04-16-043916-replace-desktop-worker-stub-with-real-runtime-semantic-search-effect-layer-team-lead|SESSION-2026-04-16-043916 team-lead session for Replace desktop worker stub with real runtime semantic-search Effect layer]] - owner: team-lead - phase: [[02_Phases/Phase_18_real_semantic_search_runtime_integration/Phase|Phase 18 real semantic search runtime integration]] - updated: 2026-04-16
- Current step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_04_implement-a-managed-connector-package-registry-and-safe-loader-boundary-in-desktop-main|STEP-20-04 Implement a managed connector package registry and safe loader boundary in desktop main]] - status: planned - phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
- Active phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]] - status: in_progress - owner: coordinator - updated: 2026-04-19
- Also active: 45 more additional sessions, 34 more additional steps, 1 open critical bug.
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
