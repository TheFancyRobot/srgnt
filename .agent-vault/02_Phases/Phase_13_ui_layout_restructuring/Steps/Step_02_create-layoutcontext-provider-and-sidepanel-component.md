---
note_type: step
template_version: 2
contract_version: 1
title: Create LayoutContext provider and SidePanel component
step_id: STEP-13-02
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: completed
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Create LayoutContext provider and SidePanel component

## Purpose

- Outcome: A `LayoutContext` React context provider that manages the three-panel layout state, and a `SidePanel` shell component that renders context-dependent content with resize and collapse capabilities.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Why This Step Exists

- The layout needs centralized state management for which panel is active, whether the side panel is collapsed, and the side panel width. A React context is the right tool because multiple distant components (ActivityBar, SidePanel, AppLayout, individual views) need to read and write this shared state.
- The side panel must support three key behaviors: switching content based on active view, resizing by drag, and collapsing/expanding. Building these as a reusable shell component keeps the layout logic separate from view-specific content.
- The panel registry pattern (registering panel definitions by ID) is designed so future connector phases can add their own panels without modifying core layout code.

## Prerequisites

- No prior steps required; this step can start immediately and run in parallel with Step 01.
- Understanding of the current navigation state management in `main.tsx` (the `currentView` state and `handleNavigate` callback).

## Relevant Code Paths

