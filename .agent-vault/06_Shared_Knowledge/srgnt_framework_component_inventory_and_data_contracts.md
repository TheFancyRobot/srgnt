---
note_type: shared_knowledge
title: Screen Component Inventory and Data Contract Checklist
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - architecture
  - components
---

## 12. Screen Component Inventory and Data Contract Checklist

### Query-language requirement note
The product should include a **Dataview-style local query capability** so that users, workflow builders, and dashboard builders can define understandable local queries over workspace data.

This query capability should:
- be local-first
- operate on workspace-derived indexed data
- support saved views and dashboard widgets
- query both file-backed artifacts and product-native workspace objects
- preserve compatibility with Dataview-like mental models where practical

This is a platform capability, not a screen-specific feature.

### Purpose
Provide a build-ready specification layer for the v1 desktop app by defining, for each major screen:
- primary components
- key props/data requirements
- loading/empty/error states
- core interactions
- object relationships
- runtime or backend dependencies

This is intended to help human engineers and AI coding agents move from product architecture into implementation planning.

## Shared Shell Component Inventory

### 1. AppShell
Purpose:
- host the global desktop layout
- coordinate rail, secondary pane, center content, inspector, and bottom utility panel

Key responsibilities:
- track active top-level route
- control layout visibility states
- provide global shortcuts and command palette access
- manage selected-object context for inspector

Key props/state:
- `activeRoute`
- `secondaryPaneState`
- `inspectorState`
- `bottomPanelState`
- `selectedObjectRef`
- `globalStatusSummary`

States:
- normal
- compact
- loading workspace
- degraded (one or more services stale)

Dependencies:
- routing layer
- workspace state
- global search
- command palette
- status aggregation service

### 2. PrimaryIconRail
Purpose:
- provide top-level navigation

Items:
- Today
- Calendar
- Inbox
- Workflows
- Artifacts
- Dashboards
- Runs
- Integrations
- Settings

Key props:
- `items[]`
- `activeItemId`
- `onSelect(itemId)`
- `badgesByItemId`

States:
- active item
- hover/tooltip
- badge count/status

Dependencies:
- routing
- status badge aggregation

### 3. SecondaryPane
Purpose:
- show section-specific sub-navigation, filters, lists, or saved views

Key props:
- `paneType`
- `items[]`
- `selectedItemId`
- `filters`
- `onSelect`
- `onFilterChange`

States:
- hidden
- visible
- loading
- empty

Dependencies:
- active route
- section-specific data provider

### 4. InspectorPanel
Purpose:
- show contextual metadata, lineage, related objects, and quick actions for the selected object

Key props:
- `selectedObjectRef`
- `resolvedObject`
- `relatedObjects[]`
- `availableActions[]`

States:
- hidden
- no selection
- loading selection
- loaded
- error

Dependencies:
- object resolver
- relationship queries
- action registry

### 5. BottomUtilityPanel
Purpose:
- persistent execution and diagnostics zone

Tabs:
- Terminal
- Active Run
- Logs
- Approvals

Key props/state:
- `activeTab`
- `isExpanded`
- `activeTerminalSessionId?`
- `activeRunId?`
- `pendingApprovalCount`

States:
- collapsed
- expanded
- tab-specific loading/error states

Dependencies:
- terminal service
- run state service
- logs service
- approvals service

---

## Screen 1: Today

### Screen purpose
Operational home screen showing what matters now.

### Main components
- `TodayHeader`
- `DailyBriefingCard`
- `ScheduleSnapshotCard`
- `FollowUpList`
- `ApprovalQueuePreview`
- `WatchItemList`
- `RecentRunsList`
- `ConnectorFreshnessSummary`

### Suggested component tree
```text
TodayScreen
├── TodayHeader
├── DailyBriefingCard
├── ScheduleSnapshotCard
├── FollowUpList
├── ApprovalQueuePreview
├── WatchItemList
├── RecentRunsList
└── ConnectorFreshnessSummary
```

### Data contract checklist
Required data:
- latest daily briefing artifact
- today's events
- open follow-ups
- pending approvals
- active watch items
- recent runs
- connector freshness summary

Suggested query contracts:
- `getLatestArtifactByType('daily_briefing')`
- `listEventsForDateRange(todayStart, todayEnd)`
- `listFollowUps({ status: ['open','in_progress','blocked'], limit: N })`
- `listApprovalRequests({ status: ['pending'], limit: N })`
- `listWatchItems({ status: ['active','monitoring'], limit: N })`
- `listRuns({ recent: true, importantOnly: true, limit: N })`
- `getConnectorFreshnessSummary()`

### States
Loading:
- workspace loading
- partial loading by section

Empty:
- no briefing yet
- no upcoming events
- no open follow-ups
- no approvals pending
- no watch items

Error:
- stale connectors
- failed briefing load
- failed runs query

