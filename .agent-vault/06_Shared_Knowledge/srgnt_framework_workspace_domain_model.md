---
note_type: shared_knowledge
title: Workspace Domain Model
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - domain-model
---
## 9. Workspace Domain Model

### Purpose
Define the core product objects that make up the operations workspace so that UX, persistence, tracking, workflow execution, sync, and premium features all share a stable conceptual model.

This model goes beyond connector-derived canonical entities. It defines the product-native objects that the workspace is built around.

### Design goals
The workspace domain model should:
- support an operations-first product rather than a note-taking product
- make tracking and follow-through first-class
- separate source-system data from product-native state
- support generated artifacts and workflow execution history
- remain sync-friendly and mobile-friendly later
- support sensitivity-aware handling and future policy enforcement

## Domain model overview

The workspace is composed of two broad object categories:

### 1. External-source objects
These originate from connectors and are normalized into canonical entities.

Examples:
- `Task`
- `Event`
- `Message`
- `Thread`
- `Person`
- `Project`
- `Document`

These represent outside-world data.

### 2. Product-native workspace objects
These are created and managed by the product itself.

Examples:
- `Workspace`
- `Artifact`
- `Workflow`
- `Run`
- `InboxItem`
- `FollowUp`
- `WatchItem`
- `Queue`
- `ViewState`
- `ConnectorInstallation`
- `SkillInstallation`
- `ApprovalRequest`
- `PolicyProfile`

These represent operational structure, execution, and tracking inside the product.

## Primary product-native objects

### Workspace
Represents the top-level local operational environment.

Purpose:
- root scope for settings, artifacts, runs, integrations, and local state
- future unit of sync and device continuity

Suggested fields:
- `id`
- `name`
- `createdAt`
- `updatedAt`
- `ownerProfileId?`
- `defaultPolicyProfileId`
- `syncState?`
- `workspaceType` (personal, team, regulated-sensitive, etc.)
- `settingsRef`

Notes:
- all major product-native objects belong to a workspace
- workspace is not positioned as a "vault" or "notebook"

### Artifact
Represents a durable work product generated, imported, or manually created in the workspace.

Examples:
- daily briefing
- meeting prep packet
- release summary
- triage report
- workflow output
- human-authored structured operational note

Purpose:
- primary durable output model
- central object in the product's artifact-first UX

Suggested fields:
- `id`
- `workspaceId`
- `artifactType`
- `title`
- `status`
- `path?`
- `contentRef?`
- `createdAt`
- `updatedAt`
- `generatedByRunId?`
- `sourceEntityIds[]`
- `relatedFollowUpIds[]`
- `tags[]`
- `sensitivityClass`
- `archivedAt?`

Suggested statuses:
- `draft`
- `active`
- `reviewed`
- `resolved`
- `archived`

Key distinction:
Artifacts are not generic notes. They are operational outputs with lifecycle and relationships.

### Workflow
Represents a reusable operational procedure that can be invoked manually or automatically.

Examples:
- generate daily briefing
- triage inbox
- prepare meeting packet
- summarize project risk
- create follow-up checklist

Purpose:
- user-facing representation of reusable work patterns
- entry point for skills and automations

Suggested fields:
- `id`
- `workspaceId`
- `name`
- `description`
- `workflowType`
- `skillId?`
- `triggerModes[]`
- `status`
- `inputProfileRef?`
- `outputProfileRef?`
- `approvalMode`
- `lastRunAt?`
- `createdAt`
- `updatedAt`

Suggested statuses:
- `active`
- `paused`
- `deprecated`

Notes:
- a workflow may be backed by a skill package
- user-facing workflow language can be cleaner than skill-internal packaging language

### Run
Represents a single execution of a workflow, skill, or terminal-linked operational action.

Examples:
- one daily briefing generation
- one meeting prep run
- one workflow invocation triggered by a connector refresh

Purpose:
- central accountability and audit object
- basis for run history, approvals, and execution tracking UX

Suggested fields:
- `id`
- `workspaceId`
- `workflowId?`
- `skillId?`
- `executorId?`
- `triggerType`
- `status`
- `startedAt`
- `completedAt?`
- `inputSnapshotRef?`
- `outputSnapshotRef?`
- `artifactIds[]`
- `sideEffectRefs[]`
- `approvalRequestIds[]`
- `logRef?`
- `sensitivityClass`

Suggested statuses:
- `queued`
- `running`
- `awaiting_approval`
- `completed`
- `partial`
- `failed`
- `cancelled`

This object is critical because the product aims to make automation visible and trackable.

