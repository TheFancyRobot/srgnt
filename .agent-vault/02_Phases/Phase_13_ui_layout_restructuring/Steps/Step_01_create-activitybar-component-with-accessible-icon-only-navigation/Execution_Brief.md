# Execution Brief

## Why This Step Exists

- The current `Navigation` component renders icons + text labels in a 224px sidebar. The new layout needs the icons separated into an independent, narrow activity bar that can sit alongside a collapsible side panel.
- Accessibility is critical for icon-only navigation. Without visible labels, every button must have `aria-label`, a native tooltip, and keyboard navigation via roving tabindex. This step establishes the accessibility foundation before the layout is wired together.
- The activity bar is the most visible structural change. Getting it right first makes the rest of the layout integration smoother.

## Prerequisites

- Phase 12 (Brand Alignment) is completed; current brand palette, fonts, and styles are final.
- No prior steps required; this step can start immediately and run in parallel with Step 02.

## Relevant Code Paths

- `packages/desktop/src/renderer/components/Navigation.tsx` -- current navigation component with `navIcons` record, `NavItem` type, `canonicalNavItems` array, `NavButton` component
- `packages/desktop/src/renderer/styles.css` -- `.nav-item`, `.nav-item.active`, `.nav-item.active::before` styles
- `packages/desktop/src/renderer/main.tsx` -- `AppLayout` usage with `activeId` and `onNavigate` props
- `packages/desktop/e2e/app.spec.ts` and `packages/desktop/e2e/fixtures.ts` -- current selectors assume text-label buttons with `aria-current`, which will change once ActivityBar is integrated in Step 03

## Execution Prompt

1. Read `Navigation.tsx` and `styles.css` to understand the existing `navIcons` record, `NavItem` interface, `canonicalNavItems` array, and active indicator CSS.

2. Create a new file `packages/desktop/src/renderer/components/ActivityBar.tsx` with these requirements:

   **Component structure:**
   - `ActivityBar` component accepts `items: ActivityBarItem[]`, `activeId: string | null`, `onNavigate: (id: string) => void`
   - `ActivityBarItem` interface: `{ id: string; icon: React.ReactNode; label: string; section: 'main' | 'system' | 'utility' }`
   - **Icon extraction (do this first):** Create a new file `packages/desktop/src/renderer/components/icons.tsx` that exports all SVG icon components. Move the `navIcons` record from `Navigation.tsx` to this file. Update `Navigation.tsx` only enough to import from `icons.tsx`; do not integrate `ActivityBar` into the live layout in this step. Add a Notes icon (see step 4). This shared module lets both the old Navigation and new ActivityBar use the same icons during the transition.

   **Layout:**
   - Outer container: `w-12` (48px), full height, flex column, `bg-surface-primary`, border-right
   - Main items group at the top (dashboard, calendar, notes)
   - System items in the middle (connectors, settings)
   - Utility items at the bottom with a separator (terminal)
   - Use `flex-1` spacer between system and utility groups

   **Default items (exported as `defaultActivityBarItems`):**
   - `{ id: 'today', label: 'Daily Dashboard', section: 'main' }` -- sun/day icon
   - `{ id: 'calendar', label: 'Calendar', section: 'main' }` -- calendar icon
   - `{ id: 'notes', label: 'Notes', section: 'main' }` -- document/note icon (new SVG needed)
   - `{ id: 'connectors', label: 'Connectors', section: 'system' }` -- link icon
   - `{ id: 'settings', label: 'Settings', section: 'system' }` -- gear icon
   - `{ id: 'terminal', label: 'Terminal', section: 'utility' }` -- terminal icon

    **Accessibility (WAI-ARIA Toolbar):**
    - Outer `<nav>` wraps a `<div role="toolbar" aria-label="Application views" aria-orientation="vertical">`
    - Each icon button: `<button aria-pressed={isActive} aria-label={item.label} title={item.label} tabIndex={isFocused ? 0 : -1}>`
    - Do NOT use `role="tab"` or `role="tablist"`. These buttons trigger navigation, not tab panels. The toolbar pattern with `aria-pressed` is the correct semantic (matches VS Code's activity bar).
    - Use `aria-pressed` for active state in `ActivityBar`; do not add `aria-current` to the new toolbar buttons.
    - Icons inside buttons get `aria-hidden="true"`
    - Implement roving tabindex:
      - Track `focusedIndex` in state (initialized to active item index)
      - ArrowDown moves focus to next item; ArrowUp to previous
      - Home jumps to first; End to last
      - Wrap from last to first and vice versa
      - On focus change, call `buttonRefs[newIndex].current?.focus()`
      - Clicking a button updates the focused index to that button before calling `onNavigate`
    - Active state uses `aria-pressed="true"` on the active button

   **Active indicator styling:**
   - Reuse the existing `nav-item.active::before` left-edge gradient bar pattern, but adapt it for the icon-only button width
   - Add new CSS class `.activity-bar-btn` and `.activity-bar-btn.active` to `styles.css`
   - Active button gets brand background tint (`bg-surface-brand`) and brand text color (`text-text-brand`)
   - Hover state: `bg-surface-tertiary`, `text-text-primary`

3. Add the new CSS classes to `styles.css`:
   ```css
   .activity-bar-btn {
     display: flex;
     align-items: center;
     justify-content: center;
     width: 40px;
     height: 40px;
     border-radius: 8px;
     color: var(--color-text-tertiary);
     transition: all 160ms cubic-bezier(0.4, 0, 0.2, 1);
     cursor: pointer;
     position: relative;
   }

   .activity-bar-btn:hover {
     background-color: var(--color-surface-tertiary);
     color: var(--color-text-primary);
   }

   .activity-bar-btn.active {
     background-color: var(--color-surface-brand);
     color: var(--color-text-brand);
   }

   .activity-bar-btn.active::before {
     content: '';
     position: absolute;
     left: -4px;
     top: 8px;
     bottom: 8px;
     width: 3px;
     border-radius: 0 3px 3px 0;
     background: linear-gradient(180deg, var(--color-srgnt-400), var(--color-srgnt-500));
   }
   ```

4. Add a Notes icon SVG to the icons collection. Use a simple document/file icon from the Heroicons set (outline style, matching the existing `strokeWidth={1.6}` convention).

5. Do NOT modify `AppLayout` yet. The only allowed `Navigation.tsx` change in this step is the icon extraction import described above. ActivityBar integration happens in Step 03.

6. Validate:
   - `pnpm --filter @srgnt/desktop typecheck` passes
   - The component renders correctly in isolation (can be tested by temporarily importing it)
   - All buttons have `aria-label` attributes and `aria-pressed` (not `aria-selected` or `role="tab"`)
   - Keyboard navigation works: Arrow keys cycle focus, Tab moves out of toolbar
   - Active indicator renders on the selected item
   - The three groups (main, system, utility) are visually separated
   - The `icons.tsx` module exports all icons and `Navigation.tsx` still works with its import

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation|STEP-13-01 Create ActivityBar component with accessible icon-only navigation]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
