---
status: resolved
trigger: "Investigate issue: terminal-sessions-not-working\n\n**Summary:** terminal session tabs open, but no terminal interface appears and there are no visible console errors."
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T19:30:00Z
---

## Current Focus

hypothesis: resolved
test: resolved
expecting: resolved
next_action: session can be archived; no further action pending

## Symptoms

expected: Opening a terminal tab should show an interactive terminal shell UI.
actual: The tab opens, but the terminal interface does not render; it appears blank.
errors: No visible errors in the renderer/devtools console and no other visible errors reported.
reproduction: From a fresh app state, open a terminal tab. The blank state happens immediately on open.
started: This started recently; terminal sessions worked before.

## Eliminated

- hypothesis: missing ghostty-vt.wasm file paths are the only reason the terminal is blank
  evidence: after switching to a Vite-managed wasm asset URL, missing-file requests disappeared but the host still stayed empty; direct renderer probing showed WebAssembly.compile was then blocked by CSP.
  timestamp: 2026-03-29T19:25:00Z

## Evidence

- timestamp: 2026-03-29T19:09:42Z
  checked: .agent-vault/00_Home/Active_Context.md
  found: Current repo focus includes Phase 07 terminal integration hardening and terminal implementation session history.
  implication: Recent terminal-related changes are a high-probability regression source.

- timestamp: 2026-03-29T19:09:42Z
  checked: repository file search for terminal/session paths
  found: Relevant implementation files include packages/desktop/src/renderer/effects/terminal-ipc.ts, packages/desktop/src/main/pty/session-manager.ts, and packages/desktop/src/main/terminal/terminal-ipc.test.ts.
  implication: Terminal behavior likely spans renderer IPC attachment and main PTY/session lifecycle code.

- timestamp: 2026-03-29T19:11:30Z
  checked: packages/desktop/src/renderer/components/TerminalPanel.tsx
  found: Terminal UI is created only after ensureWasmInit() resolves; if that throws, setup returns immediately without rendering fallback or logging.
  implication: A ghostty-web initialization failure would produce an exactly blank terminal host with no visible console or UI error.

- timestamp: 2026-03-29T19:11:30Z
  checked: packages/desktop/src/renderer/components/TerminalPanel.tsx spawn path
  found: spawn/launch failures write an in-terminal error message only after Terminal.open(container) succeeds.
  implication: blank UI is more consistent with failure before terminal construction than with PTY spawn failure.

- timestamp: 2026-03-29T19:11:30Z
  checked: packages/desktop/src/renderer/components/TerminalPanel.test.tsx
  found: tests mock ghostty-web init as always successful and do not cover wasm init failure behavior.
  implication: a silent init regression could ship without test coverage catching it.

- timestamp: 2026-03-29T19:15:00Z
  checked: comparison with previous committed TerminalPanel implementation (ff21830)
  found: the old implementation surfaced wasm init errors via initError UI and gave the host a min-h-[200px]; the new tabbed implementation removed both safeguards.
  implication: the recent regression window is the TerminalPanel rewrite, and blank behavior can now happen silently where it previously showed an error or preserved visible space.

- timestamp: 2026-03-29T19:15:00Z
  checked: packages/desktop/src/renderer/index.html and ghostty-web dist loader
  found: ghostty-web init attempts wasm loading via data URL/file path/fetch fallbacks, and renderer CSP explicitly permits connect-src data:.
  implication: a CSP denial is less likely than a swallowed init/load failure or UI/layout regression in the new panel.

- timestamp: 2026-03-29T19:19:30Z
  checked: automated Electron inspection after opening Terminal view
  found: [data-testid="terminal-host"] has width/height but zero children and empty innerHTML after waiting for setup.
  implication: layout space exists; the terminal surface is failing before any DOM/canvas mount rather than being hidden by sizing.

- timestamp: 2026-03-29T19:19:30Z
  checked: failed renderer requests during automated Electron inspection
  found: the renderer requests file:///home/gimbo/dev/srgnt/packages/desktop/dist/renderer/ghostty-vt.wasm and file:///ghostty-vt.wasm, both failing with net::ERR_FILE_NOT_FOUND.
  implication: ghostty-web wasm bootstrap is using paths that do not exist in the built renderer output, directly explaining the blank terminal.

- timestamp: 2026-03-29T19:25:00Z
  checked: rebuilt app after explicit wasm asset loading
  found: failed resource requests disappeared, but terminal-host still had zero children and no console output.
  implication: the missing-file bug was real but not sufficient; another earlier silent failure still prevents terminal mount.

- timestamp: 2026-03-29T19:25:00Z
  checked: direct renderer fetch/compile of the emitted ghostty wasm asset
  found: fetch succeeds with status 200 and correct byte length, but WebAssembly.compile throws "Refused to compile or instantiate WebAssembly module because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: \"script-src 'self'\"".
  implication: current CSP forbids the wasm compilation ghostty-web requires, and the swallowed init catch turns that into a blank terminal.

## Resolution

root_cause: Terminal startup fails silently in two stages introduced by the hardened renderer path: first the default ghostty-web wasm file paths are missing from the built renderer, and after fixing that, the renderer CSP still blocks WebAssembly.compile because script-src only allows 'self'. TerminalPanel catches init failure and returns without rendering any fallback, leaving a blank host.
fix: Load Ghostty explicitly with a Vite-managed wasm asset URL and relax renderer CSP just enough to allow WebAssembly compilation via 'wasm-unsafe-eval', then verify via Electron E2E that the host mounts children.
verification: 
verification: Rebuilt @srgnt/desktop successfully, passed TerminalPanel unit tests, passed the strengthened Electron E2E terminal test, and manually confirmed terminal-host now mounts canvas + textarea children with no failed wasm requests.
files_changed: ["packages/desktop/src/renderer/components/TerminalPanel.tsx", "packages/desktop/src/renderer/components/TerminalPanel.test.tsx", "packages/desktop/src/renderer/env.d.ts", "packages/desktop/src/renderer/index.html", "packages/desktop/e2e/app.spec.ts"]