### Calendar

### Role
Time-based operational planning and meeting coordination surface.

### Core question it answers
**"What is happening across my schedule, and what work is attached to it?"**

### Primary content blocks
- day view
- week view
- agenda/list view
- event detail panel
- linked artifacts and preparation state
- event-related follow-ups
- recent event-related runs

### Supported object types
- Event
- Artifact
- FollowUp
- WatchItem
- Run

### Interaction patterns
- open event details
- launch meeting-prep workflow
- open linked artifact
- create follow-up from event
- inspect related run history
- open source provider reference

### UX notes
The calendar should feel like an operational calendar rather than a generic scheduling grid. It should be closely connected to workflows, artifacts, and follow-through.

## InboxItem
Represents a new item requiring triage or user attention.

Examples:
- newly synced high-priority task
- unreviewed meeting artifact
- workflow result awaiting review
- flagged connector error
- identified follow-up candidate

Purpose:
- create a first-class triage model
- prevent important operational inputs from disappearing into dashboards or logs

Suggested fields:
- `id`
- `workspaceId`
- `inboxType`
- `title`
- `summary`
- `status`
- `sourceKind`
- `sourceRef`
- `createdAt`
- `updatedAt`
- `priority`
- `relatedEntityIds[]`
- `relatedArtifactIds[]`
- `sensitivityClass`

Suggested statuses:
- `new`
- `triaged`
- `snoozed`
- `resolved`
- `dismissed`

This is one of the product objects that helps distinguish the app from a notes tool.

### FollowUp
Represents an action or commitment that should be tracked after an artifact, workflow, meeting, or triage event.

Examples:
- send recap
- update ticket
- prepare response
- verify blocker removal
- schedule next review

Purpose:
- make follow-through first-class
- connect generated outputs to actual operational accountability

Suggested fields:
- `id`
- `workspaceId`
- `title`
- `description?`
- `status`
- `originType`
- `originRef`
- `ownerProfileId?`
- `dueAt?`
- `priority`
- `relatedArtifactIds[]`
- `relatedEntityIds[]`
- `createdAt`
- `updatedAt`
- `completedAt?`
- `sensitivityClass`

Suggested statuses:
- `open`
- `in_progress`
- `blocked`
- `done`
- `cancelled`

### WatchItem
Represents something that should remain visible because it may require attention, but is not an immediate follow-up task.

Examples:
- project risk
- ticket cluster drifting toward delay
- unresolved dependency
- ongoing stakeholder concern
- waiting on external response

Purpose:
- capture "keep an eye on this" state that is common in operational work but poorly served by note/task products

Suggested fields:
- `id`
- `workspaceId`
- `title`
- `summary`
- `status`
- `watchType`
- `sourceRef`
- `severity`
- `relatedEntityIds[]`
- `relatedArtifactIds[]`
- `reviewAt?`
- `createdAt`
- `updatedAt`
- `sensitivityClass`

Suggested statuses:
- `active`
- `monitoring`
- `resolved`
- `archived`

This is another key differentiation object for an operations-first workspace.

### Queue
Represents a purposeful collection of workspace items grouped by operational function rather than folder hierarchy.

Examples:
- inbox queue
- approvals queue
- blocked follow-ups queue
- review queue
- connector issues queue

Purpose:
- allow operational grouping and filtering
- support dashboard-like workflows without making everything a dashboard widget

Suggested fields:
- `id`
- `workspaceId`
- `name`
- `queueType`
- `filterDefinition`
- `sortDefinition`
- `viewMode`
- `createdAt`
- `updatedAt`

Notes:
- queues may be system-defined or user-defined later
- queues are closer to operational lenses than storage containers

### ApprovalRequest
Represents an explicit approval gate for a run, side effect, or artifact publication.

Examples:
- approve writing artifact
- approve sending data to premium AI
- approve updating external ticket
- approve publishing a generated summary

Purpose:
- make automation and side effects visible and controllable
- support security-sensitive and regulated workflows later

Suggested fields:
- `id`
- `workspaceId`
- `runId`
- `approvalType`
- `status`
- `requestSummary`
- `requestedAt`
- `resolvedAt?`
- `resolverProfileId?`
- `affectedRefs[]`
- `sensitivityClass`

Suggested statuses:
- `pending`
- `approved`
- `rejected`
- `expired`

### ConnectorInstallation
Represents a connector configured in a workspace.

Purpose:
- separate connector package definition from workspace-specific installation state

