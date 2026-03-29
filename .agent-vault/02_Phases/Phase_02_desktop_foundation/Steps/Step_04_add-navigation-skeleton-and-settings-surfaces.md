---
note_type: step
template_version: 2
contract_version: 1
title: Add Navigation Skeleton And Settings Surfaces
step_id: STEP-02-04
phase: '[[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-02-02
  - STEP-02-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Add Navigation Skeleton And Settings Surfaces

Build the shell-level navigation and placeholder surfaces that later milestones will fill in.

## Purpose

- Give the desktop product a stable IA and screen skeleton for Today, Calendar, Inbox, Artifacts, Integrations, Runs, and Settings.
- Ensure the base shell proves more than a blank window before deeper runtime and connector work lands.

## Why This Step Exists

- The framework defines the major product surfaces early.
- Later workflow and integration phases are easier to validate when they attach to real shell routes and panels.

## Prerequisites

- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]].
- Complete [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- `packages/runtime/`
- desktop smoke/manual QA scripts chosen in Step 01

## Required Reading

- [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Implement the navigation skeleton and top-level placeholder screens named in the framework.
2. Hook the shell to workspace bootstrap state and one safe preload-mediated capability so the app proves the privilege boundary in practice.
3. Keep the surfaces intentionally thin; do not smuggle connector or workflow logic into this step.
4. Add a manual smoke path that verifies route changes, settings shell, and integrations shell all render inside the desktop app.
5. Validate with the desktop smoke script and a manual route walk-through.
6. Update notes with the final screen list and any deferred IA question.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

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

## Human Notes

- Placeholder surfaces are fine here, but the IA should not need a rewrite when Phases 04-06 land.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means later milestones have real shell surfaces to attach to.
- Validation target: the app can open and navigate between the planned top-level screens.
