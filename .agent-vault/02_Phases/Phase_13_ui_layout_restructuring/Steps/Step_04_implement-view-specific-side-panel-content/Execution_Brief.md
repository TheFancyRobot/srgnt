# Execution Brief

## Why This Step Exists

- The side panel is where the Obsidian-style layout adds real value over the old two-panel design. It provides a secondary navigation layer that adapts per view: section links for the dashboard, a date picker for calendar, a file tree for notes, etc.
- Without view-specific content, the side panel is dead space and users will immediately collapse it. This step makes the panel earn its screen real estate.
- Each side panel content component should be lightweight and focused on navigation/filtering, not on rendering primary content (that stays in the main content area).

## Prerequisites

- Step 03 completed: the three-panel layout is wired up and views render correctly with placeholder side panel content.
- Understanding of each view's content structure (what sections exist, what navigation is useful).

## Relevant Code Paths

- `packages/desktop/src/renderer/components/TodayView.tsx` -- dashboard sections (Blockers, Priorities, Schedule, Attention)
- `packages/desktop/src/renderer/components/CalendarView.tsx` -- day agenda view with date header
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx` -- connector list
- `packages/desktop/src/renderer/components/Settings.tsx` -- settings sections
- `packages/desktop/src/renderer/components/TerminalPanel.tsx` -- terminal view
- `packages/desktop/src/renderer/components/LayoutContext.tsx` -- panel registry, `PanelDefinition.sidePanelContent`
- `packages/desktop/src/renderer/components/NotesView.tsx` -- placeholder main-content route added in Step 03 that must stay visually consistent with the notes side panel scaffold

## Execution Prompt

1. Read each view component to understand what secondary navigation makes sense.

2. Create side panel content components in `packages/desktop/src/renderer/components/sidepanels/`:

   **`TodaySidePanel.tsx` -- Dashboard section navigation:**
   - Render a list of section links that match the current Today headings exactly: "Blockers & Watch-outs", "Priorities", "Schedule", and "Attention Needed"
   - Each link is a button that scrolls the main content area to the corresponding section
   - Use `document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })` for scroll-to behavior
   - Add `id` attributes to the section `<h2>` elements in TodayView: `section-blockers`, `section-priorities`, `section-schedule`, and `section-attention-needed`
   - Show a count badge next to relevant sections (e.g., blocker count, unread count)
   - Style: vertical list with the same `nav-item` styling as the old sidebar, but within the side panel
   - Optional: highlight the currently visible section using an IntersectionObserver

   **`CalendarSidePanel.tsx` -- Year/month date navigator (FUNCTIONAL):**
   - Render current year and month prominently at the top
   - Year selector: left/right arrows to change year
   - Month grid: 3x4 grid of abbreviated month names (Jan, Feb, Mar...), clickable to navigate
   - Current month highlighted with brand color
   - Selected month highlighted with active indicator
   - **This is functional navigation, not a placeholder.** The selected month/year must update the CalendarView's displayed date.
   - **Implementation approach:** Extend `LayoutContext` in this step with `calendarYear` and `calendarMonth` so `CalendarSidePanel` and `CalendarView` can share one source of truth without introducing a second provider during the phase. Step 02 intentionally leaves this state out; Step 04 adds it once the calendar behavior is concrete.
   - CalendarView currently shows fixture data — the date selection won't change the fixtures, but it should update the date header displayed in CalendarView (e.g., showing "March 2026" vs "April 2026"). When real data arrives later, the date state will drive API calls.
   - This is a navigation control only; it doesn't render calendar event content (that stays in CalendarView).

   **`NotesSidePanel.tsx` -- Placeholder file/folder tree:**
   - Render a simple placeholder tree structure showing what will eventually be the notes file browser
   - Show a few static example folders and files to demonstrate the layout:
     ```
     > Workspace
       > Daily Briefings
       > Meeting Prep
       > Follow-ups
       > Artifacts
     ```
   - Each folder shows a chevron toggle and folder icon
   - Each file shows a document icon
   - Add a "Notes coming soon" subtle message at the bottom
   - This is scaffold only. The actual notes/file system integration is a future phase.
   - Style: match Obsidian's file tree density (compact, scrollable, indented with clear hierarchy)

   **`ConnectorsSidePanel.tsx` -- Connector list with status:**
   - Render the list of connectors with their connection status indicators
   - Reuse the status indicator styling from ConnectorStatus component
   - Each connector shows: icon/name + status dot (connected/disconnected)
   - Clicking a connector scrolls to it in the main Connectors view using `document.getElementById('connector-' + connectorId)?.scrollIntoView({ behavior: 'smooth' })`. Add `id={'connector-' + connector.id}` to the connector card wrapper in `ConnectorStatus.tsx`.

   **`SettingsSidePanel.tsx` -- Settings category navigation:**
   - Render a list of settings categories: General, Privacy, Connectors, Advanced
   - Matches the `settingsSections` array IDs from `main.tsx`
   - **Replace the existing internal Settings left rail in this step.** Update `Settings.tsx` so the main Settings view renders all sections in one scrollable column instead of keeping its own left-nav state. Phase 13 ships one settings section-navigation system: the global side panel.
   - Clicking a category scrolls the main Settings view to that section using `document.getElementById('settings-section-' + sectionId)?.scrollIntoView({ behavior: 'smooth' })`. Add `id={'settings-section-' + section.id}` to section headings in `Settings.tsx`.
   - **Current-section highlighting is a stretch goal**, not required. If time allows, use an `IntersectionObserver` on section headings to track which section is visible. If not, skip it — the scroll-to behavior alone is sufficient for this phase.

   **Terminal view:**
   - **No side panel content.** The side panel auto-collapses when terminal is active (handled by LayoutContext's auto-collapse logic from Step 02).
   - Set `sidePanelContent: undefined` in the terminal's panel definition. The SidePanel renders nothing and collapses automatically.

3. Update the `defaultPanels` array (created in Step 03) to include the `sidePanelContent` field for each panel definition. The panels were initially registered with placeholder side panel content; now replace with the real components:
   ```typescript
   // In the defaultPanels array (wherever Step 03 placed it)
   {
     id: 'today',
     icon: navIcons.today,
     label: 'Daily Dashboard',
     sidePanelContent: TodaySidePanel,  // was undefined placeholder
     section: 'main',
     order: 1,
   },
   // ... similarly for calendar, notes, connectors, settings
   // terminal keeps sidePanelContent: undefined (auto-collapse)
   ```

4. Update the `SidePanel` component or `AppLayout` to render the active panel's `sidePanelContent`:
   - Look up the active panel definition from context
   - If `sidePanelContent` is defined, render it as `<ActiveSidePanelContent />`
   - If `sidePanelContent` is undefined (e.g., terminal), render nothing or auto-collapse

5. Add `id` attributes to section headings for scroll-to-section behavior:
   - **TodayView.tsx**: `id="section-blockers"`, `id="section-priorities"`, `id="section-schedule"`, `id="section-attention-needed"` on the relevant `<h2>` or section wrapper elements
   - **Settings.tsx**: `id={'settings-section-' + section.id}` on each section heading (e.g., `settings-section-general`, `settings-section-privacy`)
   - **ConnectorStatus.tsx**: `id={'connector-' + connector.id}` on each connector card wrapper (e.g., `connector-jira`, `connector-outlook`)
   - **Naming convention**: kebab-case, prefixed by view name to avoid collisions (`section-*` for Today, `settings-section-*` for Settings, `connector-*` for Connectors)

6. Validate:
    - Each view shows appropriate side panel content when its activity bar icon is clicked
    - Today side panel: section links scroll the main content to the correct section
    - Calendar side panel: month grid renders, months are clickable, current month highlighted
    - Notes side panel: placeholder tree renders with correct indentation and styling
    - Connectors side panel: connector list with status dots renders
    - Settings side panel: category list renders with scroll-to behavior, and the main Settings view no longer renders its own competing left navigation rail
    - Terminal: side panel is collapsed or empty
    - Side panel content uses the same brand styling (fonts, colors, spacing) as the rest of the app
    - `pnpm --filter @srgnt/desktop typecheck` passes

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_04_implement-view-specific-side-panel-content|STEP-13-04 Implement view-specific side panel content]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
