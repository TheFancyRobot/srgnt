# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: The app shell uses `LayoutProvider`, renders ActivityBar + SidePanel + main content, includes a real `notes` route placeholder, preserves terminal full-bleed behavior, and passes the validation bullets in this note.
- Why this step matters to the phase: This is the first end-to-end integration point where the new shell becomes visible and all later side-panel and persistence work gains a stable home.
- Prerequisites, setup state, and dependencies: Step 01 and Step 02 complete; the engineer understands the current `Navigation.tsx` shell, `main.tsx` route switch, and how Titlebar/fullBleed behave today.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/desktop/src/renderer/components/Navigation.tsx`, `packages/desktop/src/renderer/main.tsx`, `ActivityBar.tsx`, `LayoutContext.tsx`, `SidePanel.tsx`, `Titlebar.tsx`, `styles.css`, and create `NotesView.tsx`; validate with `pnpm --filter @srgnt/desktop typecheck` plus the broken-test fixes called out here.
- Required reading completeness: Pass. The note covers the old shell, the app entrypoint, the related layout components, and the architecture note.
- Implementation constraints and non-goals: Keep Titlebar full width; keep terminal fullBleed; add only a placeholder Notes main view; do not expand scope into version/footer IPC work in this phase.
- Validation commands, manual checks, and acceptance criteria mapping: The listed shell, notes-route, terminal, titlebar, status-dot, and test-fix checks map directly to the phase acceptance criteria for layout structure and preserved existing views.
- Edge cases, failure modes, and recovery expectations: Unknown panel IDs must fail to a safe fallback view; E2E selectors that relied on `aria-current` or old labels must be updated as part of this integration step.
- Security considerations or explicit not-applicable judgment: Not applicable. This step restructures renderer layout and existing view wiring only.
- Performance considerations or explicit not-applicable judgment: Preserve `min-w-0`, `min-h-0`, and overflow behavior so the new shell does not create flex overflow or scroll regressions.
- Integration touchpoints and downstream effects: Step 04 replaces placeholder side-panel content; Step 05 persists width/collapse state; Step 06 adds the new shell-specific tests and accessibility coverage.
- Blockers, unresolved decisions, and handoff expectations: No blockers remain after the Notes placeholder decision and the removal of version-footer scope. Handoff expectation: later steps build on this shell instead of reworking core layout structure again.
- Junior-developer readiness verdict: PASS - the note now names the exact integration surface, removes unsupported scope, and makes the missing Notes route explicit.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell|STEP-13-03 Refactor AppLayout to three-panel shell]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
