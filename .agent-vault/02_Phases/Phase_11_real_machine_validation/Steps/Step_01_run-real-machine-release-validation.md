---
note_type: step
template_version: 2
contract_version: 1
title: Run real machine release validation
step_id: STEP-11-01
phase: '[[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]]'
status: planned
owner: ''
created: '2026-03-29'
updated: '2026-04-21'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead|SESSION-2026-04-21-014952 team-lead session for Run real machine release validation]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-21-014952
active_session_id: 05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead
context_status: active
context_summary: Advance [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation|STEP-11-01 Run real machine release validation]].
---

# Step 01 - Run real machine release validation

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Execute the platform validation runbooks on real machines and fold the results back into the release recommendation.
- Parent phase: [[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]].

## Why This Step Exists

- Installer, trust, launcher, icon, update, and accessibility behavior can still fail even when repo-side tests and packaging commands are green.
- This step reduces the last pre-release unknowns by collecting evidence from real Windows, macOS, and Linux environments.

## Prerequisites

- Read [[02_Phases/Phase_11_real_machine_validation/Phase|PHASE-11 Real Machine Validation]], [[06_Shared_Knowledge/release-process|Release Process]], [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]], and [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]].
- Read [[01_Architecture/System_Overview|System Overview]] to stay aligned with the desktop shell boundaries and local-first expectations while validating the packaged app.
- Start from a release candidate that already passed `pnpm run release:check:repo`.
- Have the target artifacts available for the host under test and capture the exact filenames/version/build SHA before starting.
- Use clean machines or revertable VM snapshots whenever practical.

## Relevant Code Paths

- `.agent-vault/06_Shared_Knowledge/platform_validation_checklists.md`
- `.agent-vault/06_Shared_Knowledge/release-qa-checklist.md`
- `.agent-vault/06_Shared_Knowledge/release-process.md`
- `packages/desktop/package.json`
- `packages/desktop/release/`

## Required Reading

- [[02_Phases/Phase_11_real_machine_validation/Phase|PHASE-11 Real Machine Validation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]]
- [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before starting validation.
2. Choose the exact host(s) and artifact(s) under test and log version, architecture, and environment details first.
3. Follow the platform-specific checklist in [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]] without skipping failed or blocked items.
4. Record PASS/FLAG/FAIL/BLOCKED outcomes with short evidence notes and screenshots where useful.
5. Copy the summarized outcomes into [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]].
6. If release-blocking issues are discovered, create bug notes or decision notes instead of burying them in session logs.
7. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the final release recommendation is easy to audit.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-03-29
- Next action: Start the first real-machine validation run using [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Prefer conservative release calls. A clean repo-side gate is not enough to ignore installer or trust-surface regressions on real machines.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-21 - [[05_Sessions/2026-04-21-014952-run-real-machine-release-validation-team-lead|SESSION-2026-04-21-014952 team-lead session for Run real machine release validation]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the real-machine results are written back into [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]] and the release recommendation is explicit.
- If the step is blocked, name the exact missing host, artifact, credential, or operator action.