Suggested fields:
- `id`
- `workspaceId`
- `connectorId`
- `displayName`
- `status`
- `configRef`
- `authState`
- `lastSyncAt?`
- `freshnessState`
- `errorState?`
- `createdAt`
- `updatedAt`

Suggested statuses:
- `configured`
- `auth_required`
- `active`
- `error`
- `disabled`

### SkillInstallation
Represents a skill package available and configured in a workspace.

Purpose:
- separate packaged skill definition from workspace-specific enablement/configuration

Suggested fields:
- `id`
- `workspaceId`
- `skillId`
- `displayName`
- `status`
- `configRef`
- `createdAt`
- `updatedAt`

Suggested statuses:
- `enabled`
- `disabled`
- `deprecated`

### PolicyProfile
Represents a reusable policy/sensitivity configuration for a workspace or workflow context.

Examples:
- local-safe mode
- premium-ai allowed
- sensitive-content restricted
- HIPAA-forward restricted mode

Purpose:
- support policy-aware operation without scattering conditionals throughout the system

Suggested fields:
- `id`
- `workspaceId`
- `name`
- `description`
- `policyFlags`
- `allowedRemoteCategories[]`
- `aiAccessMode`
- `syncMode`
- `loggingMode`
- `createdAt`
- `updatedAt`

### ViewState
Represents user- or workspace-specific persisted UI state for operational views.

Examples:
- selected queue filters
- panel layout
- Today view collapsed sections
- preferred groupings

Purpose:
- preserve a flexible workspace feel without confusing it with domain data

Suggested fields:
- `id`
- `workspaceId`
- `viewKey`
- `stateBlob`
- `updatedAt`

## Relationships between objects

### External source to workspace object relationships
- canonical entities can be inputs to workflows
- artifacts may reference one or many canonical entities
- follow-ups may originate from artifacts or directly from canonical entities
- watch items may reference canonical entities and artifacts

### Product-native relationships
- a `Workflow` can produce many `Run`s
- a `Run` can produce many `Artifact`s
- a `Run` can generate `ApprovalRequest`s
- an `Artifact` can generate `FollowUp`s
- `InboxItem`s may resolve into `FollowUp`s, `WatchItem`s, or `Artifact`s
- a `Queue` is a filtered lens across `InboxItem`, `FollowUp`, `WatchItem`, `ApprovalRequest`, and other trackable objects

## Domain separation principle

A critical architectural rule:

### Canonical entities are not the whole product model
Connector-derived entities describe the outside world.
The product-native model describes how the workspace helps the user operate on that world.

This separation is essential because it prevents the product from becoming "just a UI on top of synced external objects."

## Suggested first-class status surfaces in UX
The domain model suggests the app should prominently expose:
- new inbox items
- open follow-ups
- active watch items
- pending approvals
- recent/failed runs
- active artifacts
- stale connectors or stale source context

These are much more aligned with operational work than generic note or folder trees.

## Persistence guidance by object type

### Likely structured-store objects
- Workspace
- Workflow
- Run
- InboxItem
- FollowUp
- WatchItem
- Queue
- ApprovalRequest
- ConnectorInstallation
- SkillInstallation
- PolicyProfile
- ViewState

### Likely hybrid/file-backed objects
- Artifact
  - metadata in structured store
  - content file or content blob depending on artifact type

### Connector-derived canonical entities
- stored in structured store with references to raw metadata/cache as appropriate

## Sync implications
The domain model is intentionally sync-friendly:
- product-native objects are explicit and serializable
- artifacts can sync as metadata + content
- runs and approvals can sync as structured records
- policy profiles can be workspace-scoped
- view state can sync selectively or per-device later

## Mobile implications
The domain model is also mobile-friendly because mobile can focus on consuming selected workspace objects such as:
- Artifact
- FollowUp
- WatchItem
- ApprovalRequest
- InboxItem
- Run

without requiring full desktop workflow parity.

## Recommended v1 focus objects
To avoid overbuilding, v1 should treat these as primary first-class objects:
- Workspace
- Artifact
- Workflow
- Run
- InboxItem
- FollowUp
- ConnectorInstallation
- SkillInstallation
- ViewState
- Event (as a prominently surfaced canonical object because Calendar is a core feature)

Second-wave objects:
- WatchItem
- Queue
- ApprovalRequest
- PolicyProfile

## Summary
The workspace domain model should center the product around operational artifacts, workflows, runs, triage, and follow-through rather than around generic notes or folders. This is the conceptual foundation that makes the product an operations workspace instead of a note-taking tool with integrations.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_navigation_and_ia|Desktop Navigation and IA]]