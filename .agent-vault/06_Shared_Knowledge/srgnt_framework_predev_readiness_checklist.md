---
note_type: shared_knowledge
title: Pre-Development Readiness Checklist
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
---

## 16. Pre-Development Readiness Checklist

### Purpose
Capture the final architecture and product decisions that should be settled before implementation begins.

## Product identity
- [x] Product is a standalone operations workspace, not an Obsidian-based app
- [x] UX should feel familiar to Obsidian power users without being notes-first
- [x] Product is optimized for automation, tracking, artifacts, and follow-through

## Platform and shell
- [x] Desktop-first product direction established
- [x] Electron selected as desktop shell direction
- [x] Multi-pane command-center shell pattern defined
- [x] Terminal embedded as bottom utility panel, not the entire product

## Core architecture
- [x] Canonical entity model defined
- [x] Skill manifest direction defined
- [x] Connector capability model defined
- [x] Executor abstraction defined
- [x] Workspace domain model defined
- [x] Navigation and IA defined
- [x] Screen wireframes defined
- [x] Component inventory and data contracts defined

## Calendar
- [x] Calendar established as a core top-level product feature
- [x] Calendar owned by the product, not by any one connector
- [x] Connectors publish normalized events into the calendar model/API

## Local-first and storage
- [x] Local workspace defined as source of truth
- [x] File-based storage requirement established
- [x] Local metadata/index layer allowed as derived acceleration layer
- [x] Remote backend explicitly not treated as authoritative raw-data store

## Querying and dashboards
- [x] Workspace query/index layer defined as a core subsystem
- [x] Dataview-inspired compatibility strategy established
- [x] Dashboard and saved-view query use cases accounted for

## Sync and remote services
- [x] Convex positioned as future encrypted sync/settings/service-coordination layer
- [x] Sync explicitly framed as continuity/replication, not source of truth
- [x] Fred explicitly framed as optional premium orchestration layer

## Security and future HIPAA alignment
- [x] Security boundary model defined
- [x] Data classification matrix defined
- [x] Local secrets handling direction defined
- [x] Remote minimization and client-side encryption path considered

## Recommended final work before coding
1. Generate TypeScript interface/package-contract drafts from the domain model and screen contracts.
2. Produce a milestone-based engineering backlog with dependencies.
3. Define the exact local workspace on-disk layout and file formats.
4. Audit Dataview codebase for reuse/extraction feasibility.
5. Decide the local metadata/index implementation approach.
6. Draft the first repository skeleton and package boundaries.
7. Build the desktop shell prototype before implementing deep workflow logic.

## Summary
The srgnt product specification is now in a strong enough state to begin development planning. The remaining work before coding is primarily implementation translation: types, package contracts, workspace file layout, backlog breakdown, and Dataview feasibility assessment.

## Related Notes
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_v1_one_pager|V1 Foundation Pack: Product One-Pager]]
- [[06_Shared_Knowledge/srgnt_framework_milestone_roadmap|Initial Milestone Roadmap]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
