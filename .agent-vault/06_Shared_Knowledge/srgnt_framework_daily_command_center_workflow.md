---
note_type: shared_knowledge
title: Flagship Workflow: Daily Command Center
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - workflow
---
## 11. Flagship Workflow Specification: Daily Command Center

### Purpose
Define the first flagship end-to-end workflow for the productized v1 experience.

This workflow should prove the core value proposition of the product by showing how integrations, calendar context, terminal-based execution, artifacts, triage, and follow-through work together inside a single operations workspace.

## Why this is the flagship workflow
The Daily Command Center workflow is the best v1 wedge because it:
- is useful every day
- combines multiple external systems naturally
- benefits from both structure and flexibility
- produces durable artifacts
- creates opportunities for triage and follow-through
- demonstrates the product's operations-first identity clearly

It is also easy to explain:
**"Prepare my day from my calendar, tasks, and messages, then help me act on it."**

## Workflow summary
The Daily Command Center workflow gathers current context from connected systems, analyzes what matters for the day, generates a structured operational artifact, and surfaces follow-ups, watch items, and suggested actions.

Calendar is a first-class input and first-class UX surface in this workflow.

## Workflow goals
The workflow should help the user:
- understand what is happening today
- see what meetings and time blocks matter
- understand what work is likely to matter around those events
- identify conflicts, risks, and watch items
- generate a durable artifact they can refer to throughout the day
- turn context into action through follow-ups and workflow suggestions

## Primary inputs

### Connector-derived inputs
Recommended v1 sources:
- `Event` entities from calendar-producing connectors
- `Task` entities from Jira or equivalent task connectors
- `Message` and/or `Thread` entities from Teams or Slack connectors

### Product-native inputs
- existing open `FollowUp` objects
- active `WatchItem` objects where implemented
- recent `Artifact` objects related to today's work
- recent `Run` history for continuity/context
- connector freshness state

### User/runtime inputs
- selected date (default today)
- workspace preferences
- workflow configuration profile
- optional manual focus mode or filters

## Core outputs

### Primary output artifact
A **Daily Command Center artifact**.

Suggested artifact type:
- `daily_command_center`

Suggested sections:
- date and generated timestamp
- schedule overview
- important meetings / events
- preparation needs
- task priorities for today
- blockers / risks / watch items
- follow-through recommendations
- suggested workflows to run
- connector freshness / trust notes if relevant

### Secondary outputs
- generated or suggested `FollowUp` objects
- optional `InboxItem` entries for things needing triage
- optional `WatchItem` suggestions
- `Run` record with input/output lineage

## Calendar in the workflow

### Calendar is not just background context
Calendar is a primary organizing structure for the workflow.

The workflow should use calendar context to:
- anchor the day chronologically
- identify the user's time constraints and availability
- determine which events need preparation
- identify event-linked work and follow-through
- surface meeting-adjacent tasks and artifacts
- detect overloaded or risky portions of the day later

### Calendar-dependent behavior
Examples:
- if a meeting is upcoming and has no prep artifact, surface a preparation need
- if related tasks exist for an event, attach them to the relevant event block
- if a prior artifact exists for a recurring meeting, surface it in context
- if follow-ups are due near a scheduled event, group them with that event

### Calendar as a launch surface
From calendar-linked blocks in the daily artifact or Today view, the user should be able to:
- open event details
- launch a meeting-prep workflow
- open linked artifacts
- create follow-ups
- open related source context

## User journey

### Entry points
The workflow may be launched from:
- Today view
- Calendar view
- Workflows section
- command palette
- optional scheduled run later

### Happy path
1. User opens the app in the morning or launches the workflow manually.
2. The system checks connector freshness and gathers today's events, relevant tasks, recent messages/threads, and existing follow-ups.
3. Calendar events are used as the temporal backbone for the day.
4. The runtime identifies important meetings, likely prep needs, related tasks, and notable message context.
5. The workflow generates a Daily Command Center artifact.
6. The product surfaces related follow-ups, watch items, and suggested next actions.
7. The user opens the artifact and acts from it throughout the day.
8. The user can launch terminal-based workflows or other skills directly from relevant sections.

## Suggested artifact structure

### Header
- date
- generated time
- workflow/run reference
- connector freshness summary

### Section 1: Today at a glance
- top priorities
- major meetings/events
- urgent follow-ups
- notable risks

### Section 2: Calendar and schedule
- chronological day view summary
- important events
- event-specific prep status
- attached context where available

### Section 3: Meeting preparation
- meetings needing prep
- linked prior artifacts
- related tasks/issues
- suggested prep workflows

### Section 4: Priority work
- tasks likely to matter today
- blockers or dependencies
- task clusters related to calendar commitments

### Section 5: Watch items and risks
- unresolved issues to monitor
- timing-related risk areas
- stale or missing source context if relevant

### Section 6: Follow-through
- open follow-ups carried into today
- newly suggested follow-ups
- event-linked actions

