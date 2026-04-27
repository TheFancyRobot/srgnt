# Execution Brief

## Step Overview

Add the trust and audit features required once terminal launches can affect user artifacts.

## Why This Step Exists

- The framework calls out silent changes and unreadable logs as trust risks.
- Terminal integration becomes unsafe quickly if writes bypass preview and approval UX.

## Prerequisites

- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]].
- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/desktop/renderer/`
- run-log and artifact modules from Phase 03

## Execution Prompt

1. Add preview and approval handling to artifact-affecting terminal launch flows.
2. Harden run logs so they capture enough detail for audit while supporting redaction and sensitivity boundaries.
3. Validate at least one approval-required path and one read-only launch path.
4. Update notes with the final preview behavior, approval states, and log redaction assumptions.

## Related Notes

- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_03_harden-previews-approvals-and-run-logs|STEP-07-03 Harden Previews Approvals And Run Logs]]
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
