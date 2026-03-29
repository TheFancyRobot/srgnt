---
note_type: shared_knowledge
title: Calendar Domain and API Specification
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - calendar
---

## 12. Calendar Domain and API Specification

### Purpose
Define the product-native calendar subsystem for the desktop product, including:
- the calendar domain model
- the connector-facing event publication contract
- the relationship between calendar data and product-native workspace objects
- the UX capabilities the calendar must support in v1

This document exists because Calendar is a **core product feature**, not merely a connector-specific view.

## Product stance
The product owns the calendar experience.

External service connectors do **not** own calendar UI or calendar behavior. Instead, they contribute event data into a product-owned calendar domain through a stable API/model.

This ensures that:
- the calendar remains provider-agnostic
- multiple connectors can contribute events over time
- the product can enrich events with artifacts, follow-ups, runs, and watch items
- workflows can depend on a stable event model instead of provider-specific event schemas

## Calendar subsystem goals
The calendar subsystem should:
- provide a first-class operational planning surface
- support day, week, and agenda/list views in v1
- expose normalized events from one or more connectors
- support event relationships to product-native objects
- remain sync-friendly and mobile-friendly later
- preserve clear source references and freshness status
- avoid coupling the product to any single provider's calendar model

## Calendar domain model

### Core calendar object: CalendarEvent
The primary calendar object used by the product should be a product-level view/model based on canonical `Event` entities.

A `CalendarEvent` is conceptually:
- a normalized operationally useful event record
- backed by one canonical `Event`
- optionally enriched with product-native relationships and derived state

Suggested shape:

```ts
interface CalendarEvent {
  id: string
  workspaceId: string
  eventEntityId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay?: boolean
  status?: 'confirmed' | 'tentative' | 'cancelled'
  location?: string
  meetingUrl?: string
  organizerId?: string
  attendeeIds?: string[]

  sourceConnectorId: string
  sourceRef: {
    provider: string
    sourceId: string
    url?: string
  }

  freshness: {
    syncedAt?: string
    state: 'fresh' | 'stale' | 'error' | 'unknown'
  }

  relationships: {
    artifactIds?: string[]
    followUpIds?: string[]
    runIds?: string[]
    watchItemIds?: string[]
    relatedEntityIds?: string[]
  }

  derivedState?: {
    needsPrep?: boolean
    hasPrepArtifact?: boolean
    hasOpenFollowUps?: boolean
    importance?: 'low' | 'medium' | 'high'
  }

  sensitivityClass?: 'A' | 'B' | 'C' | 'D'
}
```

### Why use a calendar-specific view model
The canonical `Event` entity is still the connector/runtime boundary. But the product benefits from a calendar-specific model because the calendar surface needs:
- source freshness
- product-native relationships
- derived prep/follow-through state
- UI-friendly fields for fast rendering

This avoids pushing all calendar concerns into the raw canonical entity layer.

## Supporting calendar objects

### CalendarSource
Represents a logical event-producing source installed in the workspace.

Examples:
- Outlook calendar connector installation
- Google Calendar connector installation later
- internal team schedule source later

Suggested fields:
- `id`
- `workspaceId`
- `connectorInstallationId`
- `displayName`
- `status`
- `colorHint?`
- `defaultVisibility`
- `lastSyncAt?`
- `freshnessState`

Purpose:
- helps the calendar UI show source provenance cleanly
- supports multi-source calendars later

### CalendarViewPreferences
Represents persisted user preferences for the calendar experience.

Suggested fields:
- `workspaceId`
- `defaultView` (`day`, `week`, `agenda`)
- `showWeekends`
- `showDeclinedEvents`
- `showAllDayRegion`
- `sourceVisibility`
- `timeZoneMode`

This may be stored as view-specific `ViewState` in v1.

## Connector-facing calendar API direction

### Design principle
Connectors should publish canonical `Event` entities and related source metadata into the product runtime. The calendar subsystem then consumes those events through a stable event ingestion interface.

### Minimum connector requirements for calendar contribution
An event-producing connector should be able to:
- declare `events.read` capability
- map source events to canonical `Event` entities
- provide source connector identity and provider references
- provide sync/freshness metadata
- optionally expose source URLs or event action capabilities

### Conceptual connector contract
At a conceptual level, the product should support an interface like:

```ts
interface CalendarEventPublisher {
  connectorId: string
  capabilities: string[]

  listEvents(input: {
    workspaceId: string
    timeRange: {
      start: string
      end: string
    }
    filters?: Record<string, unknown>
  }): Promise<PublishedCalendarEvent[]>
}

interface PublishedCalendarEvent {
  event: EntityRecord<any>
  source: {
    connectorId: string
    provider: string
    sourceId: string
    url?: string
  }
  freshness?: {
    syncedAt?: string
    state?: 'fresh' | 'stale' | 'error' | 'unknown'
  }
}
```

This does not mean the calendar bypasses canonical entities. It means connectors publish into the calendar subsystem via the canonical event layer plus source metadata.

