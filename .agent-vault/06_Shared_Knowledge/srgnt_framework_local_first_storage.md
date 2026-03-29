---
note_type: shared_knowledge
title: Local-First Storage and Persistence Model
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - storage
---

## 15. Local-First Storage and Persistence Model

### Purpose
Formalize the local-first storage model so the product's source-of-truth boundaries are explicit before development begins.

## Core principle
The product is **local-first and file-based**.

This means:
- raw user workspace data lives locally on disk
- the local workspace is the authoritative source of truth
- remote services are optional continuity layers, not primary storage authorities

## Authoritative local data categories
The local workspace should authoritatively contain:
- artifact content
- artifact metadata
- workflow definitions and configuration where workspace-scoped
- saved queries and dashboard definitions
- product-native workspace objects
- connector-derived canonical entity records or references as designed
- local logs and run history subject to retention policies

## Local storage model
Recommended local storage composition:

### File-backed workspace content
Use files for:
- artifacts
- saved queries/views where practical
- dashboard definitions where practical
- workspace-level configuration files
- templates
- import/export-friendly content

### Local metadata/index layer
Use a local derived metadata/index layer for:
- fast lookups
- relationships
- query execution
- status tracking
- run history lookup
- connector freshness
- incremental indexing

### Secret storage
Use OS-native secure storage for:
- tokens
- API credentials
- sensitive secrets

## What not to do
Do not make these architectural mistakes:
- treating a remote backend as the readable source of truth for user workspace content
- making the local app dependent on a remote database to function
- storing secrets in general-purpose workspace files
- making the local query/index layer the only authoritative copy of user content

## Relationship to Convex
Convex is a reasonable future layer for:
- encrypted sync payloads
- account and subscription state
- device registration and sync metadata
- user settings
- premium orchestration coordination

Convex should not be treated as:
- the primary readable store of raw user workspace data
- the only place where important product state exists

## Sync model implications
Because the workspace is authoritative locally:
- sync must operate as replication/continuity, not primary persistence
- encrypted payloads should be derived from local workspace state
- conflict handling must respect the local-first model
- the product should remain useful when sync is unavailable

## Query/index implications
Because the workspace is file-based and local-first:
- the query/index layer must be rebuildable
- indexes should be derived from local workspace state
- dashboards and saved views should continue to work offline using the local index

## Development guidance
Before starting development, teams should assume:
- every major product object has a local representation
- every remote interaction is optional or additive unless explicitly designated otherwise
- every important screen must have a local-first behavior model

## Summary
The product's storage architecture should be explicitly local-first and file-based, with remote services such as Convex used only for encrypted sync, settings, and premium coordination rather than as the authoritative storage layer for raw user workspace data.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_query_and_index_architecture|Workspace Query and Index Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_dataview_strategy|Dataview Compatibility Strategy]]
- [[06_Shared_Knowledge/srgnt_framework_sync_service_design|Sync Service Technical Design]]
