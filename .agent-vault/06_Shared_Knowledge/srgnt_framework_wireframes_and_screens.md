---
note_type: shared_knowledge
title: Wireframes and Screen Specifications
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - ux
  - wireframes
---

## 11. Low-Fidelity Wireframes and Screen Specifications

### Shell design update
These wireframes should now be interpreted through the preferred desktop shell pattern for the product:
- **far-left primary icon rail** for global navigation
- **optional secondary left pane** for section-specific navigation, filters, or lists
- **large center work surface** as the primary focus area
- **optional right-side inspector** for metadata, lineage, and related objects
- **persistent bottom utility panel** for terminal, active runs, logs, and approvals

This shell is inspired in part by modern multi-pane desktop apps, but should be optimized for a command-center operations workspace rather than a chat-first interface.

### Purpose
Provide implementation-friendly wireframe-level specifications for the core desktop v1 screens.

These are intentionally low-fidelity and product-structural rather than visual-design-final. The goal is to give engineering and AI coding agents enough clarity to:
- understand layout hierarchy
- identify required components
- understand object relationships
- implement screens iteratively

### Shared desktop shell

#### Global layout

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Workspace / Global Search / Command Palette / Status / Profile        │
├───────┬──────────────────────┬───────────────────────────────────┬─────────────┤
│ Rail  │ Secondary Pane       │ Main Work Surface                  │ Inspector   │
│ Icons │ (optional)           │                                    │ (optional)  │
│       │ - sub-navigation     │ active screen content              │ details     │
│ T     │ - filters            │                                    │ metadata    │
│ C     │ - lists              │                                    │ lineage     │
│ I     │ - saved views        │                                    │ related objs│
│ W     │                      │                                    │ quick acts  │
│ A     │                      │                                    │             │
│ D     │                      │                                    │             │
│ R     │                      │                                    │             │
│ I     │                      │                                    │             │
│ S     │                      │                                    │             │
├───────┴──────────────────────┴───────────────────────────────────┴─────────────┤
│ Bottom Utility: Terminal / Active Run / Logs / Approvals                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Shared shell behavior
- primary icon rail is always visible
- secondary pane appears only when the selected primary section benefits from additional structure
- inspector can be collapsed or expanded based on context needs
- bottom utility panel can be collapsed, resized, or switched between tabs
- command palette opens globally
- search is cross-object and object-aware
- selected object should update the inspector when relevant
- center work surface should remain visually dominant

#### Shared shell components
- workspace switcher or workspace title
- global search bar
- command palette trigger
- primary icon rail with tooltips and keyboard shortcuts
- optional secondary pane controls
- global status indicators
  - connector freshness
  - sync state later
  - active run indicator
- profile/settings trigger
- inspector toggle
- bottom utility tabs

---

## Screen 1: Today

### Purpose
Operational home screen showing what matters now.

### Wireframe