- `packages/desktop/src/renderer/main.tsx` -- current `currentView` state, `handleNavigate`, `renderContent()` switch
- `packages/desktop/src/renderer/components/Navigation.tsx` -- `NavItem` interface, `canonicalNavItems` array
- `packages/desktop/src/renderer/styles.css` -- will receive new CSS variables and side panel styles
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` -- global keyboard shortcut behavior must remain compatible with the terminal surface

## Required Reading

- `packages/desktop/src/renderer/main.tsx` -- understand the full navigation state flow (lines 38, 147-157, 420-468)
- `packages/desktop/src/renderer/components/Navigation.tsx` -- understand `NavItem` interface and how items are categorized
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop renderer architecture

## Execution Prompt

1. Read `main.tsx` to understand the current `currentView` state management and view switching flow.

2. Create `packages/desktop/src/renderer/components/LayoutContext.tsx` with:

   **Panel definition type:**
   ```typescript
   export interface PanelDefinition {
     id: string;
     icon: React.ReactNode;
     label: string;
     sidePanelContent?: React.ComponentType;  // undefined = no side panel for this view
     section: 'main' | 'system' | 'utility';
     order: number;
     badge?: number | string;
   }
   ```

   **Context value type:**
   ```typescript
   export interface LayoutContextValue {
     // Panel state
     activePanel: string;
     setActivePanel: (id: string) => void;

     // Side panel state
     isSidebarCollapsed: boolean;
     setSidebarCollapsed: (collapsed: boolean) => void;
     toggleSidebar: () => void;
     sidebarWidth: number;
     setSidebarWidth: (width: number) => void;

     // Panel registry (for future connector extensibility)
     panels: PanelDefinition[];
     registerPanel: (panel: PanelDefinition) => void;
     unregisterPanel: (id: string) => void;
   }
   ```

   **Provider implementation:**
   - `LayoutProvider` component accepts `children`, `defaultPanel` (default: `'today'`), `initialWidth` (default: `240`), `initialCollapsed` (default: `false`), `initialPanels` (default: `[]`)
   - `initialPanels` allows Step 03 to pass default panel definitions synchronously at mount time, avoiding a flash of empty state from useEffect registration
   - The `setActivePanel` callback implements VS Code toggle behavior: if the user clicks the already-active panel, toggle the sidebar collapsed state instead of no-op
   - **Terminal auto-collapse**: When `setActivePanel` is called with a panel whose `sidePanelContent` is `undefined` (e.g., terminal), automatically set `isSidebarCollapsed = true`. When switching away from such a panel, restore the sidebar to its previous collapsed state (track a `userCollapsedPreference` boolean separately from the auto-collapse).
   - Panel registry initializes from `initialPanels` prop. `registerPanel` adds/replaces by ID and sorts by `order`. `unregisterPanel` removes by ID.
   - In Phase 13, `initialPanels` is the source of truth for the built-in views. `registerPanel` exists for future extensibility, but this step should not remove or dynamically reorder the built-in panel set beyond replacement-by-ID semantics.
   - Export a `useLayout()` hook that calls `useContext(LayoutContext)` with a guard that throws if used outside the provider
   - Keep this step focused on shell state. Do not add calendar month/year state here yet; Step 04 may extend the context deliberately once the calendar side-panel behavior is implemented.

    **Keyboard shortcut:**
    - Add a `useEffect` in `LayoutProvider` that listens for `keydown` on the document
    - Ctrl+B (Linux/Windows) or Cmd+B (macOS) toggles the sidebar
    - Use `e.metaKey` for macOS, `e.ctrlKey` for others; check `e.key === 'b'`
    - Prevent default to avoid browser bookmark shortcut
    - The shortcut stays global for Phase 13, including when the terminal surface is focused
    - Still ignore plain text-entry targets such as `input`, `textarea`, `select`, and `[contenteditable="true"]` so Settings form interactions are not interrupted

3. Create `packages/desktop/src/renderer/components/SidePanel.tsx` with:

   **Component structure:**
   - Accepts `children: React.ReactNode` (the view-specific content rendered inside)
   - Reads `isSidebarCollapsed` and `sidebarWidth` from `useLayout()`
   - Renders as a `<aside>` with `role="complementary"` and `aria-label="Side panel"`
   - **Width control (single mechanism):** Use the CSS class `.side-panel` with a CSS custom property `style={{ '--sidebar-width': sidebarWidth + 'px' } as React.CSSProperties}`. The CSS rule reads: `width: var(--sidebar-width)`. The `[data-collapsed="true"]` selector overrides to `width: 0 !important`. Do NOT also set an inline `width` — use only the data attribute and CSS custom property approach so there's one source of truth.
   - CSS transition on width for smooth collapse/expand animation (200ms)
   - `overflow: hidden` when collapsed to prevent content from showing
   - `border-right` matching the current sidebar border style (`border-border-default`)
   - Background: `bg-surface-primary` with `surface-gradient` (matching current sidebar)

   **Resize handle:**
   - A 4px wide `<div>` rendered at the right edge of the side panel, with a **12px hit target** (use `padding: 0 4px` or a transparent `::before` pseudo-element extending 4px on each side so the mouse target is wider than the visible indicator)
   - CSS: `cursor: col-resize`, `hover:bg-srgnt-400` with transition, `active:bg-srgnt-500`
   - Implement resize via `onMouseDown` handler:
     - On mousedown, capture `startX` and `startWidth`
     - Add `mousemove` listener to document: `newWidth = startWidth + (e.clientX - startX)`
     - Clamp to min (180px) and max (480px)
     - Use `requestAnimationFrame` to throttle width updates during drag if the resize feels janky
     - On mouseup, remove listeners and call `setSidebarWidth(finalWidth)`
     - Add `user-select: none` to body during drag to prevent text selection; remove on mouseup
    - The resize handle should be hidden when the sidebar is collapsed
    - Add `aria-label="Resize side panel"` and `role="separator"` with `aria-orientation="vertical"` to the handle
    - Make the handle focusable with `tabIndex={0}` so assistive tech can discover it
    - Keyboard resize on the handle is out of scope for this phase (resize is mouse/trackpad only)

4. Add CSS variables and side panel styles to `styles.css`:
   ```css
   :root {
     --activity-bar-width: 48px;
     --sidebar-width: 240px;
     --sidebar-min-width: 180px;
     --sidebar-max-width: 480px;
   }
   ```

   Add component styles:
   ```css
   .side-panel {
     flex-shrink: 0;
     width: var(--sidebar-width);
     transition: width 200ms cubic-bezier(0.16, 1, 0.3, 1);
     overflow: hidden;
     will-change: width;
   }

   .side-panel[data-collapsed="true"] {
     width: 0 !important;
     border-right-width: 0;
   }

   .resize-handle {
     width: 4px;
     flex-shrink: 0;
     cursor: col-resize;
     background: transparent;
     transition: background-color 150ms;
     position: relative;
   }

   .resize-handle:hover,
   .resize-handle:active {
     background-color: var(--color-srgnt-400);
   }

   .resize-handle:active {
     background-color: var(--color-srgnt-500);
   }
   ```

5. Do NOT modify `main.tsx` or `AppLayout` yet. The LayoutContext and SidePanel are standalone components in this step. Integration happens in Step 03.

6. Validate:
   - `LayoutProvider` initializes with correct defaults
   - `setActivePanel` with same ID toggles collapse
   - `setActivePanel` with different ID switches panel and uncollapses
   - `toggleSidebar` flips the collapsed state
   - `registerPanel` / `unregisterPanel` correctly manage the panel list
   - SidePanel renders at configured width when expanded and 0 width when collapsed
   - Resize handle drag updates the width within min/max bounds
   - Ctrl+B / Cmd+B toggles the sidebar
   - `pnpm --filter @srgnt/desktop typecheck` passes

## Edge Cases

- If `setSidebarWidth` is called with a value outside 180–480, the provider should clamp it to the valid range before storing.
- If `setActivePanel` is called with an ID not in the registry, ignore the call (don't crash or clear the active panel).
- During resize drag, if the mouse moves outside the window, the `mouseup` listener on `document` still fires and cleans up properly.
- The `Ctrl+B` / `Cmd+B` listener must remain active when the terminal surface is focused, but it must not fire while the user is typing in ordinary form controls such as `input`, `textarea`, `select`, or `[contenteditable="true"]`.

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

## Security Considerations

- Not applicable. LayoutContext manages UI state only — no IPC calls, no user data, no external communication.

## Performance Considerations

- The resize handler fires `mousemove` on every pixel. Use `requestAnimationFrame` to batch CSS updates to one per frame. Do NOT call `setSidebarWidth` on every mousemove — update a ref during drag and commit to state only on `mouseup` (or use rAF-throttled state updates).
- The `will-change: width` CSS property hints the browser to optimize the collapse/expand animation. Remove it after animation completes if you observe memory issues, but for a single panel this is fine.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- The panel registry pattern is forward-looking for connector extensibility. In this phase, panels are registered statically by the app. In future phases, connectors will call `registerPanel()` to add themselves dynamically.
- The resize handle should feel native-quality. Key details: prevent text selection during drag (add `user-select: none` to body), use `requestAnimationFrame` if drag feels janky, and make the hover target wider than the visual indicator (use a ::before pseudo-element or padding).

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
