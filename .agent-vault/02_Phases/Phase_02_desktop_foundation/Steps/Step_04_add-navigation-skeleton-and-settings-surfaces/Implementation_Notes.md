# Implementation Notes

- High-value top-level surfaces already named by the framework: Today, Calendar, Inbox, Workflows, Artifacts, Integrations, Runs.
### Refinement (readiness checklist pass)

**Inconsistency resolution:** The Purpose section lists "Today, Calendar, Inbox, Artifacts, Integrations, Runs, and Settings" but the canonical v1 navigation surfaces are:
1. **Today View** — the daily command center
2. **Calendar View** — date-based artifact/event navigation
3. **Settings** — app configuration
4. **Connector Management** — connector setup, auth status, enable/disable

The Purpose section's list (Inbox, Artifacts, Integrations, Runs, Workflows) represents post-v1 aspirational surfaces. This step should implement only the four canonical v1 surfaces above as routable placeholders, plus a sidebar/panel navigation skeleton that can accommodate future surfaces without restructuring.

**Exact outcome:**
- `packages/desktop/renderer/App.tsx` (or equivalent) — top-level layout with sidebar navigation
- `packages/desktop/renderer/routes/` — four route components: `TodayView.tsx`, `CalendarView.tsx`, `Settings.tsx`, `ConnectorManagement.tsx`
- Each route is a placeholder (title + "coming soon" or similar) — no real data fetching
- Sidebar component with navigation links to all four surfaces, with active-state highlighting
- Router setup (e.g., `react-router` or equivalent client-side routing within Electron renderer)
- At least one surface (e.g., Settings) calls a preload-mediated IPC capability to prove the shell integration from STEP-02-02 works end-to-end in a real surface

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — route names/paths could be typed, but not critical here
- DEC-0004 (macOS + Windows + Linux) — sidebar layout must not depend on macOS traffic-light button positioning; test on all platforms or use safe insets

**Starting files:**
- Completed STEP-02-02: working Electron shell with preload bridge
- Completed STEP-02-03: workspace layout contracts (Settings surface should reference workspace settings path)

**Constraints:**
- Do NOT implement real data fetching, connector logic, or workflow rendering — placeholders only
- Do NOT add surfaces beyond the four canonical v1 surfaces — future surfaces are added in later phases
- Do NOT couple navigation to runtime state — the shell should render even if the workspace is uninitialized
- Do NOT use Electron-specific navigation (multi-window, etc.) — use in-renderer routing

**Validation:**
1. `pnpm --filter desktop dev` boots and shows the sidebar with four navigation items
2. Clicking each navigation item renders the corresponding placeholder surface
3. Browser back/forward works within the Electron renderer
4. At least one surface makes a successful IPC call through the preload bridge
5. `pnpm typecheck` passes
6. Manual walkthrough: open app -> see Today View as default -> navigate to each surface -> return to Today

**Junior-readiness verdict:** PASS after inconsistency resolution — the step was ambiguous about which surfaces to build. With the canonical v1 list locked in (Today View, Calendar View, Settings, Connector Management), a junior dev can implement this cleanly. The sidebar/routing pattern is standard React work.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04 Add Navigation Skeleton And Settings Surfaces]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