```text
┌──────────────────────────────── TODAY ──────────────────────────────────────┐
│ Header: Date | Quick actions | Generate briefing | Open terminal            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Daily Briefing Summary Card                                                │
│ - top priorities                                                           │
│ - key meetings                                                             │
│ - blockers / watch items                                                   │
│ - suggested next actions                                                   │
├───────────────────────┬───────────────────────────────┬─────────────────────┤
│ Schedule Snapshot     │ Priority Follow-Ups           │ Pending Approvals   │
│ - next meetings       │ - open items                  │ - approval cards    │
│ - conflicts           │ - due soon                    │ - approve / reject  │
│ - prep needed         │ - blocked items               │                     │
├───────────────────────┴───────────────────────────────┴─────────────────────┤
│ Watch Items / Risks                                                        │
│ - drifted projects                                                         │
│ - unresolved blockers                                                      │
│ - waiting-on items                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Recent Important Runs                                                      │
│ - latest workflow runs                                                     │
│ - failures / partials                                                      │
│ - open output artifacts                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- page header
- daily briefing summary card
- schedule snapshot card/list
- follow-up list
- approval queue preview
- watch items list
- recent runs list

### Key interactions
- open latest briefing artifact
- launch daily briefing workflow
- launch meeting-prep workflow from upcoming event
- open follow-up details
- approve/reject request
- open failed run
- jump to Calendar / Inbox / Runs

### Required data
- latest daily briefing artifact
- today's events
- open follow-ups
- pending approvals
- active watch items
- recent runs
- connector freshness summary

### Right context panel behavior
When an object is selected, show:
- metadata
- related artifacts
- related entities
- related run history
- quick actions

---

## Screen 2: Calendar

### Purpose
Time-based operational planning and meeting coordination.

### Wireframe

```text
┌────────────────────────────── CALENDAR ─────────────────────────────────────┐
│ Header: Today | Day / Week / Agenda | Filters | New follow-up | Prep run   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Calendar Grid / Agenda                                                     │
│                                                                             │
│  Time    Mon        Tue        Wed        Thu        Fri                   │
│  8:00    [event]    [event]               [event]    [event]               │
│  9:00    [event]    [prep]     [event]    [event]                          │
│ 10:00               [focus]    [event]               [event]               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Selected Event Strip / Detail Preview                                      │
│ - title, time, source                                                      │
│ - linked artifact(s)                                                       │
│ - prep status                                                              │
│ - follow-ups                                                               │
│ - open source / open artifact / run prep workflow                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- calendar header controls
- day/week/agenda switcher
- calendar grid or agenda list
- event detail preview
- filter controls
- event source indicator

### Key interactions
- switch between day/week/agenda
- click event to open detail
- launch meeting-prep workflow
- create follow-up from event
- open linked artifact
- open source-provider reference
- filter by connector/source or event type

### Required data
- canonical events
- linked artifacts by event
- follow-ups linked to event
- event-related runs
- prep status / missing-prep state

### Right context panel behavior
Selected event shows:
- participants
- description/notes when available
- related artifacts
- related follow-ups
- recent runs related to this event
- source metadata

---

## Screen 3: Inbox

### Purpose
Triage center for new or unresolved incoming work.

### Wireframe

```text
┌──────────────────────────────── INBOX ──────────────────────────────────────┐
│ Header: Filters | Group by | Triage mode | Bulk actions                    │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ Inbox Queues          │ Item List                                           │
│ - All New             │ [Item card]                                         │
│ - High Priority       │ [Item card]                                         │
│ - Connector Issues    │ [Item card]                                         │
│ - Suggested Followups │ [Item card]                                         │
│ - Event Prep Needed   │                                                     │
├───────────────────────┴─────────────────────────────────────────────────────┤
│ Selected Item Action Bar                                                    │
│ - Convert to Follow-Up | Convert to Watch Item | Attach to Artifact         │
│ - Snooze | Dismiss | Open Source                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- inbox queue list
- inbox item list/cards
- triage action bar
- filter/group controls

### Key interactions
- triage item
- convert to follow-up
- convert to watch item
- attach item to existing artifact
- snooze/dismiss
- open source context
- open related event/task/thread

### Required data
- inbox items
- source references
- related canonical entities
- candidate target artifacts
- current follow-ups/watch items

### Right context panel behavior
Selected inbox item shows:
- summary
- why it was surfaced
- source object details
- related artifacts/follow-ups
- triage suggestions

---

## Screen 4: Workflows

### Purpose
Launchpad for reusable operational procedures.

### Wireframe

```text
┌────────────────────────────── WORKFLOWS ────────────────────────────────────┐
│ Header: Search | Categories | Recently Run | Scheduled                      │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ Categories            │ Workflow Cards                                      │
│ - Daily Ops           │ [Daily Briefing]                                    │
│ - Meetings            │ [Meeting Prep]                                      │
│ - Reviews             │ [Risk Summary]                                      │
│ - Reporting           │ [Follow-up Generator]                               │
│ - Triage              │                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Selected Workflow Detail                                                    │
│ - description                                                               │
│ - required connectors/capabilities                                          │
│ - latest outputs                                                            │
│ - recent runs                                                               │
│ - Run now / Open in terminal / Configure                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- workflow category sidebar
- workflow cards
- workflow detail panel
- run/configure actions