### Core interactions
- open latest briefing artifact
- launch daily briefing workflow
- launch meeting-prep workflow from selected event
- open follow-up detail
- approve/reject request
- open run detail
- navigate to Calendar / Runs / Inbox

### Object relationships surfaced
- briefing artifact ↔ source entities ↔ follow-ups
- event ↔ prep artifacts ↔ follow-ups ↔ runs
- approval request ↔ run ↔ artifact

### Dependencies
- artifact service
- event query service
- follow-up service
- approvals service
- run query service
- connector status service

---

## Screen 2: Calendar

### Screen purpose
Time-based operational planning and meeting coordination.

### Main components
- `CalendarHeader`
- `CalendarViewSwitcher`
- `CalendarFilterBar`
- `DayGridView`
- `WeekGridView`
- `AgendaListView`
- `EventDetailPreview`
- `EventPreparationSummary`

### Suggested component tree
```text
CalendarScreen
├── CalendarHeader
├── CalendarViewSwitcher
├── CalendarFilterBar
├── CalendarViewport
│   ├── DayGridView | WeekGridView | AgendaListView
│   └── EventDetailPreview
└── EventPreparationSummary
```

### Data contract checklist
Required data:
- canonical events for selected time range
- connector/source metadata for events
- linked artifacts for selected event(s)
- follow-ups linked to event(s)
- event-related runs

Suggested query contracts:
- `listEventsForDateRange(start, end, filters)`
- `getEventById(eventId)`
- `listArtifactsByRelatedEntity(eventId)`
- `listFollowUpsByRelatedEntity(eventId)`
- `listRunsByRelatedEntity(eventId)`
- `getConnectorMetadataForEntity(eventId)`

### States
Loading:
- calendar range loading
- event detail loading

Empty:
- no events in selected range
- no linked prep artifact
- no follow-ups for event

Error:
- event load failed
- source metadata missing
- connector stale

### Core interactions
- switch day/week/agenda
- select event
- open full event detail
- launch meeting-prep workflow
- create follow-up from event
- open linked artifact
- open source-provider reference

### Object relationships surfaced
- event ↔ artifact(s)
- event ↔ follow-up(s)
- event ↔ run(s)
- event ↔ connector/source reference

### Dependencies
- event query service
- artifact relationship service
- follow-up service
- run query service
- connector source resolver

---

## Screen 3: Inbox

### Screen purpose
Triage center for new or unresolved incoming work.

### Main components
- `InboxHeader`
- `InboxQueueList`
- `InboxFilterBar`
- `InboxItemList`
- `InboxItemCard`
- `TriageActionBar`
- `InboxReasonPanel`

### Suggested component tree
```text
InboxScreen
├── InboxHeader
├── InboxQueueList
├── InboxFilterBar
├── InboxItemList
│   └── InboxItemCard[]
├── TriageActionBar
└── InboxReasonPanel
```

### Data contract checklist
Required data:
- inbox items by queue/filter
- source references for each inbox item
- related canonical entities
- existing follow-ups/watch items/artifacts for possible attachment

Suggested query contracts:
- `listInboxItems(filters, sort)`
- `getInboxItemById(id)`
- `resolveInboxSourceRef(sourceRef)`
- `listCandidateArtifactsForInboxItem(id)`
- `listRelatedObjectsForInboxItem(id)`

Mutation contracts:
- `triageInboxItem(id, action)`
- `convertInboxItemToFollowUp(id, payload)`
- `convertInboxItemToWatchItem(id, payload)`
- `attachInboxItemToArtifact(id, artifactId)`
- `snoozeInboxItem(id, until)`
- `dismissInboxItem(id)`

### States
Loading:
- list loading
- source resolution loading

Empty:
- queue empty
- no items matching filters

Error:
- inbox load failed
- conversion mutation failed
- source reference missing

### Core interactions
- select queue
- triage item
- convert to follow-up
- convert to watch item
- attach to artifact
- snooze/dismiss
- open source object

### Object relationships surfaced
- inbox item ↔ source object
- inbox item ↔ resulting follow-up/watch item/artifact

### Dependencies
- inbox service
- source resolver
- follow-up service
- watch-item service
- artifact lookup service

---

## Screen 4: Workflows

### Screen purpose
Launchpad for reusable operational procedures.

### Main components
- `WorkflowHeader`
- `WorkflowCategoryList`
- `WorkflowSearchBar`
- `WorkflowCardGrid`
- `WorkflowDetailPanel`
- `WorkflowRequirementsList`
- `WorkflowRecentOutputs`
- `WorkflowRecentRuns`

### Suggested component tree
```text
WorkflowsScreen
├── WorkflowHeader
├── WorkflowCategoryList
├── WorkflowSearchBar
├── WorkflowCardGrid
└── WorkflowDetailPanel
    ├── WorkflowRequirementsList
    ├── WorkflowRecentOutputs
    └── WorkflowRecentRuns
```

