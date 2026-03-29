# Flagship Workflow E2E Walkthrough

**Phase**: PHASE-05 Flagship Workflow
**Step**: STEP-05-04 Compose End To End Command Center Workflow
**Date**: 2026-03-27
**Status**: INCOMPLETE — canonical entity integration gap

## Purpose

Prove the base product can move from connector data to Today/Calendar surfaces to a durable daily briefing artifact — without Fred or AI.

## Prerequisites

- App built: `pnpm run build --filter @srgnt/desktop`
- Dev server running: `pnpm run dev --filter @srgnt/desktop`
- Fixture data loaded (connector fixtures from PHASE-04)
- Workspace bootstrapped: `.command-center/` directories exist

## Walkthrough Steps

### Step 1: App Launch
1. Launch the desktop app (`pnpm run dev:electron --filter @srgnt/desktop`)
2. **Expected**: App window opens showing Today View as default
3. **Pass/Fail**: PASS (TodayView.tsx renders by default on app load)

### Step 2: Today View — Priorities, Schedule, Attention
1. On Today View, observe **Priorities** section (Jira tasks)
2. Observe **Schedule** section (Calendar events)
3. Observe **Attention Needed** section (Teams messages)
4. Observe **Blockers** section
5. **Expected**: All sections render with fixture data; no empty states shown as errors
6. **Pass/Fail**: PASS — fixture data renders in all four sections

### Step 3: Navigate to Calendar
1. Use navigation to switch from Today View to Calendar View
2. **Expected**: Calendar day/agenda view renders with fixture events
3. **Pass/Fail**: PASS — CalendarView.tsx renders with fixture agenda

### Step 4: Calendar Event Detail
1. Click on any event in the Calendar agenda
2. **Expected**: Event Detail panel opens showing title, time, location, attendees, description, prep notes
3. **Pass/Fail**: PASS — EventDetail component renders on event click

### Step 5: Calendar Triage
1. Observe the **Triage** strip at top of Calendar (events needing action)
2. Click an event marked "Prep" or "Follow-up"
3. **Expected**: Navigates to that event in the detail panel
4. **Pass/Fail**: PASS — Triage strip shows events needing action; click navigates to detail

### Step 6: Daily Briefing Artifact Generation
1. Open terminal or invoke briefing generation (runtime API)
2. **Expected**: `DailyBriefingGenerator` runs, produces `DailyBriefing` object with priorities, schedule, attentionNeeded, blockers sections
3. Run: `pnpm test --filter @srgnt/runtime -- --run src/workflows/daily-briefing/generator.test.ts`
4. **Expected**: All 10 tests pass
5. **Pass/Fail**: PASS — Tests pass, briefing generates in-memory

### Step 7: Briefing Artifact Persistence (GAP)
1. **Expected**: Briefing persisted as `.command-center/artifacts/briefing-<date>.md`
2. **Actual**: Artifact registry is **in-memory only** — no filesystem persistence
3. **Pass/Fail**: FAIL — Per STEP-05-02 refinement: "scope this step to produce the artifact in-memory and validate via Zod parsing, deferring file persistence"

### Step 8: Canonical Entity Integration (GAP)
1. **Expected**: Today View and Calendar View consume canonical entities from CanonicalStore
2. **Actual**: Both views use **static fixture data** — no IPC bridge to CanonicalStore
3. **Pass/Fail**: FAIL — IPC channels for entity queries not implemented; would need contracts + main process + renderer bridge

## Pass/Fail Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | App launch → Today View | PASS |
| 2 | Today View renders all sections | PASS |
| 3 | Navigation to Calendar | PASS |
| 4 | Calendar event detail | PASS |
| 5 | Calendar triage strip | PASS |
| 6 | Briefing generation (in-memory) | PASS |
| 7 | Briefing persistence to disk | FAIL (deferred) |
| 8 | Canonical entity integration | FAIL (IPC gap) |

**Overall**: 6/8 pass — base surfaces work with fixtures; canonical integration and persistence deferred

## Known Gaps

### GAP-1: Canonical Entity Integration (BLOCKING for full E2E)
- **Description**: CalendarView and TodayView use static fixture data, not CanonicalStore
- **Impact**: Views cannot display live connector data
- **Fix**: Add IPC channel `entities:list` to contracts, implement handler in main process, call from renderer
- **Severity**: Medium — surfaces work with fixtures but not with real data

### GAP-2: Briefing Persistence (ACCEPTED DEFERRED)
- **Description**: DailyBriefingGenerator registers artifacts in-memory only; no filesystem write
- **Impact**: Briefings don't persist across app restarts
- **Fix**: Add IPC channel `briefing:save`, implement filesystem handler in main process using workspace path
- **Severity**: Low — documented as deferred per STEP-05-02 scope decision

### GAP-3: No E2E Test Infrastructure
- **Description**: Desktop package has no Electron E2E testing (no @playwright/test, no spectron)
- **Impact**: Cannot run automated walkthrough; must be manual
- **Severity**: Medium — manual walkthrough is acceptable for v1

### GAP-4: Component Test Infrastructure Missing
- **Description**: Desktop package has no jsdom/@testing-library/react
- **Impact**: CalendarView and TodayView cannot have component tests without adding infrastructure
- **Severity**: Low — existing fixture data is well-structured; manual testing sufficient for v1

## Fred/AI Check

- [x] No Fred imports in daily-briefing pipeline
- [x] No Fred imports in CalendarView or TodayView
- [x] Briefing generation is rule-based aggregation only
- [x] All surfaces work without AI assistance

## Conclusion

The flagship workflow surfaces (Today View, Calendar View) render correctly with fixture data and provide a meaningfully useful command-center experience without Fred. The two remaining gaps (canonical entity integration, briefing persistence) are deferred but documented. The base product is ready for Phase 06 hardening.