### Key interactions
- run workflow now
- open terminal-backed workflow execution
- inspect required connectors
- open recent output artifact
- inspect recent run history

### Required data
- workflows
- skill installations
- required capabilities
- recent runs by workflow
- latest produced artifacts

### Right context panel behavior
Selected workflow shows:
- required capabilities
- connected sources available
- approval mode
- last run
- output artifact types

---

## Screen 5: Artifacts

### Purpose
Browse and manage durable operational outputs.

### Wireframe

```text
┌────────────────────────────── ARTIFACTS ────────────────────────────────────┐
│ Header: Search | Filters | Status | Type | New Artifact                     │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ Artifact Filters      │ Artifact List                                       │
│ - Active              │ [Artifact row/card]                                 │
│ - Reviewed            │ [Artifact row/card]                                 │
│ - Needs Follow-Up     │ [Artifact row/card]                                 │
│ - Archived            │                                                     │
│ - By Type             │                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Selected Artifact Preview                                                   │
│ - title / type / status                                                     │
│ - summary snippet                                                           │
│ - source lineage                                                            │
│ - related follow-ups                                                        │
│ - producing run                                                             │
│ - Open / Change status / Create follow-up / Archive                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- artifact filters
- artifact list
- artifact preview pane
- status actions

### Key interactions
- open artifact
- change artifact status
- create follow-up
- inspect lineage
- open producing run
- archive artifact

### Required data
- artifact metadata
- artifact content preview
- related follow-ups
- related entities
- producing run
- artifact status

### Right context panel behavior
Selected artifact shows:
- metadata
- lineage graph/light lineage list
- linked events/tasks/messages
- related follow-ups
- recent edits/updates later

---

## Screen 6: Runs

### Purpose
Execution history, automation health, and approval visibility.

### Wireframe

```text
┌──────────────────────────────── RUNS ───────────────────────────────────────┐
│ Header: Filters | Status | Workflow | Needs Approval | Failed               │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ Run Filters           │ Run List                                            │
│ - All                 │ [Run row]                                           │
│ - Running             │ [Run row]                                           │
│ - Awaiting Approval   │ [Run row]                                           │
│ - Failed              │ [Run row]                                           │
│ - Completed           │                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Selected Run Detail                                                        │
│ - status / timeline                                                         │
│ - related workflow                                                          │
│ - artifacts produced                                                        │
│ - side effects                                                              │
│ - logs summary                                                              │
│ - Retry / Open artifact / Approve                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- run filters
- run list
- run detail panel
- approval actions
- log summary view

### Key interactions
- inspect run details
- open logs
- approve/reject pending action
- retry run
- open produced artifacts
- open terminal session if associated

### Required data
- run records
- run status
- approval requests
- artifacts by run
- logs summaries
- side effect records

### Right context panel behavior
Selected run shows:
- timestamps
- workflow/executor info
- produced artifacts
- related approvals
- related source inputs snapshot summary

---

## Screen 7: Integrations

### Purpose
Configure and trust external system connectivity.

### Wireframe

