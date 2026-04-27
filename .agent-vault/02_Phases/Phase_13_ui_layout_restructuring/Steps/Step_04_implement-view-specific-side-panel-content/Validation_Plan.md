# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: Each activity-bar view has concrete side-panel content, Today/Connectors/Settings scroll targets exist, Calendar month/year changes the displayed calendar header, and Settings uses the global side panel instead of an internal duplicate nav.
- Why this step matters to the phase: It turns the middle column from dead space into view-specific workflow/navigation UI, which is the main reason the three-panel shell exists.
- Prerequisites, setup state, and dependencies: Step 03 complete; the integrated shell and placeholder side panels already render; the engineer understands Today, Calendar, Connectors, Settings, and Terminal view structures before editing them.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/desktop/src/renderer/components/TodayView.tsx`, `CalendarView.tsx`, `ConnectorStatus.tsx`, `Settings.tsx`, `LayoutContext.tsx`, `NotesView.tsx`, and the new `packages/desktop/src/renderer/components/sidepanels/` directory; validate with `pnpm --filter @srgnt/desktop typecheck`.
- Required reading completeness: Pass. The note points to the existing view components, renderer app state, IA note, and the current settings section data source.
- Implementation constraints and non-goals: Keep side-panel components thin; keep Notes scaffold-only; do not build full notes functionality; replace the Settings in-view nav instead of shipping two nav systems.
- Validation commands, manual checks, and acceptance criteria mapping: The listed Today, Calendar, Notes, Connectors, Settings, Terminal, styling, and typecheck validations map directly to the phase acceptance criteria for contextual side-panel behavior.
- Edge cases, failure modes, and recovery expectations: Empty Today sections, empty calendar months, side-panel render failures, and `scrollIntoView` assumptions are documented above; if scrolling fails because the content container is not scrollable, fix the layout before leaving the step done.
- Security considerations or explicit not-applicable judgment: Not applicable. This step adds read-only navigation UI and section anchors.
- Performance considerations or explicit not-applicable judgment: IntersectionObserver work is optional and should use one observer if implemented; only the active side-panel content should mount.
- Integration touchpoints and downstream effects: Step 02's `LayoutContext` gains the calendar month/year state here; Step 06 must add tests for the new settings layout, calendar navigation state, and side-panel interactions.
- Blockers, unresolved decisions, and handoff expectations: No blockers remain after locking the Settings replacement decision and the exact Today section IDs. Handoff expectation: Step 06 verifies these side panels instead of redefining their behavior.
- Junior-developer readiness verdict: PASS - the note now names the exact headings, IDs, settings refactor, and calendar-state ownership needed to execute the step without guessing.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content|STEP-13-04 Implement view-specific side panel content]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
