# Implementation Notes

- Calendar should consume normalized events from connectors, not own connector logic.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Calendar View component in `packages/desktop/renderer/` — a day/agenda view showing today's canonical events with: time, title, attendees, location, freshness indicator
- Event Detail panel — expandable view for a single event showing: full attendee list, agenda/notes (if available from raw metadata), related Jira tasks only when an explicit canonical cross-reference already exists, and meeting prep context
- Triage/follow-through surface — a lightweight list of events needing action (upcoming meetings without prep, past meetings without follow-up notes), with ability to mark items as `prepped` or `followedUp`
- Triage persistence path in the user workspace: `.command-center/state/triage/<canonical-event-id>.md` with YAML frontmatter storing the follow-through state so restart persistence has one canonical home
- All views driven by canonical event entities from PHASE-04, not connector-specific shapes
- Component tests for Calendar View and Event Detail (rendering canonical event data)
- Manual walkthrough documentation: at least one event-detail path and one follow-through triage path

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Component props typed from canonical event Zod schemas
- DEC-0004 (macOS + Windows + Linux): Calendar UI must render and be keyboard-navigable on all three platforms
- DEC-0007 (Dataview/markdown local data): Triage state (prepped/followed-up) is persisted as local file metadata, not in a database

**CRITICAL — Fred clarification:** Calendar detail and triage surfaces must be fully functional without Fred. Meeting prep context is assembled from connector data (attendee list, related Jira tasks by cross-reference, past meeting notes). Fred may later enhance meeting prep with AI-generated summaries, but this step produces useful output without any AI dependency.

**Starting files (must exist before this step runs):**
- Today workflow acceptance slice from STEP-05-01 (defines which calendar surfaces are in scope)
- Canonical event entities and freshness model from STEP-04-03 (Outlook Calendar connector)
- Desktop renderer shell from PHASE-02
- Canonical task entities from STEP-04-02 (for cross-referencing Jira tasks with meetings)

**Constraints:**
- Do NOT import connector-specific types in renderer components — consume canonical events only
- Do NOT build a full calendar month/week view — day/agenda view for today is sufficient for the wedge
- Do NOT introduce Fred/AI dependency for meeting prep
- Keep interaction model simple and keyboard-friendly (per Human Notes and per desktop-first UX)
- Do NOT build notification/reminder features — out of scope for this step
- Do NOT infer Jira-task links from fuzzy title matching or attendee heuristics in this step — show related tasks only when earlier phases created an explicit canonical cross-reference

**Validation:**
A junior dev verifies completeness by:
1. Opening the desktop app, navigating to Calendar View, and seeing today's events rendered from fixture data
2. Clicking/selecting an event and seeing the Event Detail panel with attendees, location, and any cross-referenced Jira tasks
3. Navigating to the triage surface and seeing events flagged as needing prep or follow-up
4. Marking an event as `prepped` and confirming the state persists across app restart in `.command-center/state/triage/`
5. Navigating the entire flow with keyboard only — no mouse required

**BLOCKER — STEP-02-03 dependency gap:** The step defines triage persistence as `.command-center/state/triage/<canonical-event-id>.md` with YAML frontmatter. The workspace bootstrap that creates this directory does not yet exist — STEP-02-03 has contracts but no implementation. Triage state will be in-memory only until STEP-02-03 lands. Accept this limitation for now but note it explicitly: triage state does not persist across app restarts until the workspace bootstrap is implemented.

**Junior-readiness verdict:** PASS — The step has clear surface boundaries (day view, event detail, triage list) and clear data sources (canonical events from PHASE-04). The main risk is scope creep into a full-featured calendar app — the constraint to build only day/agenda view keeps it focused.

## Related Notes

- Step: [[02_Phases/Phase_05_flagship_workflow/Steps/Step_03_build-calendar-detail-and-triage-surfaces|STEP-05-03 Build Calendar Detail And Triage Surfaces]]
- Phase: [[02_Phases/Phase_05_flagship_workflow/Phase|Phase 05 flagship workflow]]