```text
┌──────────────────────────── INTEGRATIONS ───────────────────────────────────┐
│ Header: Add Connector | Sync All | Filters                                  │
├───────────────────────┬─────────────────────────────────────────────────────┤
│ Connector List        │ Selected Connector Detail                            │
│ - Jira                │ - auth status                                       │
│ - Outlook Calendar    │ - freshness                                         │
│ - Teams               │ - last sync                                         │
│                       │ - capabilities                                      │
│                       │ - errors/issues                                     │
│                       │ - Configure / Re-auth / Sync Now                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Primary components
- connector list
- connector detail panel
- auth/sync actions
- health/freshness indicators

### Key interactions
- install connector
- authenticate/re-authenticate
- sync now
- inspect capabilities
- inspect errors/issues

### Required data
- connector installations
- auth state
- freshness state
- error state
- capabilities
- sync metadata

### Right context panel behavior
Selected connector shows:
- installation metadata
- supported object types
- capabilities
- recent issues
- linked workflows depending on this connector

---

## Bottom Panel: Terminal / Run / Logs Zone

### Purpose
Persistent execution surface integrated with the workspace.

### Wireframe

```text
┌──────────────────── BOTTOM PANEL: Terminal / Run / Logs ────────────────────┐
│ Tabs: Terminal | Active Run | Logs | Approvals                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Terminal tab: PTY session                                                   │
│ Active Run tab: current execution state                                     │
│ Logs tab: recent structured run logs                                        │
│ Approvals tab: pending approvals queue                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key interactions
- open new terminal session
- attach terminal session to workflow/run
- inspect active run state
- switch quickly between logs and approvals
- expand/collapse bottom panel

### Required data
- terminal session state
- active run state
- recent logs
- approval requests

---

## Cross-Screen UX Rules

### Object selection model
When a user selects a row/card/event/artifact/run:
- center pane updates active selection
- right context panel updates with related details
- command palette actions should operate on selected object where possible

### Status visibility model
Where relevant, show status inline for:
- artifact status
- run status
- follow-up status
- approval status
- connector freshness
- prep-needed state for events

### Relationship visibility model
Every major object should make it easy to answer:
- what produced this?
- what is this related to?
- what follow-up exists?
- what ran recently?
- what is waiting on me?

### Empty-state philosophy
Empty states should teach workflow, not just say "nothing here."

Examples:
- Today: "Run your first daily briefing"
- Calendar: "Connect a calendar-capable source to populate events"
- Workflows: "Install or enable your first workflow"
- Artifacts: "Artifacts appear here after workflow runs"
- Runs: "Runs appear here when workflows or terminal-linked actions execute"

---

## Revised Desktop Shell Guidance

### Primary icon rail
Recommended top-level destinations in the rail:
- Today
- Calendar
- Inbox
- Workflows
- Artifacts
- Dashboards
- Runs
- Integrations
- Settings

### Secondary pane examples
Use the secondary pane selectively:
- Calendar → view mode, calendars/sources, saved filters
- Inbox → queues, grouping, triage filters
- Workflows → categories, recent, scheduled
- Artifacts → status filters, types, saved views
- Dashboards → dashboard list, pinned dashboards
- Runs → run filters, status buckets
- Integrations → connector list

### Inspector behavior
The right inspector should be contextual and optional. It should show:
- metadata
- lineage
- related objects
- quick actions
- source references

### Bottom utility panel
Recommended tabs:
- Terminal
- Active Run
- Logs
- Approvals

## Suggested Build Order for Screens

### First-wave screens
1. shared desktop shell
2. Today
3. Calendar
4. Workflows
5. Artifacts
6. Runs
7. Integrations
8. Inbox
9. Dashboards

### Why this order
- Today + Calendar establish the daily-use value
- Workflows establishes the action surface
- Artifacts + Runs establish accountability and output visibility
- Integrations establishes trust in source freshness
- Inbox can be layered once triage logic is maturing

---

## Summary
These wireframes define a desktop experience centered on a multi-pane command-center shell, operational awareness, workflow execution, artifact management, run visibility, and integrated terminal-based agent activity. The product should feel like an operations cockpit rather than a notes app, a generic dashboard shell, or a chat-first client.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]
- [[06_Shared_Knowledge/srgnt_framework_component_inventory_and_data_contracts|Screen Component Inventory and Data Contracts]]
