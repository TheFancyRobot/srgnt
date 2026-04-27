# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: `ActivityBar.tsx` and shared `icons.tsx` exist, render the Phase 13 item groups, use the toolbar + roving-tabindex interaction model, and pass the validation bullets in this note.
- Why this step matters to the phase: It establishes the accessible icon-only navigation primitive that every later layout step depends on.
- Prerequisites, setup state, and dependencies: Phase 12 complete; no prior Phase 13 steps required; Step 03 depends on this step shipping the reusable component without rewiring the live layout yet.
- Concrete starting files, directories, packages, commands, and tests: Start with `packages/desktop/src/renderer/components/Navigation.tsx`, `packages/desktop/src/renderer/styles.css`, and `packages/desktop/src/renderer/main.tsx`; add `ActivityBar.tsx` and `icons.tsx`; validate with `pnpm --filter @srgnt/desktop typecheck`.
- Required reading completeness: Pass. The note points to the current navigation component, shared styles, renderer shell entrypoint, IA note, and the WAI-ARIA toolbar model.
- Implementation constraints and non-goals: Do not change `AppLayout`; do not live-wire ActivityBar into the app yet; only update `Navigation.tsx` for icon extraction; keep the component dependency-free.
- Validation commands, manual checks, and acceptance criteria mapping: Use the listed typecheck plus manual toolbar checks for labels, `aria-pressed`, roving focus, grouping, and active indicator to satisfy the activity-bar acceptance criteria.
- Edge cases, failure modes, and recovery expectations: Empty items, missing `activeId`, and single-item toolbars are covered above; if icon extraction breaks the old Navigation import path, fix that before leaving the step complete.
- Security considerations or explicit not-applicable judgment: Not applicable. No IPC, secrets, or persisted data changes occur here.
- Performance considerations or explicit not-applicable judgment: Not applicable for runtime scale; the component renders a fixed tiny set of buttons.
- Integration touchpoints and downstream effects: Step 03 consumes `ActivityBar` and `icons.tsx`; E2E selectors move away from `aria-current` once integration lands.
- Blockers, unresolved decisions, and handoff expectations: No open blockers remain after refinement. Handoff expectation: Step 03 should import this component instead of re-deriving item markup.
- Junior-developer readiness verdict: PASS - the note now identifies the exact files, allowed edits, semantics, and validation needed to complete the step safely.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation|STEP-13-01 Create ActivityBar component with accessible icon-only navigation]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
