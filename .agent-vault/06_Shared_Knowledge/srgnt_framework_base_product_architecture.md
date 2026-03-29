---
note_type: shared_knowledge
title: Base Product Architecture
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - product
  - architecture
---

# Base Product Architecture

## Purpose

Define the architecture for the initial product offering: a desktop-first command center that provides a local workspace, connector-driven context, generated artifacts, and terminal-based coding agent integration without requiring the premium Fred service.

This document assumes the product is named **srgnt**.

This document assumes:
- productization beyond the original Obsidian-only concept
- desktop app first
- mobile app later
- a free base tier
- a paid sync service later
- a premium AI orchestration add-on later
- eventual HIPAA-readiness as a non-functional architectural constraint

## Product boundary

The base product should be useful and complete without Fred.

The base product includes:
- local workspace and artifact system
- connector integration and sync
- terminal pane / coding-agent launch surface
- command center views
- skill-based workflows that do not require premium AI orchestration
- local logs, run history, and approvals
- optional cloud sync in a future paid tier

The base product should not depend on:
- remote AI orchestration
- always-on cloud services
- premium subscriptions for core usability

## Product goals for v1

1. Deliver a genuinely useful desktop workflow without requiring premium AI.
2. Preserve the original "command center" value proposition.
3. Build security, auditability, and permission boundaries early.
4. Keep the architecture compatible with future sync, mobile, and HIPAA-sensitive use cases.
5. Avoid coupling the base product to Fred or to any one AI runtime.

## Recommended client strategy

### Desktop
Use Electron as the desktop shell.

Rationale:
- mature packaging and update ecosystem
- strong TypeScript alignment
- mature security guidance and architecture patterns
- clean path for layered premium features
- lower risk than introducing Go-host + Bun/Fred runtime complexity in the same product shell

### Mobile
Treat mobile as a later, separate client built on shared contracts and shared backend services, not shared shell technology.

## High-level architecture

```text
Desktop Client (Electron)
├── UI Shell
│   ├── workspace/views
│   ├── connector management UI
│   ├── settings
│   ├── terminal panel
│   ├── run history / approvals
│   └── artifact browser/editor
│
├── Local Core Runtime
│   ├── canonical entity store
│   ├── skill runtime
│   ├── connector runtime
│   ├── permissions/policy engine
│   ├── logs/audit state
│   └── local cache/state
│
├── Privileged Local Services
│   ├── secret storage integration
│   ├── connector auth/session handling
│   ├── secure file operations
│   ├── terminal/agent process launching
│   └── optional sync client
│
└── Optional Remote Services
    ├── sync backend
    └── premium Fred backend
```

## Layer responsibilities

### 1. UI Shell
Responsibilities:
- render command center views
- render notes/artifacts and dashboards
- provide settings and connector installation flows
- provide run previews and approval UX
- host terminal and agent integration surfaces
- present logs and sync status

Rules:
- should not directly hold secrets
- should not directly handle privileged connector auth logic
- should not directly access sensitive local service capabilities without mediation

### 2. Local Core Runtime
Responsibilities:
- load manifests for skills/connectors/executors
- maintain canonical entities
- resolve capabilities
- orchestrate skill execution
- validate outputs
- persist local logs and run state
- enforce policy and approval rules

Rules:
- may operate offline where possible
- should be designed as shared packages, not renderer-only code
- should remain usable without Fred

### 3. Privileged Local Services
Responsibilities:
- integrate with OS secret storage
- perform connector auth handshakes
- manage sensitive tokens and session refresh
- launch terminal processes or agent processes
- manage secure file and local state operations
- communicate with remote sync or premium services

Rules:
- must be isolated from the renderer/UI surface
- should be the main trust boundary for sensitive local operations
- should be minimal and auditable

### 4. Optional Remote Services
Responsibilities:
- account/subscription state
- paid sync service
- Fred premium orchestration
- optional cross-device continuity

Rules:
- base product must continue to have standalone local value without them
- remote services should be optional, additive, and explicitly permissioned

## Data model direction

The base product should continue to use:
- canonical entities
- skill manifests
- connector capability model
- executor abstraction

This ensures:
- the desktop product can evolve into a platform
- mobile can reuse contracts later
- sync and premium services are layered onto stable local concepts

## Free tier scope recommendation

The free tier should include:
- local workspace
- local artifact generation
- connector integrations that work locally
- terminal integration for user-run coding agents
- command center/daily briefing workflows
- manual skill invocation
- read-only or limited automation

This tier must feel complete enough that users trust the product before considering paid upgrades.

## Deferred but planned features

### Paid Sync Service
Later layer that adds:
- encrypted cloud sync
- multi-device continuity
- backup/recovery
- sharing or collaboration only after careful design

### Premium Fred Add-on
Later layer that adds:
- in-app AI workflows
- advanced orchestration
- cross-artifact synthesis
- premium automation patterns
- possibly remote-assisted coordination across devices

## Product constraints that should be honored now

### Constraint 1: local-first foundation
The product should retain useful functionality when remote services are unavailable.

### Constraint 2: no secret handling in UI renderer
Sensitive tokens and privileged actions must be mediated through secure local boundaries.

### Constraint 3: base product cannot depend on premium orchestration
Fred is additive, not foundational.

### Constraint 4: sync-friendly state boundaries
Local state should be organized so later sync does not require architectural rewrites.

### Constraint 5: HIPAA-friendly path
Avoid decisions that force broad plaintext cloud storage of sensitive user content.

## Recommended implementation phases

### Phase A: local desktop MVP
- Electron shell
- local workspace/artifact system
- connector runtime
- terminal pane / agent launcher
- local daily briefing or command center flow
- local logs and approvals

### Phase B: hardening
- secure storage
- updater pipeline
- crash/error reporting with redaction controls
- packaging and distribution
- performance tuning

### Phase C: paid sync beta
- encrypted sync design
- account/subscription model
- device registration and sync conflict strategy

### Phase D: Fred premium beta
- premium orchestration hooks
- optional in-app AI surfaces
- account-aware premium features

## Summary

The base product architecture should prioritize a strong, secure, local-first desktop experience that preserves the original command-center value proposition without relying on Fred or cloud services for core usefulness.

---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_product_concept|srgnt Product Concept]]
- [[06_Shared_Knowledge/srgnt_framework_fred_integration|Fred Integration Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003: Skill Manifest Specification]]