## Ingestion and enrichment flow

### Event flow
1. Connector authenticates and syncs event-producing source data.
2. Connector maps raw source events into canonical `Event` entities.
3. Connector publishes event records plus source metadata/freshness.
4. Calendar subsystem indexes or materializes `CalendarEvent` view models.
5. Product-native relationships are attached where available.
6. Calendar views render product-native event experiences.

### Enrichment sources
The calendar subsystem may enrich events using:
- linked artifacts
- follow-ups
- related runs
- recent Daily Command Center artifacts
- meeting-prep artifacts
- watch items

## Calendar relationships to product-native objects

### Artifact relationships
Examples:
- meeting prep packet attached to an event
- prior meeting summary attached to a recurring event
- daily artifact referencing all events for a date

### FollowUp relationships
Examples:
- send recap after meeting
- prepare answers before event
- follow up with attendee after discussion

### Run relationships
Examples:
- meeting-prep workflow run
- Daily Command Center run for that date
- event-specific terminal-driven execution

### WatchItem relationships
Examples:
- high-risk meeting requiring special attention
- unresolved blocker tied to scheduled review

## Calendar UX requirements for v1

### Required views
- day view
- week view
- agenda/list view

### Required behaviors
- render events from one or more sources through unified calendar UX
- open event detail panel
- show source/freshness information
- show linked artifacts and follow-ups where available
- launch meeting-prep workflow from an event
- open source-provider reference when available

### Recommended event detail panel contents
- title
- time and date
- location / meeting link
- attendees / organizer if available
- source connector/provider
- freshness state
- linked artifacts
- open follow-ups
- related runs
- quick actions

## Quick actions from calendar
Recommended v1 event-level actions:
- open event details
- open source provider reference
- launch meeting-prep workflow
- open linked artifact
- create follow-up
- open related Daily Command Center artifact for the day

Optional later:
- update event through connector action capability
- send follow-up draft
- attach artifact to event context automatically

## Calendar-specific derived state
The calendar subsystem should be allowed to compute lightweight derived state for UX purposes.

Examples:
- `needsPrep`
- `hasPrepArtifact`
- `hasOpenFollowUps`
- `isStartingSoon`
- `isPastDueForFollowUp`

These states improve operations UX without changing the underlying canonical source event.

## Freshness and trust model
Because the product relies on external systems, the calendar must communicate freshness clearly.

### Required freshness states
- `fresh`
- `stale`
- `error`
- `unknown`

### UX requirements
- stale or error states should be visible in event details and calendar-level source status
- the product should avoid pretending the calendar is current when connector freshness is degraded

## Multi-source future readiness
The calendar should be designed to support multiple event sources later.

Potential future cases:
- Outlook + Google Calendar
- internal service schedules
- team-shared calendars
- generated planning blocks

This means:
- source identity must be explicit
- source visibility preferences should be possible
- the calendar domain model must remain provider-agnostic

## Calendar and Daily Command Center integration
The Daily Command Center workflow should consume the calendar subsystem rather than raw provider-specific event payloads.

This gives the workflow access to:
- normalized events
- source freshness
- linked artifacts
- prep/follow-through state

The calendar should also support opening or generating the Daily Command Center artifact for a selected date.

## Calendar and sync implications
The calendar subsystem should be sync-friendly by design.

Likely sync targets later:
- event view metadata
- source visibility preferences
- event-to-artifact relationships
- event-to-follow-up relationships

Avoid by default:
- syncing unnecessary provider raw metadata
- syncing sensitive event content without policy-aware handling

## Calendar and sensitivity model
Calendar events may contain sensitive content depending on connector and user context.

Therefore:
- event content should respect data classification rules
- event relationships to artifacts/follow-ups may inherit higher sensitivity
- future HIPAA-sensitive mode must support policy restrictions on sync and AI/Fred access to event content

## V1 implementation boundaries

### In scope
- product-owned calendar subsystem
- canonical event ingestion path for connectors
- day/week/agenda views
- event details panel
- product-native event enrichment with artifacts/follow-ups/runs
- source freshness display
- Daily Command Center integration

### Out of scope for first implementation
- provider write-back/editing of events
- complex calendar conflict analytics
- generated planning blocks as first-class calendar events
- full multi-calendar source management UI
- mobile calendar parity

## Testing recommendations
The calendar subsystem should ship with fixtures covering:
- normal workday with multiple meetings
- sparse day
- all-day events
- recurring meeting context
- stale connector freshness
- event with linked prep artifact
- event with follow-up after meeting

## Summary
The product should own a provider-agnostic calendar subsystem built on canonical `Event` entities plus product-native enrichment. Connectors publish event data into this subsystem, while workflows and views consume a stable calendar model that supports operational planning, preparation, and follow-through.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_daily_command_center_workflow|Flagship Workflow: Daily Command Center]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004: Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_workspace_domain_model|Workspace Domain Model]]
