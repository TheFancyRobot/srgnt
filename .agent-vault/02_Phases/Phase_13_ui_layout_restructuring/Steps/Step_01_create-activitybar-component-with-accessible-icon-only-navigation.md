---
note_type: step
template_version: 2
contract_version: 1
title: Create ActivityBar component with accessible icon-only navigation
step_id: STEP-13-01
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-30-052634-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-052634 OpenCode session for Create ActivityBar component with accessible icon-only navigation]]'
  - '[[05_Sessions/2026-03-30-151255-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-151255 OpenCode session for Create ActivityBar component with accessible icon-only navigation]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Create ActivityBar component with accessible icon-only navigation

## Purpose

- Outcome: A standalone `ActivityBar` component that renders a narrow (~48px) vertical strip of icon-only buttons following the WAI-ARIA toolbar pattern. This replaces the icon+label navigation currently embedded in `Navigation.tsx`.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

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

## Required Reading

- `packages/desktop/src/renderer/components/Navigation.tsx` -- understand current icon map, nav item types, and active indicator styling
- `packages/desktop/src/renderer/styles.css` -- understand current nav-item CSS including active state indicator bar
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]] -- canonical view list and navigation principles
- WAI-ARIA Toolbar Pattern: the toolbar should use `role="toolbar"`, `aria-orientation="vertical"`, and roving tabindex where only the focused button has `tabindex="0"` and all others have `tabindex="-1"`

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

## Edge Cases

- If `items` array is empty, render an empty toolbar with no buttons (no crash).
- If `activeId` is `null` or doesn't match any item, no button gets `aria-pressed="true"` and `focusedIndex` starts at 0.
- If only one item exists, ArrowUp/ArrowDown stay on that item (wrap to self).

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

## Security Considerations

- Not applicable. This is a pure presentational component with no data handling, IPC calls, or user input beyond click/keyboard navigation.

## Performance Considerations

- Not applicable. The ActivityBar renders a small fixed number of buttons (~6). No lists, virtualization, or expensive computations needed.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-01.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- The user specifically called out accessibility for the icon-only menu. This is a hard requirement, not optional polish.
- Icon extraction to `icons.tsx` is specified in the execution prompt. Create the shared module first, verify Navigation still works, then build ActivityBar.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-052634-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-052634 OpenCode session for Create ActivityBar component with accessible icon-only navigation]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-151255-create-activitybar-component-with-accessible-icon-only-navigation-opencode|SESSION-2026-03-30-151255 OpenCode session for Create ActivityBar component with accessible icon-only navigation]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
