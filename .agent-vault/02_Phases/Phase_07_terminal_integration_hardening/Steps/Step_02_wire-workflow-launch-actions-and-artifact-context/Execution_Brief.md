# Execution Brief

## Step Overview

Connect product workflows to terminal launches with explicit context handoff.

## Why This Step Exists

- A terminal pane alone is not enough; the product needs workflow-aware launches.
- Context handoff is the difference between a gimmick terminal and a useful integrated tool.

## Prerequisites

- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- `packages/runtime/`
- workflow surfaces from Phase 05

## Execution Prompt

1. Add workflow launch actions that open terminal sessions with explicit artifact/run/workspace context.
2. Keep the launch contract auditable and compatible with the executor/runtime model from Phase 03.
3. Add one manual validation path from a real workflow surface into a terminal session.
4. Validate that launch context is visible in the terminal surface and note any remaining traceability gaps.
5. Update notes with the launch entry points, context payload shape, and any deferred workflow surface.

## Related Notes

- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_02_wire-workflow-launch-actions-and-artifact-context|STEP-07-02 Wire Workflow Launch Actions And Artifact Context]]
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
