# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: Desktop settings persist only `sidebarWidth` and `sidebarCollapsed`, the side panel reloads with those values, the collapse/toggle interaction is polished, and the validation bullets in this note pass.
- Why this step matters to the phase: It makes the new shell feel durable instead of resetting on every launch and closes the loop on the resizable/collapsible side-panel UX.
- Prerequisites, setup state, and dependencies: Step 03 complete; the shell already uses `LayoutContext`; the engineer understands the renderer/main-process settings boundary before editing contracts or settings helpers.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/contracts/src/ipc/contracts.ts`, `packages/desktop/src/main/settings.ts`, `packages/desktop/src/renderer/main.tsx`, `packages/desktop/src/renderer/components/LayoutContext.tsx`, and `packages/desktop/src/renderer/styles.css`; validate with `pnpm --filter @srgnt/desktop typecheck`, plus the restart/manual checks listed here.
- Required reading completeness: Pass. The note now calls out both settings default sources, the schema, and the animation/style surface.
- Implementation constraints and non-goals: Do not persist `activePanel`; keep active-panel startup behavior on the app default route; keep new persistence inside the existing desktop settings path and IPC boundary.
- Validation commands, manual checks, and acceptance criteria mapping: The restart, animation, toggle, chevron, defaults, and typecheck checks map directly to the phase acceptance criteria for width/collapse persistence and side-panel behavior.
- Edge cases, failure modes, and recovery expectations: Width clamping, missing `layout` data, debounce behavior, and optional double-click reset are explicit above; if persistence writes cause lag, fix debounce before leaving the step complete.
- Security considerations or explicit not-applicable judgment: The new layout settings stay inside the existing validated desktop-settings contract; no new privileged channels or file paths are introduced.
- Performance considerations or explicit not-applicable judgment: The debounce is required because saving layout state crosses IPC and disk; resize updates must not spam writes on every pointer move.
- Integration touchpoints and downstream effects: Step 02's provider gains `onLayoutChange`; Step 06 must verify the persistence behavior in tests and app-level smoke checks; contracts and main-process tests may need updates alongside renderer work.
- Blockers, unresolved decisions, and handoff expectations: No blockers remain after clarifying that active panel does not persist. Handoff expectation: Step 06 verifies restart behavior instead of redefining persistence scope.
- Junior-developer readiness verdict: PASS - the note now matches the agreed persistence scope and names every cross-boundary file that must stay in sync.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors|STEP-13-05 Persist layout preferences and add collapse behaviors]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
