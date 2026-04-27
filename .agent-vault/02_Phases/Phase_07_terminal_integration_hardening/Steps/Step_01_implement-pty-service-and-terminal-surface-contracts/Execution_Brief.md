# Execution Brief

## Step Overview

Build the secure hosting path for terminal sessions inside the desktop product.

## Why This Step Exists

- Terminal integration is core product behavior, but it is also high-risk because it touches process spawning and local system access.
- Later workflow launches and approvals depend on this path being explicit first.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]].
- Complete [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]].

## Relevant Code Paths

- `packages/desktop/main/`
- `packages/desktop/preload/`
- `packages/desktop/renderer/`
- `packages/runtime/`

## Execution Prompt

1. Implement PTY-backed terminal hosting inside the privileged boundary.
2. Expose only narrow open/write/close/status style capabilities through preload and IPC.
3. Render the terminal as an integrated product surface rather than a separate app shell.
4. Validate with a desktop smoke path that opens a session and exercises safe terminal I/O.
5. Update notes with the exact terminal capability surface and any unsupported host behavior.

## Related Notes

- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]]
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
