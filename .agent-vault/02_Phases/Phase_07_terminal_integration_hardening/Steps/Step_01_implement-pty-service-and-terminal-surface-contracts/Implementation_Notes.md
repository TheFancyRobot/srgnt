# Implementation Notes

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

## Related Notes

- Step: [[02_Phases/Phase_07_terminal_integration_hardening/Steps/Step_01_implement-pty-service-and-terminal-surface-contracts|STEP-07-01 Implement PTY Service And Terminal Surface Contracts]]
- Phase: [[02_Phases/Phase_07_terminal_integration_hardening/Phase|Phase 07 terminal integration hardening]]
