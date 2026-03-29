---
note_type: step
template_version: 2
contract_version: 1
title: Implement PTY Service And Terminal Surface Contracts
step_id: STEP-07-01
phase: '[[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-27'
depends_on:
  - PHASE-02
  - PHASE-05
related_sessions:
  - '[[05_Sessions/2026-03-27-233525-implement-pty-service-and-terminal-surface-contracts-opencode-claude-opus|SESSION-2026-03-27-233525 opencode-claude-opus session for Implement PTY Service And Terminal Surface Contracts]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Implement PTY Service And Terminal Surface Contracts

Build the secure hosting path for terminal sessions inside the desktop product.

## Purpose

- Host PTY-backed sessions through the privileged boundary and expose only explicit terminal capabilities to the renderer.
- Give the product a real embedded terminal surface without collapsing security boundaries.

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

## Required Reading

- [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|Step 02-02 — Electron Shell and Preload Boundary]]
- [[02_Phases/Phase_03_runtime_foundation/Steps/Step_03_implement-artifact-registry-run-history-and-executor-contracts|Step 03-03 — Artifact Registry and Executor Contracts]]
- [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|Step 04-05 — Connector Status and Freshness UI]]
- [[02_Phases/Phase_05_flagship_workflow/Steps/Step_04_compose-end-to-end-command-center-workflow|Step 05-04 — End-to-End Command Center Workflow]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Implement PTY-backed terminal hosting inside the privileged boundary.
2. Expose only narrow open/write/close/status style capabilities through preload and IPC.
3. Render the terminal as an integrated product surface rather than a separate app shell.
4. Validate with a desktop smoke path that opens a session and exercises safe terminal I/O.
5. Update notes with the exact terminal capability surface and any unsupported host behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: opencode
- Last touched: 2026-03-28
- Next action: None — step complete. Proceed to STEP-07-02.
- Summary: PTY service (node-pty), session manager, Effect Schema-validated IPC contracts, preload API, ghostty-web terminal renderer, and terminal cleanup/default-shell fixes are in place. Desktop tests and build are green.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Terminal belongs in the product shell as a bounded utility panel.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/desktop/src/main/pty/` — PTY service running in the main (privileged) process: spawn, write, resize, close lifecycle
- **Recommended library: `node-pty`** — the most mature PTY library for Electron apps. It has native bindings for all three target platforms. Alternatives (`xterm-addon-attach`, raw `child_process`) lack proper PTY semantics (no resize, no signal handling, no proper shell integration).
- IPC channels in `packages/desktop/preload/` — narrow capability surface: `terminal:spawn`, `terminal:write`, `terminal:resize`, `terminal:close`, `terminal:onData`, `terminal:onExit` — no generic shell-execute or eval channel
- Terminal renderer component in `packages/desktop/renderer/` using `ghostty-web` (xterm-compatible) — renders terminal output in an integrated panel (not a separate window)
- Effect Schema contracts validate terminal IPC messages (spawn options, data payloads, exit status)
- Smoke test: open a terminal session from the desktop app, run a command (e.g., `echo hello`), see output, close session on the current development platform, and verify the CI/build matrix still covers macOS, Windows, and Linux for native-module compilation

**Key decisions to apply:**
- DEC-0002 (TypeScript + schemas): All terminal IPC messages (spawn options, data, exit codes) are schema-validated at the boundary
- DEC-0004 (macOS + Windows + Linux): `node-pty` must be compiled for all three platforms. This requires native addon build tooling in the Electron build pipeline. Test on all three: macOS (zsh default), Windows (PowerShell/cmd), Linux (bash default). This is a non-trivial cross-platform concern — budget time for native module compilation issues.
- DEC-0005 (pnpm monorepo): Terminal service may live in the desktop app package or as a runtime package — decide based on whether other packages need terminal primitives

**Starting files (must exist before this step runs):**
- Desktop shell with privileged boundary from PHASE-02 (main/preload/renderer split)
- IPC patterns established in PHASE-02
- PHASE-05 complete (flagship workflow provides context for what terminal launches will look like)

**Constraints:**
- Do NOT expose a generic `child_process.exec` or `eval` channel from main to renderer — the IPC surface must be narrow and explicit (per Human Notes: "Treat generic shell execution requests as a security smell")
- Do NOT allow the renderer to spawn processes directly — all process creation goes through the main process PTY service
- Do NOT build workflow-aware launch features here — this step is the raw PTY plumbing only. Workflow context comes in STEP-07-02.
- Do NOT skip cross-platform testing — `node-pty` native bindings are the #1 source of Electron cross-platform bugs
- Terminal panel is a bounded utility surface, not a full-featured terminal emulator. Defer: tabs, split panes, themes, custom keybindings.

**Validation:**
A junior dev verifies completeness by:
1. Running the desktop app on their platform and opening an embedded terminal session
2. Typing a command and seeing output rendered in the `xterm.js` panel
3. Resizing the app window and confirming the terminal reflows correctly
4. Closing the terminal session and confirming the PTY process is cleaned up (no zombie processes)
5. Checking IPC channel definitions — only the narrow set listed above exists, no generic exec/eval
6. Running `pnpm test` and seeing terminal IPC Zod validation tests pass
7. (If CI supports it) confirming the build succeeds on macOS, Windows, and Linux

**Junior-readiness verdict:** PASS — The step is well-scoped to raw PTY plumbing. The main risk is cross-platform `node-pty` compilation issues (especially Windows), which DEC-0004 constraints flag. The recommendation of `node-pty` + `xterm.js` gives a junior dev a concrete starting point rather than forcing a library evaluation.

## Human Notes

- Treat generic shell execution requests as a security smell unless the capability surface makes them explicit.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-27 - [[05_Sessions/2026-03-27-233525-implement-pty-service-and-terminal-surface-contracts-opencode-claude-opus|SESSION-2026-03-27-233525 opencode-claude-opus session for Implement PTY Service And Terminal Surface Contracts]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means terminal sessions can be opened safely from inside the product.
- Validation target: PTY smoke path succeeds without direct renderer process spawning.