### Data contract checklist
Required data:
- installed workflows
- workflow categories
- required capabilities/connectors
- recent runs by workflow
- recent artifacts by workflow

Suggested query contracts:
- `listWorkflows(filters)`
- `getWorkflowById(id)`
- `listRecentRunsByWorkflow(id)`
- `listRecentArtifactsByWorkflow(id)`
- `resolveWorkflowRequirements(id)`

Mutation contracts:
- `invokeWorkflow(id, inputOverrides?)`
- `openWorkflowInTerminal(id, context?)`
- `updateWorkflowConfig(id, config)`

### States
Loading:
- workflow list loading
- detail loading

Empty:
- no workflows installed
- no recent runs
- no outputs yet

Error:
- invocation failed
- requirements resolution failed

### Core interactions
- select workflow
- run workflow now
- open terminal-backed execution
- inspect requirements
- open recent output artifact
- open recent run

### Object relationships surfaced
- workflow ↔ skill installation
- workflow ↔ required connectors/capabilities
- workflow ↔ runs
- workflow ↔ produced artifacts

### Dependencies
- workflow service
- skill installation service
- capability resolver
- run invocation service
- terminal execution service

---

## Screen 5: Artifacts

### Screen purpose
Browse and manage durable operational outputs.

### Main components
- `ArtifactHeader`
- `ArtifactFilterPane`
- `ArtifactSearchBar`
- `ArtifactList`
- `ArtifactRow` or `ArtifactCard`
- `ArtifactPreview`
- `ArtifactLineagePanel`
- `ArtifactActionBar`

### Suggested component tree
```text
ArtifactsScreen
├── ArtifactHeader
├── ArtifactFilterPane
├── ArtifactSearchBar
├── ArtifactList
│   └── ArtifactRow[]
└── ArtifactPreview
    ├── ArtifactLineagePanel
    └── ArtifactActionBar
```

### Data contract checklist
Required data:
- artifact metadata list
- artifact content preview/content ref
- lineage/source relationships
- related follow-ups
- producing run
- status and tags

Suggested query contracts:
- `listArtifacts(filters, sort, pagination)`
- `getArtifactById(id)`
- `getArtifactContent(id)`
- `listRelatedObjectsForArtifact(id)`
- `getProducingRunForArtifact(id)`

Mutation contracts:
- `updateArtifactStatus(id, status)`
- `archiveArtifact(id)`
- `createFollowUpFromArtifact(id, payload)`
- `updateArtifactTags(id, tags)`

### States
Loading:
- artifact list loading
- preview loading

Empty:
- no artifacts
- no artifacts matching filters

Error:
- artifact content load failed
- mutation failed

### Core interactions
- open artifact
- change status
- create follow-up
- inspect lineage
- open producing run
- archive artifact

### Object relationships surfaced
- artifact ↔ run
- artifact ↔ source entities
- artifact ↔ follow-ups
- artifact ↔ workflows

### Dependencies
- artifact service
- content loader
- lineage resolver
- follow-up service
- run lookup service

---

## Screen 6: Dashboards

### Screen purpose
Persistent, user-oriented operational overviews composed of reusable widgets and status surfaces.

### Main components
- `DashboardHeader`
- `DashboardList`
- `DashboardViewport`
- `DashboardWidgetGrid`
- `WidgetFrame`
- `DashboardFilterBar`

### Suggested component tree
```text
DashboardsScreen
├── DashboardHeader
├── DashboardList
├── DashboardFilterBar
└── DashboardViewport
    └── DashboardWidgetGrid
        └── WidgetFrame[]
```

### Data contract checklist
Required data:
- saved dashboards
- dashboard widget definitions
- widget query results
- dashboard-level filters

Suggested query contracts:
- `listDashboards()`
- `getDashboardById(id)`
- `runDashboardWidgetQuery(widgetId, filters)`

Mutation contracts:
- `createDashboard(input)`
- `updateDashboardLayout(id, layout)`
- `updateDashboardFilters(id, filters)`

### States
Loading:
- dashboard list loading
- widget loading independently

Empty:
- no dashboards created
- dashboard contains no widgets

Error:
- widget query failed
- dashboard load failed

### Core interactions
- select dashboard
- adjust filters
- open underlying object list from widget
- create dashboard later
- rearrange widgets later

### Object relationships surfaced
- dashboard widget ↔ underlying follow-ups/runs/artifacts/events/connectors

### Dependencies
- dashboard service
- widget query layer
- saved view/filter service

---

## Screen 7: Runs

### Screen purpose
Execution history, automation health, and approval visibility.

