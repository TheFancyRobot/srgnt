---
note_type: shared_knowledge
title: Desktop Navigation and Information Architecture
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - ux
  - navigation
---
## 10. Desktop Navigation and Information Architecture

### Purpose
Define the primary navigation model and information architecture for the desktop product so that users can move through operational work naturally, with clear visibility into what matters now, what needs action, and what has happened.

This architecture should reflect the product's true identity:
- not a note-taking app
- not a task manager clone
- not a generic dashboard shell
- an operations workspace optimized for execution, tracking, and artifact-driven work

### UX goals
The navigation and IA should:
- make the product feel fast and legible under real workload
- surface what matters now without overwhelming the user
- make workflows, artifacts, runs, and follow-through easy to understand
- reduce context switching between external tools
- support both keyboard-first users and visual scanning users
- remain familiar enough to Obsidian-like users without inheriting a note-first mental model

## IA design principles

### 1. Time and action over storage hierarchy
The app should organize around:
- what matters now
- what is new
- what is in progress
- what was produced
- what needs follow-through

rather than around:
- folders
- nested notebooks
- arbitrary storage trees

### 2. Operational objects should be visible as objects, not hidden in prose
Inbox items, follow-ups, watch items, runs, and approvals should appear as first-class entities in the UI, not just text embedded in artifacts.

### 3. Navigation should reflect workflows, not database tables
Users should not feel like they are browsing internal models. They should feel like they are operating from purposeful surfaces.

### 4. Artifacts should anchor work products
The product should preserve a strong artifact-first identity while ensuring artifacts are contextualized by status, source, follow-ups, and recent runs.

### 5. The terminal should feel integrated, not separate
Terminal workflows should live within the same navigation and context model as other operational activities.

## Recommended primary navigation

### Primary top-level sections
- **Today**
- **Calendar**
- **Inbox**
- **Workflows**
- **Artifacts**
- **Runs**
- **Integrations**
- **Settings**

Recommended future additions:
- **Review**
- **Team**
- **Sync**
- **Fred**

### Why this structure works
This structure reflects the natural operational loop:
1. orient to what matters now
2. inspect schedule and time-based commitments
3. triage incoming work
4. run workflows
5. inspect resulting artifacts
6. review execution history and issues
7. manage system connections and configuration

This is stronger than a file-tree or notes/folders-first model.

## Section-level architecture

## Today

### Role
The user's operational home screen.

### Core question it answers
**"What matters right now, and what should I do next?"**

### Primary content blocks
Recommended sections:
- Daily briefing / current snapshot
- Today's schedule and event context
- Priority follow-ups
- Open watch items
- Pending approvals
- Recent important runs
- Connector freshness / issues
- Suggested workflows

### Supported object types
- Artifact
- Event
- FollowUp
- WatchItem
- ApprovalRequest
- Run
- ConnectorInstallation freshness state

### Interaction patterns
- quick-open artifact
- approve/reject pending action
- launch workflow
- open related source context
- open terminal with relevant context
- snooze or resolve item

### UX notes
Today should not be a static dashboard. It should feel like a living command surface with actionable items.

## Inbox

### Role
Operational triage surface for new or unresolved incoming items.

### Core question it answers
**"What new things need attention, sorting, or escalation?"**

### Primary content blocks
- New inbox items grouped by type or priority
- Triage actions
- Suggested conversions to follow-up/watch item/artifact
- Recently triaged items

### Supported object types
- InboxItem
- FollowUp (as triage outcome)
- WatchItem (as triage outcome)
- Artifact (as triage outcome)

### Interaction patterns
- triage item
- convert to follow-up
- convert to watch item
- attach to existing artifact
- dismiss/snooze
- open source context

### UX notes
Inbox is important because it turns the product into a place where operational inputs are actively processed rather than passively displayed.

## Workflows

### Role
Surface for discovering, invoking, and managing reusable operational procedures.

### Core question it answers
**"What can this workspace do for me, and what should I run now?"**

### Primary content blocks
- Recommended workflows
- Installed workflows
- Recently run workflows
- Scheduled/automated workflows
- Workflow categories

### Supported object types
- Workflow
- SkillInstallation
- Run

### Interaction patterns
- run workflow now
- configure workflow
- duplicate or customize later
- inspect required inputs/capabilities
- view recent output artifacts
- launch terminal-backed execution

### UX notes
This section should make automation visible and approachable. It should feel more like an app launcher for operational procedures than a list of scripts.

## Artifacts

### Role
Primary browsing and management surface for durable work products.

### Core question it answers
**"What has been produced, what is active, and what needs follow-through?"**

### Primary content blocks
- Active artifacts
- Recent artifacts
- Artifact status groupings
- Artifact types/categories
- Linked follow-ups and related runs
- Search and filtering

### Supported object types
- Artifact
- FollowUp
- Run
- related canonical entities

### Interaction patterns
- open artifact
- change artifact status
- inspect lineage (source entities, producing run)
- create follow-up from artifact
- view related workflow/run/source data
- archive artifact

