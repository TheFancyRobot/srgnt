# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: `LayoutContext.tsx` and `SidePanel.tsx` exist, expose the documented provider/hook API, manage collapse and resize state safely, and satisfy the validation bullets in this note.
- Why this step matters to the phase: It creates the shared shell state that lets ActivityBar, SidePanel, AppLayout, and later side-panel content coordinate without ad hoc prop drilling.
- Prerequisites, setup state, and dependencies: No prior Phase 13 steps are required, but the engineer must understand the current `main.tsx` navigation flow and keep Step 03 as the first integration point.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/desktop/src/renderer/main.tsx`, `packages/desktop/src/renderer/components/Navigation.tsx`, `packages/desktop/src/renderer/styles.css`, and `packages/desktop/src/renderer/components/TerminalPanel.tsx`; add `LayoutContext.tsx` and `SidePanel.tsx`; validate with `pnpm --filter @srgnt/desktop typecheck`.
- Required reading completeness: Pass. The note points to the current navigation state owner, navigation item shape, renderer architecture note, and terminal compatibility surface.
- Implementation constraints and non-goals: Do not wire the new provider into `App` yet; keep built-in panel ownership with `initialPanels`; do not introduce calendar-specific shared state in this step.
- Validation commands, manual checks, and acceptance criteria mapping: The listed provider, resize, collapse, registry, shortcut, and typecheck validations map directly to the phase acceptance criteria for resizable/collapsible side-panel behavior.
- Edge cases, failure modes, and recovery expectations: Width clamping, unknown panel IDs, drag cleanup, and shortcut target filtering are explicit above; if drag cleanup leaks listeners, fix that before handing off to Step 03.
- Security considerations or explicit not-applicable judgment: Not applicable. This step manages renderer-only state and events.
- Performance considerations or explicit not-applicable judgment: rAF-throttled resize and commit-on-mouseup behavior are required to avoid high-frequency React churn during drags.
- Integration touchpoints and downstream effects: Step 03 wraps the app with `LayoutProvider`; Step 04 may extend the context for calendar side-panel coordination; Step 05 adds persistence callbacks to the same provider.
- Blockers, unresolved decisions, and handoff expectations: No blockers remain after the shortcut and registry decisions were clarified. Handoff expectation: Step 03 should consume this provider instead of duplicating navigation state in `App`.
- Junior-developer readiness verdict: PASS - the note now separates layout-only groundwork from later integration work and makes the shortcut, registry, and resize expectations concrete.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component|STEP-13-02 Create LayoutContext provider and SidePanel component]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
