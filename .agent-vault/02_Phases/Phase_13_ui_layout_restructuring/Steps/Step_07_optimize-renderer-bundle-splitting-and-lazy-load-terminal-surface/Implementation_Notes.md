# Implementation Notes

- Audit finding from SESSION-2026-03-30-193848: `packages/desktop/src/renderer/components/TerminalPanel.tsx` statically imports `ghostty-web`, and the renderer build emitted an approximately 1050 kB minified chunk warning.
- `packages/desktop/vite.config.ts` had no explicit `manualChunks` strategy during the audit pass that closed Steps 01-06.
- This step should optimize the bundle without turning the shell refactor into a broad architecture rewrite.
- `packages/desktop/src/renderer/main.tsx` now lazy-loads `TerminalPanel` behind a terminal-only `React.Suspense` boundary, which dropped the default shell chunk from `1050.77 kB` minified / `313.13 kB` gzip to `219.41 kB` minified / `64.59 kB` gzip.
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` now loads `ghostty-web` and the WASM asset at runtime inside the terminal surface, splitting the old lazy terminal chunk into `TerminalPanel` (`192.63 kB` minified / `61.56 kB` gzip) and `terminal-runtime` (`640.09 kB` minified / `186.12 kB` gzip).
- `packages/desktop/vite.config.ts` now pins `ghostty-web` into an explicit `terminal-runtime` manual chunk and raises `chunkSizeWarningLimit` to `650` so the intentionally isolated runtime no longer produces a noisy build warning while the main shell stays protected from future bloat.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
