# Execution Brief

## Step Overview

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

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

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before starting validation.
2. Choose the exact host(s) and artifact(s) under test and log version, architecture, and environment details first.
3. Follow the platform-specific checklist in [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]] without skipping failed or blocked items.
4. Record PASS/FLAG/FAIL/BLOCKED outcomes with short evidence notes and screenshots where useful.
5. Copy the summarized outcomes into [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]].
6. If release-blocking issues are discovered, create bug notes or decision notes instead of burying them in session logs.
7. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the final release recommendation is easy to audit.

## Related Notes

- Step: [[02_Phases/Phase_11_real_machine_validation/Steps/Step_01_run-real-machine-release-validation|STEP-11-01 Run real machine release validation]]
- Phase: [[02_Phases/Phase_11_real_machine_validation/Phase|Phase 11 real machine validation]]
