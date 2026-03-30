---
note_type: step
template_version: 2
contract_version: 1
title: Refactor AppLayout to three-panel shell
step_id: STEP-13-03
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation|STEP-13-01]]'
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component|STEP-13-02]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-161918-refactor-applayout-to-three-panel-shell-opencode|SESSION-2026-03-30-161918 OpenCode session for Refactor AppLayout to three-panel shell]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Refactor AppLayout to three-panel shell

## Purpose

- Outcome: The `AppLayout` component renders the new three-panel layout (ActivityBar + SidePanel + Content), replacing the current two-panel layout. The `App` component in `main.tsx` uses `LayoutProvider` for state management and the new layout shell for rendering.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Why This Step Exists

- This is the integration step that wires together the ActivityBar (Step 01), LayoutContext/SidePanel (Step 02), and the existing content views into a cohesive three-panel layout.
- The current `AppLayout` in `Navigation.tsx` contains both the layout shell and the navigation component. This step separates concerns: ActivityBar handles navigation, SidePanel handles secondary content, and AppLayout is just the structural shell.
- After this step, the app should be visually functional with the new layout, even if side panel content is placeholder/empty for most views.

## Prerequisites

- Step 01 completed: `ActivityBar` component exists and renders icon-only navigation
- Step 02 completed: `LayoutContext` provider and `SidePanel` component exist
- Current `AppLayout` in `Navigation.tsx` and `App` in `main.tsx` are understood

## Relevant Code Paths

- `packages/desktop/src/renderer/components/Navigation.tsx` -- current `AppLayout` component (lines 136-185), will be heavily modified
- `packages/desktop/src/renderer/main.tsx` -- `App` component, `currentView` state, `handleNavigate`, `renderContent()` switch (lines 37-476)
- `packages/desktop/src/renderer/components/ActivityBar.tsx` -- new component from Step 01
- `packages/desktop/src/renderer/components/LayoutContext.tsx` -- new context from Step 02
- `packages/desktop/src/renderer/components/SidePanel.tsx` -- new component from Step 02
- `packages/desktop/src/renderer/components/Titlebar.tsx` -- titlebar (stays as-is, position preserved)
- `packages/desktop/src/renderer/styles.css` -- layout CSS
- `packages/desktop/src/renderer/components/NotesView.tsx` -- new placeholder main-content route created in this step so the `notes` activity item is real before Phase 14

## Required Reading

- `packages/desktop/src/renderer/components/Navigation.tsx` -- the full `AppLayout` component
- `packages/desktop/src/renderer/main.tsx` -- the full `App` component, especially the navigation state and `renderContent()` switch
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture and component hierarchy
- The completed Step 01 and Step 02 code

## Execution Prompt

1. Read `Navigation.tsx` (AppLayout) and `main.tsx` (App) to understand the current two-panel structure and all view rendering.

2. Refactor `AppLayout` in `Navigation.tsx` (or move it to its own file if cleaner):

   **New layout structure:**
   ```
   <div className="flex flex-col h-screen bg-surface-secondary grain">
     <Titlebar />
     <div className="flex flex-1 min-h-0">
       <ActivityBar ... />       {/* ~48px, fixed */}
       <SidePanel>               {/* configurable width, collapsible */}
         {sidePanelContent}
       </SidePanel>
       <main>                    {/* flex-1 */}
         {children}
       </main>
     </div>
   </div>
   ```

   **Key changes from current layout:**
   - Remove the current `<aside className="w-56 ...">` sidebar entirely
   - Replace it with `<ActivityBar>` (narrow icon strip) + `<SidePanel>` (context-dependent)
   - The `<main>` element keeps the same styling: `flex-1 min-w-0 min-h-0`, with `fullBleed` conditional for terminal
   - The date display and status footer from the current sidebar can move into the side panel header/footer or be removed (they add clutter to the activity bar)

   **Props update:**
   - `AppLayout` should read from `useLayout()` context instead of receiving `activeId` and `onNavigate` as props
   - Keep `children` and `fullBleed` props
   - The `date` prop can be removed (date display moves to TodayView header or side panel)