### UX notes
Artifacts should be central, but they should not be treated like generic documents. Their operational lineage and status should always be visible.

## Runs

### Role
Visibility surface for execution history, automation health, approvals, and troubleshooting.

### Core question it answers
**"What ran, what happened, and where are things stuck?"**

### Primary content blocks
- Recent runs
- Failed/partial runs
- Awaiting approval
- Terminal-linked executions
- Logs and summaries

### Supported object types
- Run
- ApprovalRequest
- Artifact
- Workflow

### Interaction patterns
- inspect run details
- review logs
- approve/reject action
- retry run
- open artifacts produced by run
- inspect side effects and outcomes

### UX notes
This section is a major differentiator because it makes the automation layer legible instead of hidden.

## Integrations

### Role
Management surface for connected systems and their health/freshness.

### Core question it answers
**"What external systems are connected, and can I trust the current context?"**

### Primary content blocks
- installed connectors
- auth state
- sync freshness
- connector errors/issues
- capabilities exposed
- configuration details

### Supported object types
- ConnectorInstallation
- connector package definition
- sync status metadata

### Interaction patterns
- connect/disconnect
- re-authenticate
- sync now
- inspect connector health
- view recent sync issues

### UX notes
This section should reinforce trust by clearly showing whether the app's external context is fresh and healthy.

## Settings

### Role
System and workspace configuration surface.

### Core question it answers
**"How is this workspace configured and governed?"**

### Primary content blocks
- workspace settings
- security/privacy settings
- policy profiles later
- terminal settings
- sync settings later
- subscription/Fred settings later

## Cross-cutting secondary surfaces

## Global command palette

### Purpose
A keyboard-first universal entry point.

Should support:
- navigate to views
- open artifacts
- run workflows
- open recent runs
- search entities/artifacts
- open terminal
- quick actions on selected objects

This is one of the easiest ways to feel familiar to Obsidian users without copying a notes-first UI.

## Global search

### Purpose
Cross-object retrieval across:
- artifacts
- workflows
- runs
- follow-ups
- inbox items
- canonical entities

Search results should be object-aware, not just text-match dumps.

## Right-side context panel

### Purpose
Provide contextual detail without forcing full navigation away from the current workflow.

Could show:
- related source entities
- related follow-ups
- run lineage
- connector freshness
- metadata/status

This can help preserve multi-panel power-user workflows.

## Bottom panel / terminal zone

### Purpose
A persistent but collapsible execution surface.

Should support:
- terminal sessions
- workflow-linked terminal context
- run association
- execution status

This is especially important because the base product includes terminal-based coding agent workflows.

## Suggested layout model

A strong v1 desktop layout could be:
- left sidebar for primary navigation
- center content region for current view
- optional right context panel for object details/relationships
- bottom collapsible terminal/run panel

This balances familiarity, density, and operational utility.

## Object surfacing rules

### Artifact
Should appear prominently in:
- Today
- Artifacts
- Runs
- global search

### Workflow
Should appear prominently in:
- Workflows
- Today recommendations
- command palette

### Run
Should appear prominently in:
- Runs
- Today highlights
- linked from artifacts and workflows

### InboxItem
Should appear prominently in:
- Inbox
- Today summaries if urgent

### FollowUp
Should appear prominently in:
- Today
- Artifacts
- Inbox outcomes
- future Review view

### WatchItem
Should appear prominently in:
- Today
- future Review view
- possibly Inbox when newly surfaced

### ApprovalRequest
Should appear prominently in:
- Today
- Runs
- future dedicated approvals queue if volume demands it

## IA notes for future expansion

### Review
A future section for weekly review, drift detection, unresolved follow-ups, stale artifacts, and watch-item sweeps.

### Team
A future section for shared operational context, assigned follow-ups, and team-aware views.

### Sync
A future section for device state, conflicts, encrypted sync status, and account controls.

### Fred
A future section for premium AI-driven workflows, orchestrations, copilots, and premium summaries.

## Anti-patterns to avoid

Avoid these IA mistakes:
- putting everything into a single dashboard home
- making Artifacts effectively a notes browser
- burying runs and approvals in settings or logs
- exposing raw connector data tables as primary UX
- organizing the product around storage/folders instead of operational purpose
- making terminal workflows feel disconnected from artifacts and runs

## V1 navigation priorities

If v1 needs simplification, keep these strongest surfaces:
- Today
- Calendar
- Inbox
- Workflows
- Artifacts
- Runs
- Integrations

This is enough to express the full operational loop.

## Summary
The desktop information architecture should organize the product around the operational loop of orienting, triaging, executing, producing artifacts, and reviewing outcomes. This creates a distinctive operations-first workspace that feels familiar to power users without becoming a notes-first application.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_ux_direction|Initial Product UX Direction]]
- [[06_Shared_Knowledge/srgnt_framework_workspace_domain_model|Workspace Domain Model]]
- [[06_Shared_Knowledge/srgnt_framework_wireframes_and_screens|Wireframes and Screen Specifications]]