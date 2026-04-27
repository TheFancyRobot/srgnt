# Execution Brief

## Why This Step Exists

- The layout restructuring touches the core app shell, which means existing tests for Navigation, TodayView, CalendarView, and TerminalPanel may break due to changed DOM structure or missing context providers.
- The ActivityBar introduces a roving tabindex keyboard navigation pattern that is easy to get subtly wrong. Dedicated tests catch regressions in arrow key cycling, focus management, and ARIA attribute updates.
- The user specifically called out accessibility as a requirement for the icon-only menu. This step verifies that requirement is met.

## Prerequisites

- Steps 04 and 05 completed: all side panel content is implemented and layout persistence is working.
- All new components (ActivityBar, SidePanel, LayoutContext, side panel content components) are in their final state.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/ActivityBar.tsx` -- roving tabindex to test
- `packages/desktop/src/renderer/components/LayoutContext.tsx` -- context state management to test
- `packages/desktop/src/renderer/components/SidePanel.tsx` -- collapse/expand behavior to test
- `packages/desktop/src/renderer/components/CalendarView.test.tsx` -- existing test
- `packages/desktop/src/renderer/components/TodayView.test.tsx` -- existing test
- `packages/desktop/src/renderer/components/TerminalPanel.test.tsx` -- existing test
- `packages/desktop/vitest.config.ts` -- test config
- `packages/desktop/src/test-setup.ts` -- test setup
- `packages/desktop/e2e/app.spec.ts` and `packages/desktop/e2e/fixtures.ts` -- app-level selectors and shell smoke paths that change with the new activity bar and side panel

## Execution Prompt

1. Run `pnpm --filter @srgnt/desktop test` to see which existing tests pass/fail with the new layout.

2. Create a shared test utility before fixing tests:

   **File: `packages/desktop/src/renderer/test-utils.tsx`**
   ```typescript
   import { render, RenderOptions } from '@testing-library/react';
   import { LayoutProvider } from './components/LayoutContext';
   // Import default panels from wherever Step 03 placed them

   function renderWithLayout(ui: React.ReactElement, options?: RenderOptions) {
     return render(
       <LayoutProvider initialPanels={defaultPanels}>{ui}</LayoutProvider>,
       options,
     );
   }

   export { renderWithLayout, render };
   ```
   - This utility wraps components in `LayoutProvider` with default panels so tests don't need to set up context manually.
   - Tests that render standalone components (ActivityBar, SidePanel in isolation) can still use plain `render()`.
   - Tests that render view components (TodayView, CalendarView, etc.) should use `renderWithLayout()`.

3. Fix any broken existing tests:
   - **Most existing test breakage was already handled in Step 03.** This step addresses any remaining issues, especially for view components that now read from LayoutContext.
   - Tests that query for navigation elements by role or text may need updated selectors (e.g., `role="tab"` → `aria-pressed`)
   - Import `renderWithLayout` from `test-utils.tsx` where needed

4. Write new tests for `ActivityBar`:

   **File: `packages/desktop/src/renderer/components/ActivityBar.test.tsx`**

   Test cases:
   - Renders all default activity bar items as buttons with `aria-label` attributes
   - Buttons do NOT have `role="tab"` (they are plain `<button>` elements in a toolbar)
   - The toolbar container has `role="toolbar"` and `aria-orientation="vertical"`
   - Active item has `aria-pressed="true"`, others have `aria-pressed="false"`
   - Active item has `tabindex="0"`, others have `tabindex="-1"`
   - ArrowDown moves focus to next item, wrapping from last to first
   - ArrowUp moves focus to previous item, wrapping from first to last
   - Home key moves focus to first item
   - End key moves focus to last item
   - Clicking a button calls `onNavigate` with the correct ID
   - Main, system, and utility sections are rendered in separate groups
   - Each button has a `title` attribute matching its label (for native tooltip)
   - All icon SVGs inside buttons have `aria-hidden="true"`

5. Write new tests for `LayoutContext`:

    **File: `packages/desktop/src/renderer/components/LayoutContext.test.tsx`**

    Test cases:
    - `useLayout()` throws when used outside `LayoutProvider`
    - Initial state has correct defaults (activePanel='today', sidebarWidth=240, collapsed=false)
    - `setActivePanel` with a new ID updates `activePanel`
    - `setActivePanel` with the current active ID toggles `isSidebarCollapsed`
    - `toggleSidebar` flips `isSidebarCollapsed`
    - `setSidebarWidth` updates `sidebarWidth`
    - `registerPanel` adds a panel to the registry
    - `registerPanel` with an existing ID replaces the panel
    - `unregisterPanel` removes a panel by ID
    - Panels are sorted by `order` after registration
    - Custom `initialWidth`, `initialCollapsed`, `defaultPanel` props are respected
    - The global `Ctrl+B` / `Cmd+B` handler still toggles when the terminal surface is focused

6. Write tests for `SidePanel`:

    **File: `packages/desktop/src/renderer/components/SidePanel.test.tsx`**

    Test cases:
    - Renders children when not collapsed
    - Has `width: 0` style when collapsed
    - Has `role="complementary"` and `aria-label`
    - Resize handle has `role="separator"` and `aria-orientation="vertical"`
    - Resize handle has `aria-label="Resize side panel"`

7. Add or update app-level smoke coverage for the new shell:
   - Update `packages/desktop/e2e/app.spec.ts` and `packages/desktop/e2e/fixtures.ts` away from the old `aria-current` selectors
   - Cover at least one end-to-end path that proves: activity-bar navigation works, the side panel can collapse/expand, the terminal still renders fullBleed, and the Notes placeholder route loads instead of falling through to Today
   - Add one restart/persistence check for width/collapsed state if the existing E2E harness can cover it; if not, document the exact gap in the outcome summary

8. Run the full test suite: `pnpm --filter @srgnt/desktop test`
    - All existing tests pass
    - All new tests pass
    - No TypeScript errors: `pnpm --filter @srgnt/desktop typecheck`

9. Manual accessibility verification checklist:
    - [ ] Tab key moves focus into the activity bar toolbar, then out to main content (single tab stop for the toolbar)
    - [ ] Arrow keys cycle through activity bar buttons within the toolbar
    - [ ] Each activity bar button has a visible native tooltip on hover
    - [ ] Screen reader announces button labels correctly (test with NVDA or VoiceOver if available, or verify aria attributes)
    - [ ] The side panel resize handle is focusable for screen reader discovery, but keyboard-driven resize (arrow keys adjusting width) is out of scope for this phase — document as "not implemented, mouse/trackpad only"
    - [ ] Ctrl+B / Cmd+B toggle works and is announced to screen readers
    - [ ] Focus does not get lost when the side panel collapses/expands
    - [ ] Color contrast ratios meet WCAG AA for all new elements (icon colors against backgrounds)

10. Validate the full app experience:
    - Build the renderer: `pnpm --filter @srgnt/desktop build:renderer`
    - If a dev server is available (`pnpm --filter @srgnt/desktop dev`), visually verify the layout works end-to-end
    - All views render, side panels show correct content, resize works, collapse works, keyboard shortcuts work
    - Run `pnpm --filter @srgnt/desktop test:e2e` when the local environment can launch the Electron app. If it cannot run here, record the exact blocker and leave the step outcome explicitly marked as partial pending human/E2E validation.

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
