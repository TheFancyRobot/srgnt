---
note_type: phase
template_version: 2
contract_version: 1
title: UI Layout Restructuring
phase_id: PHASE-13
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_12_brand_alignment/Phase|PHASE-12 Brand Alignment]]'
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]'
  - '[[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]'
related_decisions:
  - '[[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract]]'
related_bugs: []
tags:
  - agent-vault
  - phase
completed_at: '2026-03-30'
---

# Phase 13 UI Layout Restructuring

Restructure the desktop app from a two-panel layout (sidebar + content) to a three-panel Obsidian-style layout (icon-only activity bar + context-dependent side panel + main content area), preserving the existing visual identity and aesthetic while creating a modular, extensible shell for future connectors and dashboards.

## Objective

- Replace the current `w-56` sidebar+content layout with a three-column layout: a narrow icon-only activity bar (leftmost), a configurable/collapsible context-dependent side panel (middle), and the main content area (right).
- The activity bar provides icon-only navigation with full WAI-ARIA accessibility (toolbar pattern, roving tabindex, tooltips).
- The side panel adapts its content based on the active activity bar selection and can be collapsed, resized, or completely removed.
- Default activity bar items with no connectors installed: Daily Dashboard, Calendar, Notes, and Terminal (visually separated at the bottom).
- The layout must be designed with future modularity in mind: connectors will register their own activity bar icons and side panel content in later phases. This phase does not implement the plugin/connector registration system, but the architecture must not preclude it.

## Why This Phase Exists

- The current two-panel layout uses a fixed 224px sidebar that shows both icons and labels. This works for a small number of views but does not scale to a modular application where users pick and choose connectors, dashboards, and automations.
- The Obsidian-style three-panel layout (ribbon + side panel + content) is a proven pattern used by VS Code, JetBrains, Obsidian, and Figma. It provides a dense, keyboard-friendly workspace that scales from 5 to 50+ views without cluttering the primary navigation.
- The side panel column is where the layout gains real flexibility: different views can show completely different secondary navigation (file trees, section links, date pickers, connector-specific browsers) while the activity bar stays minimal and scannable.
- The existing aesthetic (brand palette, typography, animations, grain texture) is well-liked and must be preserved exactly. This phase changes layout structure, not visual identity.

## Scope

- **Activity bar**: New `ActivityBar` component replacing the current sidebar navigation. Icon-only, ~48px wide, vertical strip. WAI-ARIA `role="toolbar"` with `aria-orientation="vertical"`, roving tabindex, `aria-label` on every button, native tooltips. Main items grouped at top, terminal separated at bottom with a visual divider.
- **Side panel**: New `SidePanel` component that renders context-dependent content based on the active activity bar selection. Configurable width via CSS variables, collapsible with smooth transition. Resize handle for user-adjustable width.
- **Layout context**: New `LayoutContext` React context provider managing active panel ID, sidebar collapsed state, sidebar width, and panel toggle behavior (clicking the active icon collapses the side panel, VS Code style).
- **View-specific side panel content**:
  - Today: section navigation links (scrolls to Blockers, Priorities, Schedule, Attention sections)
  - Calendar: year/month selector for date navigation
  - Notes: placeholder file/folder tree scaffold (content deferred to future phase)
  - Terminal: side panel auto-collapses or shows minimal session info
  - Connectors: list of installed connectors with status indicators
  - Settings: settings category navigation
- **AppLayout refactor**: Replace the current two-column flexbox in `AppLayout` with three columns. Preserve Titlebar. Keep `fullBleed` mode for terminal.
- **Notes placeholder main view**: Add a simple `NotesView` placeholder so the new `notes` activity item has a real main-content route in Phase 13 before Phase 14 replaces it with the actual notes experience.
- **CSS variables**: Add `--activity-bar-width`, `--sidebar-width`, `--sidebar-min-width`, `--sidebar-max-width` to `styles.css`.
- **Persistence**: Sidebar width and collapsed state persisted to desktop settings.
- **Tests**: Update existing Navigation/AppLayout tests, add accessibility tests for activity bar keyboard navigation.

## Non-Goals

- Implementing the connector/plugin registration system (that is a future phase; this phase designs the layout so it can be added later).
- Redesigning individual view content (TodayView, CalendarView, etc. stay as-is internally).
- Adding new views beyond what currently exists (Notes view will be a scaffold/placeholder only).
- Changing the brand palette, typography, animations, or grain texture (Phase 12 already locked these).
- Building a secondary/right-side panel or bottom panel (those are future layout additions if needed).
- Adding `react-resizable-panels` or other dependencies; keep the resize handle implementation minimal and dependency-free for now.

## Dependencies

- Depends on [[02_Phases/Phase_12_brand_alignment/Phase|PHASE-12 Brand Alignment]] (brand identity is final; we build on top of it).
- References [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]] for canonical view list and IA principles.
- References [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009]] for renderer stack (React 18, Tailwind 3, Vite).
- Most UI work is in `packages/desktop/src/renderer/`, but Step 05 also updates `packages/contracts/src/ipc/contracts.ts`, `packages/desktop/src/main/settings.ts`, and related tests because layout preferences cross the renderer/main-process settings boundary.

## Acceptance Criteria

