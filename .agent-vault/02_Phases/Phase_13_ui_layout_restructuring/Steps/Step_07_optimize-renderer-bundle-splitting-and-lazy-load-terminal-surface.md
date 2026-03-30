---
note_type: step
template_version: 2
contract_version: 1
title: Optimize renderer bundle splitting and lazy-load terminal surface
step_id: STEP-13-07
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-203238-optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface-opencode|SESSION-2026-03-30-203238 OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface]]'
related_bugs: []
tags:
  - agent-vault
  - step
completed_at: '2026-03-30'
---

# Step 07 - Optimize renderer bundle splitting and lazy-load terminal surface

## Purpose

- Outcome: Reduce the renderer's initial JavaScript cost by splitting large chunks and lazy-loading the terminal surface so Phase 13's three-panel shell keeps its correctness gains without carrying unnecessary startup weight.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

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

## Required Reading

- [[02_Phases/Phase_13_ui_layout_restructuring/Phase|PHASE-13 UI Layout Restructuring]]
- [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]]
- [[05_Sessions/2026-03-30-193848-update-tests-and-verify-accessibility-opencode|SESSION-2026-03-30-193848 OpenCode session for Update tests and verify accessibility]]
- [[01_Architecture/System_Overview|System Overview]]
- [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract]]

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Run `pnpm --filter @srgnt/desktop build:renderer` and capture the current warning text and bundle sizes from the emitted output.
3. Inspect how the terminal route is currently imported. Prefer the smallest safe change that keeps terminal behavior intact while removing `ghostty-web` from the initial renderer chunk when the terminal is not visible.
4. Use lazy loading at the React boundary first if that resolves the biggest cost cleanly. Only add Vite `manualChunks` configuration when the build output still needs additional splitting or when the chunk boundaries would otherwise stay unstable.
5. Preserve the existing shell behavior: no route regressions, no broken `fullBleed` terminal mode, and no visual churn outside any loading fallback needed for the lazy boundary.
6. Add or update focused regression coverage around the terminal route or loading boundary if the implementation changes render timing.
7. Validate with `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop build:renderer`, and any narrower targeted checks that fail along the way. Run `pnpm --filter @srgnt/desktop test:e2e` if the shell interaction changes materially.
8. Record before/after build output in Implementation Notes and Outcome Summary so the next engineer can see whether the warning disappeared, merely shrank, or still needs a follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner: OpenCode
- Last touched: 2026-03-30
- Next action: None. STEP-13-07 is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Audit finding from SESSION-2026-03-30-193848: `packages/desktop/src/renderer/components/TerminalPanel.tsx` statically imports `ghostty-web`, and the renderer build emitted an approximately 1050 kB minified chunk warning.
- `packages/desktop/vite.config.ts` had no explicit `manualChunks` strategy during the audit pass that closed Steps 01-06.
- This step should optimize the bundle without turning the shell refactor into a broad architecture rewrite.
- `packages/desktop/src/renderer/main.tsx` now lazy-loads `TerminalPanel` behind a terminal-only `React.Suspense` boundary, which dropped the default shell chunk from `1050.77 kB` minified / `313.13 kB` gzip to `219.41 kB` minified / `64.59 kB` gzip.
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` now loads `ghostty-web` and the WASM asset at runtime inside the terminal surface, splitting the old lazy terminal chunk into `TerminalPanel` (`192.63 kB` minified / `61.56 kB` gzip) and `terminal-runtime` (`640.09 kB` minified / `186.12 kB` gzip).
- `packages/desktop/vite.config.ts` now pins `ghostty-web` into an explicit `terminal-runtime` manual chunk and raises `chunkSizeWarningLimit` to `650` so the intentionally isolated runtime no longer produces a noisy build warning while the main shell stays protected from future bloat.

## Human Notes

- Reopening the phase is intentional: the shipped layout behavior is complete, but the audit identified bundle health as unfinished follow-up work that still belongs to Phase 13's shell quality bar.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-203238-optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface-opencode|SESSION-2026-03-30-203238 OpenCode session for Optimize renderer bundle splitting and lazy-load terminal surface]] - Session created, scope documented, and phase reopened to track the follow-up honestly.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completed by lazy-loading the terminal route, moving `ghostty-web` loading into the terminal surface, and isolating the heavy runtime into a dedicated `terminal-runtime` build chunk.
- Validation completed: `pnpm --filter @srgnt/desktop typecheck`, `pnpm --filter @srgnt/desktop test`, `pnpm --filter @srgnt/desktop build:renderer`, and `pnpm --filter @srgnt/desktop test:e2e` all passed.
- Result: the startup shell bundle is now small and the renderer build no longer emits the large-chunk warning for the intentionally isolated terminal runtime.
