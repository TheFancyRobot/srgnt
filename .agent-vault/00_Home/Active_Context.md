---
note_type: home_context
template_version: 1
contract_version: 1
title: Active Context
status: active
created: YYYY-MM-DD
updated: '2026-03-28'
tags:
  - agent-vault
  - home
  - context
---

# Active Context

Keep this note short, current, and safe to overwrite as the repo focus changes.

## Current Objective

<!-- AGENT-START:current-focus -->
_Last refreshed: 2026-03-29._
- Session in progress: [[05_Sessions/2026-03-29-011244-polish-onboarding-settings-and-release-qa-opencode|SESSION-2026-03-29-011244 OpenCode session for Polish Onboarding Settings And Release QA]] - owner: OpenCode - phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]] - updated: 2026-03-29
- Current step: [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation|STEP-11-01 Run real machine release validation]] - status: planned - phase: [[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]]
- Active phase: [[02_Phases/Phase_11_real_machine_validation/Phase|PHASE-11 Real Machine Validation]] - status: planned - updated: 2026-03-29
- Also active: 1 more additional sessions, 17 more additional steps.
<!-- AGENT-END:current-focus -->

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

- (Resolved 2026-03-26) Dataview feasibility: DEC-0011 accepted - Dataview extraction not feasible, SimpleQueryEngine over CanonicalStore for v1.
- How much of Phases 09-10 should remain architecture/scaffolding versus becoming executable backlog before the base workflow is truly complete?

## Critical Bugs

<!-- AGENT-START:critical-bugs -->
- No open sev-1 or sev-2 bugs are currently recorded.
<!-- AGENT-END:critical-bugs -->

## Resume Point

[[SRGNT|Resume Point — Phase 02 Onward]] captures the immediate next steps for each phase.

## Next Actions

- **Tomorrow resume here**: Review `STEP-07-02` first because its note is internally inconsistent (`completed` frontmatter vs `scaffolded` snapshot), then pick the correct next terminal-hardening step
- **Most likely next implementation**: `STEP-07-03` once the `STEP-07-02` state is confirmed
- Phase 05 canonical entity integration: add IPC channel `entities:list` to contracts, implement handler in desktop main process to expose CanonicalStore, update renderer to call via preload API
- Phase 05 briefing persistence: add IPC channel `briefing:save`, implement filesystem handler for `.command-center/artifacts/`
- Phase 05 close-out: mark all steps complete at fixture level, update Phase 05 status to completed (with known gaps documented)
- Keep phase and home notes honest whenever implementation status changes.