### Main components
- `RunsHeader`
- `RunFilterPane`
- `RunList`
- `RunRow`
- `RunDetailPanel`
- `RunTimeline`
- `RunLogSummary`
- `ApprovalActions`

### Suggested component tree
```text
RunsScreen
├── RunsHeader
├── RunFilterPane
├── RunList
│   └── RunRow[]
└── RunDetailPanel
    ├── RunTimeline
    ├── RunLogSummary
    └── ApprovalActions
```

### Data contract checklist
Required data:
- run records
- run status
- produced artifacts
- related approvals
- logs summary
- side-effect summary

Suggested query contracts:
- `listRuns(filters, sort, pagination)`
- `getRunById(id)`
- `listArtifactsByRun(id)`
- `listApprovalRequestsByRun(id)`
- `getRunLogSummary(id)`

Mutation contracts:
- `retryRun(id)`
- `approveRunRequest(approvalId)`
- `rejectRunRequest(approvalId, reason?)`
- `cancelRun(id)` when applicable

### States
Loading:
- run list loading
- detail loading

Empty:
- no runs yet
- no failed runs
- no approvals pending

Error:
- run detail load failed
- retry failed
- approval mutation failed

### Core interactions
- inspect run details
- open logs
- approve/reject
- retry run
- open artifacts from run
- open associated terminal session if any

### Object relationships surfaced
- run ↔ workflow
- run ↔ artifacts
- run ↔ approvals
- run ↔ terminal session
- run ↔ input snapshot summary

### Dependencies
- run service
- log service
- approval service
- artifact lookup service
- terminal session resolver

---

## Screen 8: Integrations

### Screen purpose
Configure and trust external system connectivity.

### Main components
- `IntegrationsHeader`
- `ConnectorList`
- `ConnectorRow`
- `ConnectorDetailPanel`
- `ConnectorCapabilityList`
- `ConnectorHealthStatus`
- `ConnectorActionBar`

### Suggested component tree
```text
IntegrationsScreen
├── IntegrationsHeader
├── ConnectorList
│   └── ConnectorRow[]
└── ConnectorDetailPanel
    ├── ConnectorCapabilityList
    ├── ConnectorHealthStatus
    └── ConnectorActionBar
```

### Data contract checklist
Required data:
- connector installations
- auth state
- freshness state
- last sync metadata
- capabilities
- error/issues summary

Suggested query contracts:
- `listConnectorInstallations()`
- `getConnectorInstallationById(id)`
- `getConnectorHealth(id)`
- `listCapabilitiesByConnector(id)`

Mutation contracts:
- `beginConnectorAuth(id)`
- `reAuthConnector(id)`
- `syncConnectorNow(id)`
- `disableConnector(id)`
- `updateConnectorConfig(id, config)`

### States
Loading:
- connector list loading
- detail loading

Empty:
- no connectors installed

Error:
- auth failed
- sync failed
- capability load failed

### Core interactions
- install connector
- authenticate/re-authenticate
- sync now
- inspect health and freshness
- inspect capabilities
- open connector-dependent workflows

### Object relationships surfaced
- connector ↔ produced entity types
- connector ↔ capabilities
- connector ↔ workflows depending on it
- connector ↔ freshness / errors

### Dependencies
- connector installation service
- auth service
- sync service
- capability registry

---

## Cross-Screen Data and State Patterns

### Shared async states
Every major list/detail screen should support:
- loading
- empty
- partial data
- stale data
- error

### Shared UI states
Every major object view should consider:
- selected/unselected
- actionable/non-actionable
- needs approval
- stale source data
- archived/resolved state where applicable

### Shared query patterns
Favor consistent query patterns across screens:
- `list...`
- `getById...`
- `listRelated...`
- `resolveSource...`
- `invoke...`
- `updateStatus...`

### Shared mutation safety rules
Mutations with side effects should support:
- optimistic UI only where safe
- explicit success/failure feedback
- approval gating when required
- audit/log generation

---

## Suggested Implementation Order for Components

### Foundation components first
1. AppShell
2. PrimaryIconRail
3. SecondaryPane
4. InspectorPanel
5. BottomUtilityPanel
6. shared object list row/card primitives
7. status chips/badges
8. filter bars
9. header/action bar primitives

### Screen-level implementation next
1. Today
2. Calendar
3. Workflows
4. Artifacts
5. Runs
6. Integrations
7. Inbox
8. Dashboards

### Service and query layers alongside UI
Build these in parallel:
- artifact service
- workflow/run invocation service
- event query service
- connector installation/auth service
- approvals service
- follow-up service
- inbox service
- dashboard widget query layer

---

## Summary
This component inventory and data contract checklist provides a practical bridge from product wireframes to implementation planning. It defines, expected screen structure, required data, core interactions, and service dependencies needed to build v1 operations workspace coherently.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_wireframes_and_screens|Wireframes and Screen Specifications]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