3. Wrap the `<App>` component in `main.tsx` with `<LayoutProvider>`:

   **State migration:**
   - Remove the `currentView` state from `App` -- it moves into `LayoutContext`
   - Remove the `handleNavigate` callback -- `ActivityBar`'s `onNavigate` calls `setActivePanel` from context
   - The `renderContent()` switch stays but reads `activePanel` from `useLayout()` instead of local state
   - `setPendingLaunchContext` and terminal handling stay in `App` (they're view-specific, not layout concerns)
   - `handleLaunchContext` stays as a prop passed to TodayView/CalendarView (it's view-specific, not layout state)

    **Register default panels synchronously (no useEffect):**
    - Build the `defaultPanels: PanelDefinition[]` array as a module-level constant (or useMemo) and pass it to `<LayoutProvider initialPanels={defaultPanels}>`. This avoids a flash of empty state that would happen with useEffect registration.
    - Each panel definition maps to an activity bar icon and optionally a side panel content component (side panel content components are placeholders in this step; real ones come in Step 04)
    - The terminal panel definition sets `sidePanelContent: undefined` to signal auto-collapse behavior
    - Include a `notes` panel definition now so Phase 13 ships the new activity item end to end

4. Handle the `fullBleed` mode for terminal:
   - When `activePanel === 'terminal'`, the side panel should auto-collapse (or stay at user's preference)
   - The `<main>` element uses `fullBleed` styling (no padding, `overflow-hidden`, `h-full`)
   - The `fullBleed` check should read from context: `const isFullBleed = activePanel === 'terminal'`

5. Preserve the existing status footer ("Online" indicator):
    - Move it to the bottom of the ActivityBar component, below the terminal icon and the utility separator
    - Condense to just the status dot (8px circle, `status-indicator connected` class) with a tooltip "Online" — no text label in the narrow bar
    - The dot sits centered in the activity bar width, with `mb-2` bottom margin

6. Add a placeholder Notes main-content view in this step:
   - Create `packages/desktop/src/renderer/components/NotesView.tsx`
   - Render a simple scaffold that makes the route real without pre-empting Phase 14, for example a heading, a short explanation that notes are coming in the next phase, and one or two placeholder cards describing the planned file tree + editor workflow
   - Add a `case 'notes'` branch in `renderContent()` so the new activity item does not fall through to Today or a generic fallback
   - Keep this intentionally lightweight; do not start implementing the actual notes feature set in Phase 13

7. For now, the side panel content for each view can be a simple placeholder:
    ```tsx
    <div className="p-3">
      <p className="section-heading">{panelLabel}</p>
      <p className="text-xs text-text-tertiary mt-2">Side panel content coming in Step 04.</p>
    </div>
    ```

8. Remove or deprecate the old `Navigation` component:
    - The `canonicalNavItems` array is no longer needed — the panel definitions in `defaultPanels` replace it
    - The `navIcons` record was already moved to `icons.tsx` in Step 01 — verify no remaining imports from Navigation.tsx
    - The old `Navigation` component and `NavButton` component are no longer needed — delete them
    - **Before deleting:** Run `grep -r "from.*Navigation" packages/desktop/src/` to verify nothing else imports from Navigation.tsx. If the old `AppLayout` export is imported elsewhere, move it to its own file first.
    - Keep `Navigation.tsx` only if `AppLayout` is still exported from it; otherwise delete the whole file

9. Validate:
    - `pnpm --filter @srgnt/desktop typecheck` passes
    - The app renders with the three-panel layout: activity bar + side panel + content
    - Clicking activity bar icons switches the main content view
    - Clicking the `notes` icon renders the placeholder `NotesView` instead of falling back to Today
    - Clicking the active icon toggles the side panel
    - Terminal view renders fullBleed with side panel auto-collapsed
    - The titlebar is still at the top, spanning the full width
    - All existing views (Today, Calendar, Terminal, Connectors, Settings) render their content correctly
    - The online status dot is visible at the bottom of the activity bar
    - **Fix broken existing tests in this step** (not deferred to Step 06). Tests that reference the old sidebar structure or Navigation component need updating now. Wrap test renders in `<LayoutProvider>` as needed. Step 06 adds *new* tests; this step keeps *existing* tests passing.

## Edge Cases

- If `defaultPanels` has a panel whose `id` doesn't match any case in `renderContent()`, render a fallback "View not found" message instead of crashing.
- When deleting `Navigation.tsx`, verify E2E tests (`packages/desktop/e2e/`) don't reference the old navigation by `getByRole('button', { name: 'Today' })` etc. — they may need selector updates.

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

## Security Considerations

- Not applicable. This step restructures layout components only — no new IPC channels, no new data flows.

## Performance Considerations

- The three-panel flex layout should use `min-w-0` on the main content area to prevent flex overflow. Without it, wide content can push the layout beyond the viewport.
- Keep `overflow: hidden` on the main content wrapper when not fullBleed, with a scrollable inner container, to prevent layout shift.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-03.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- This is the riskiest step because it touches the core layout shell. Make a commit before starting and another after completing so the change is easily revertable.
- The Titlebar must span the full window width (it's the Electron drag region). It sits above the three-column flex row, not inside any column.
- Be careful with the `min-h-0` on the flex row -- without it, the content area won't scroll properly. This is a common flexbox gotcha.
- The `grain::after` pseudo-element is on the `.grain` class which is on the outermost div. It should still work since it uses `position: fixed; inset: 0`.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-161918-refactor-applayout-to-three-panel-shell-opencode|SESSION-2026-03-30-161918 OpenCode session for Refactor AppLayout to three-panel shell]] - Session created.
<!-- AGENT-END:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-161918-refactor-applayout-to-three-panel-shell-opencode|SESSION-2026-03-30-161918 Refactor AppLayout to three-panel shell]] - Completed: cleaned up old Navigation, fixed E2E selectors, added status dot.

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
