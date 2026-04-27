# Execution Brief

## Why This Step Exists

- Phase 13 shipped functionally complete, but `vite build` now warns that the renderer output contains a large chunk. The warning is non-blocking, but it points to a real maintainability and startup-performance problem in the shell we just restructured.
- The current renderer statically imports `ghostty-web` through the terminal surface. That forces terminal code into the initial bundle even when users launch into Today, Calendar, or Notes.
- This step closes the last quality gap from the Phase 13 audit by making the shell modular at the bundle level as well as the layout level.

## Prerequisites

- [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]] must remain the controlling phase note for layout-shell work.
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]] should stay complete before this step starts; do not regress the already-green renderer, unit, or E2E validation.
- A fresh renderer build should be run before editing so the current chunk warning and output sizes are measured from the repo state rather than memory.

## Relevant Code Paths

- `packages/desktop/vite.config.ts` -- current Rollup/Vite chunking behavior
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` -- terminal surface and `ghostty-web` import path
- `packages/desktop/src/renderer/main.tsx` -- route/layout entry points that may host a lazy boundary
- `packages/desktop/src/renderer/components/Navigation.tsx` -- shell integration if terminal loading state needs to stay visually consistent
- `packages/desktop/src/renderer/components/TerminalPanel.test.tsx` -- terminal regression coverage
- `packages/desktop/e2e/app.spec.ts` -- shell-level terminal smoke path
- `packages/desktop/package.json` -- renderer build scripts used for validation

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Run `pnpm --filter @srgnt/desktop build:renderer` and capture the current warning text and bundle sizes from the emitted output.
3. Inspect how the terminal route is currently imported. Prefer the smallest safe change that keeps terminal behavior intact while removing `ghostty-web` from the initial renderer chunk when the terminal is not visible.
4. Use lazy loading at the React boundary first if that resolves the biggest cost cleanly. Only add Vite `manualChunks` configuration when the build output still needs additional splitting or when the chunk boundaries would otherwise stay unstable.
5. Preserve the existing shell behavior: no route regressions, no broken `fullBleed` terminal mode, and no visual churn outside any loading fallback needed for the lazy boundary.
6. Add or update focused regression coverage around the terminal route or loading boundary if the implementation changes render timing.
7. Validate with `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop build:renderer`, and any narrower targeted checks that fail along the way. Run `pnpm --filter @srgnt/desktop test:e2e` if the shell interaction changes materially.
8. Record before/after build output in Implementation Notes and Outcome Summary so the next engineer can see whether the warning disappeared, merely shrank, or still needs a follow-up.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