- [x] The app renders a three-column layout: icon-only activity bar (leftmost) + collapsible side panel (middle) + main content (right).
- [x] The activity bar uses WAI-ARIA toolbar pattern with roving tabindex; every icon button has `aria-label` and a native tooltip.
- [x] Default activity bar items are: Daily Dashboard, Calendar, Notes (main group) and Terminal (separated at bottom). Connectors and Settings appear in a system group between main and terminal.
- [x] Clicking an activity bar icon shows the corresponding side panel content and main content.
- [x] Selecting `notes` renders both a placeholder side panel scaffold and a placeholder main-content view so the new route is real in Phase 13.
- [x] Clicking the already-active activity bar icon toggles the side panel collapsed/expanded.
- [x] The side panel is resizable by dragging a resize handle, with min/max width constraints.
- [x] The side panel can be completely collapsed (width goes to 0, only activity bar + content remain).
- [x] Sidebar width and collapsed state persist across app restarts via desktop settings.
- [x] Keyboard shortcut (Ctrl+B / Cmd+B) toggles side panel visibility.
- [x] All existing views (Today, Calendar, Terminal, Connectors, Settings) continue to render correctly in the new layout.
- [x] The global side panel becomes the primary section navigation for Settings; Phase 13 removes the duplicated in-view Settings left rail instead of shipping two competing navigation systems.
- [x] Terminal `fullBleed` mode still fills the entire content area.
- [x] The existing visual identity (colors, fonts, animations, grain) is preserved pixel-perfectly.
- [x] Existing tests pass, and new tests cover activity bar keyboard navigation and layout context state.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_12_brand_alignment/Phase|PHASE-12 Brand Alignment]]
- Current phase status: complete
- Next phase: [[02_Phases/Phase_14_notes_view/Phase|PHASE-14 Notes View]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]
- [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0009_freeze-renderer-stack-and-routing-contract-for-desktop-v1|DEC-0009 Renderer stack and routing contract]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_01_create-activitybar-component-with-accessible-icon-only-navigation|STEP-13-01 Create ActivityBar component with accessible icon-only navigation]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_02_create-layoutcontext-provider-and-sidepanel-component|STEP-13-02 Create LayoutContext provider and SidePanel component]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell|STEP-13-03 Refactor AppLayout to three-panel shell]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content|STEP-13-04 Implement view-specific side panel content]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors|STEP-13-05 Persist layout preferences and add collapse behaviors]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_06_update-tests-and-verify-accessibility|STEP-13-06 Update tests and verify accessibility]] -- complete
- [x] [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_07_optimize-renderer-bundle-splitting-and-lazy-load-terminal-surface|STEP-13-07 Optimize renderer bundle splitting and lazy-load terminal surface]] -- complete
<!-- AGENT-END:phase-steps -->

## Notes

- **Design reference**: The Obsidian screenshot provided by the user shows the exact three-panel pattern: icon-only ribbon (leftmost), file tree side panel (middle), note content (right). The VS Code activity bar and JetBrains tool window stripes follow the same pattern.
- **Aesthetic preservation**: The user explicitly stated they like the current aesthetic and do not want it changed. This phase changes only layout structure (how panels are arranged), not visual identity (colors, fonts, animations, textures).
- **Future modularity**: The layout must be designed so that future connector phases can register activity bar icons and side panel content without modifying the core layout components. The LayoutContext panel registry pattern (registering panel definitions with id, icon, label, component, section, order) enables this. This phase implements the registry; future connector phases call `registerPanel()`.
- **Middle column configurability**: The side panel must be completely optional. Some views may not need it (Terminal). Users may prefer to collapse it permanently for a minimal two-panel experience. The `data-collapsed` CSS approach with `width: 0` + `overflow: hidden` handles this cleanly.
- **Parallel work map**: Steps 01 and 02 can run in parallel (ActivityBar component and LayoutContext/SidePanel are independent modules). Step 03 integrates them into AppLayout (depends on both). Steps 04 and 05 can run in parallel after Step 03. Step 06 is the final integration and accessibility verification step.
- **No new dependencies**: The resize handle will use a custom `useResizable` hook (mousedown/mousemove/mouseup) rather than adding `react-resizable-panels`. Keep the dependency footprint minimal.
- **Keyboard shortcut**: Ctrl+B (Linux/Windows) / Cmd+B (macOS) toggles the side panel, matching VS Code's well-known convention. For this phase the shortcut remains global, including when the terminal surface is focused.
- **Refinement decisions locked during review**:
  - Phase 13 ships a placeholder `NotesView` main-content route now; it does not defer the route until Phase 14.
  - The new global side panel replaces the current in-view Settings navigation; do not ship both navigation systems at once.
  - Persist only side-panel width and collapsed state in Phase 13. The active panel always starts from the app default route unless another workflow explicitly redirects the app at runtime.
- **Post-audit follow-up**: Step 07 completed the remaining renderer bundle work by lazy-loading the terminal route and isolating `ghostty-web` into a dedicated runtime chunk. Phase 13 is now complete again with startup bundle health restored.
- **Code-path map for the phase**:
  - Layout shell and navigation state: `packages/desktop/src/renderer/components/Navigation.tsx`, `packages/desktop/src/renderer/main.tsx`, `packages/desktop/src/renderer/styles.css`
  - View-specific side panels and target views: `packages/desktop/src/renderer/components/TodayView.tsx`, `CalendarView.tsx`, `ConnectorStatus.tsx`, `Settings.tsx`, `TerminalPanel.tsx`
  - Settings persistence boundary: `packages/contracts/src/ipc/contracts.ts`, `packages/desktop/src/main/settings.ts`, `packages/desktop/src/renderer/main.tsx`
  - Validation fallout: `packages/desktop/src/main/settings.test.ts`, `packages/contracts/src/ipc/contracts.test.ts`, `packages/desktop/e2e/app.spec.ts`, `packages/desktop/e2e/fixtures.ts`