### Section 7: Suggested actions
- workflows to run
- terminal-based actions to launch
- triage items requiring attention

## View integration

### Today view integration
The Today view should prominently surface:
- the latest Daily Command Center artifact
- today's major calendar blocks
- follow-ups pulled from the workflow
- workflow suggestions generated by the run

### Calendar view integration
The Calendar view should support:
- opening the Daily Command Center workflow for a selected date
- showing whether an event has linked prep artifacts
- showing related follow-ups and event-linked operational context
- opening the generated daily artifact from the day/week context

### Artifacts view integration
The Artifacts view should:
- show Daily Command Center artifacts grouped by date/status
- allow quick reopening of previous days
- expose lineage to runs, events, and follow-ups

### Runs view integration
The Runs view should:
- show execution status of each Daily Command Center run
- show failures caused by connector freshness/auth problems
- expose approvals if relevant in later versions

## Terminal integration

### Why terminal matters in this workflow
The daily workflow should be able to hand the user off directly into a terminal-backed action when deeper operational work is needed.

Examples:
- open terminal with context for drafting a stakeholder update
- launch a coding agent to investigate a task cluster
- run a meeting-prep script or artifact update process
- execute a local automation or reporting command

### Terminal-linked actions
Suggested terminal-linked actions:
- `Investigate this task cluster`
- `Generate meeting prep artifact`
- `Draft follow-up summary`
- `Open context in terminal`

These actions should create or extend `Run` records where appropriate.

## Trigger model

### V1 triggers
- manual launch from Today
- manual launch from Calendar
- manual launch from Workflows
- command palette launch

### Later triggers
- scheduled morning run
- rerun after connector sync
- rerun when calendar changes significantly

## Input selection rules

### Event selection
For a given day, include:
- all events for the selected date
- adjacent events if needed for overnight/timezone context
- optionally all-day events

### Task selection
Prioritize tasks by:
- due date proximity
- assigned user
- status/priority
- relationship to today's calendar events
- relationship to recent artifacts/follow-ups

### Message/thread selection
Include only messages likely to matter to today's work, such as:
- recent mentions
- messages tied to relevant tasks/projects
- messages close in time to scheduled events or follow-ups

## Workflow logic outline

1. Validate required connectors/capabilities.
2. Check freshness/auth status.
3. Resolve selected date and workspace preferences.
4. Gather `Event`, `Task`, `Message`, and `Thread` context.
5. Gather open `FollowUp` and relevant recent `Artifact` context.
6. Build a time-aware day model anchored on calendar events.
7. Associate tasks, follow-ups, and message context to relevant time blocks or themes.
8. Identify prep needs, risks, and watch candidates.
9. Generate the Daily Command Center artifact.
10. Generate or suggest follow-ups/inbox items.
11. Write artifact and run metadata.
12. Surface results in Today, Calendar, Artifacts, and Runs.

## Suggested user-facing workflow copy

### Workflow name
Daily Command Center

### Short description
Prepare today's operational plan from your calendar, tasks, messages, and follow-through state.

### User promise
See your day, understand what matters, and act from one place.

## Success criteria
A successful Daily Command Center workflow should make the user feel:
- their day is understandable faster than before
- meetings and schedule are connected to actual work
- follow-through is clearer
- the generated artifact is worth reopening throughout the day
- terminal-based deeper work is only one step away

## Failure modes to handle well

### Connector failure
If one source fails:
- generate a partial artifact if possible
- clearly show missing context and freshness issues
- record the problem in the run

### Sparse day
If the calendar is light:
- emphasize task priorities, open follow-ups, and watch items
- avoid forcing filler content

### Event-heavy day
If the calendar is overloaded:
- prioritize prep needs
- group related work by event or time block
- surface overload indicators later

### Noisy message context
If message data is noisy:
- prefer relevance filtering over verbosity
- avoid flooding the artifact with chat summaries

## V1 implementation boundaries

### In scope
- event-driven day model based on calendar context
- artifact generation
- follow-up suggestions
- linkage to tasks/events
- manual launch
- Today/Calendar integration
- run logging

### Out of scope for first implementation
- autonomous side effects into external systems
- advanced scheduling analysis
- full watch-item automation if not yet implemented
- premium Fred orchestration
- perfect semantic relevance across all messages

## Test fixture recommendations
The workflow should ship with fixtures for:
- normal meeting-heavy day
- sparse calendar day
- overloaded day with conflicting meetings
- day with missing connector freshness
- day with recurring meeting prep context

## Summary
The Daily Command Center workflow should serve as the flagship proof that the product can combine calendar-aware planning, external context aggregation, artifact generation, follow-through tracking, and terminal-based action inside a single operations-first workspace.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_workspace_domain_model|Workspace Domain Model]]
- [[06_Shared_Knowledge/srgnt_framework_calendar_domain_spec|Calendar Domain and API Specification]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]