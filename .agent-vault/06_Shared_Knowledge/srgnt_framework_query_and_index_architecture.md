---
note_type: shared_knowledge
title: Workspace Query and Index Architecture
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
---

## 13. Workspace Query and Index Architecture

### Purpose
Define the architecture for local querying, indexing, and saved-view computation across the workspace.

This subsystem is required to support:
- dashboard widgets
- artifact filters and saved views
- calendar-derived agenda views
- review and tracking surfaces later
- user-authored queries similar in spirit to Obsidian Dataview

## Core principle
The query/index layer is a **local acceleration and interpretation layer**, not the source of truth.

Source of truth remains:
- local workspace files
- file-backed artifact content
- local workspace metadata files/structures
- product-native object records stored as local-first workspace state

## Responsibilities
The workspace query and index layer should:
- scan and interpret local workspace data
- maintain a local index of queryable objects and fields
- expose a user-friendly query language
- support saved queries and dashboard/widget execution
- unify querying across product-native and connector-derived objects
- provide stable object references back to the workspace

## Queryable object families
The query system should support, at minimum:
- Artifact
- Workflow
- Run
- InboxItem
- FollowUp
- WatchItem
- ApprovalRequest
- ConnectorInstallation
- Event
- Task
- Message
- Project

## Data sources for indexing
The local index should be built from:
- artifact metadata
- artifact frontmatter/structured metadata where applicable
- workspace object records
- canonical connector entity records
- relationships between objects
- status fields and timestamps
- saved views and query definitions

## Indexing model
Recommended indexing approach:
- watch the workspace for file and metadata changes
- incrementally update local indexes
- materialize normalized queryable rows/documents internally
- preserve references to original workspace objects/files

### Important boundary
The index can use local optimized storage structures if needed, but it must remain:
- local to the device
- derived from workspace state
- rebuildable from the local workspace if necessary

## Query execution goals
The query system should support:
- filtering
- sorting
- grouping
- projection
- aggregation later
- rendering into common result shapes such as lists, tables, task-like result sets, calendar/agenda result sets, and dashboard widgets

## Query output types
Recommended result/output forms:
- list
- table
- grouped list
- agenda/event list
- card collection
- scalar metric for dashboard widgets

## Saved queries and views
The query system should support saved query definitions for:
- dashboards
- artifact saved views
- review surfaces later
- queue-like operational lenses

Saved queries should be file-backed or workspace-metadata-backed so they remain part of the local-first model.

## Runtime boundaries
The query/index layer should be a core local package, not a remote service.

Dependencies may include:
- local filesystem watchers
- metadata parsers
- relationship resolvers
- local index storage
- query parser/evaluator

## Security and privacy implications
The query/index layer must:
- stay local-first
- avoid sending raw queryable content to remote services by default
- respect sensitivity classifications for indexed fields where relevant
- support future policy restrictions for regulated content

## Summary
The workspace query and index layer should act as a local-first, rebuildable query engine over file-backed workspace data and product-native objects, enabling powerful dashboarding and saved views without replacing the local workspace as the source of truth.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_dataview_strategy|Dataview Compatibility Strategy]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage and Persistence Model]]
- [[06_Shared_Knowledge/srgnt_framework_component_inventory_and_data_contracts|Screen Component Inventory and Data Contracts]]
