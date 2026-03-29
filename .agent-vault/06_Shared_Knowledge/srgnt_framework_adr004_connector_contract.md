---
note_type: shared_knowledge
title: ADR-004 Connector Contract and Capability Model
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - adr
---

# ADR-004: Connector Contract and Capability Model

**Status:** Proposed  
**Date:** 2026-03-17  
**Decision Owner:** Framework Core  
**Scope:** v1 contract for external system integration packages

## Context

Connectors integrate external systems such as Jira, Outlook, Teams, Slack, GitHub, and others into the framework.

Without a standard connector contract, each integration would expose ad hoc behavior, making discovery, permissions, and skill compatibility difficult.

We need a connector model that answers:
- what the connector provides
- how it syncs or reads data
- what canonical entities it can produce
- what actions it can perform
- what permissions a skill may request through it

## Decision

We will define connectors as installable packages with a required manifest, initially `connector.yaml`, plus a runtime implementation that adheres to a stable connector SDK.

Connectors will expose **capabilities**, which are the primary mechanism by which skills declare and resolve dependencies.

## Capability model

Capabilities are namespaced strings describing what a connector can do.

Examples:
- `tasks.read`
- `tasks.write`
- `events.read`
- `messages.read`
- `threads.read`
- `documents.read`
- `documents.search`
- `mail.draft`
- `mail.send`
- `tickets.transition`

Capabilities describe intent, not vendor names.

## Required connector manifest fields

Proposed v1 fields:

```yaml
id: jira
name: Jira Connector
version: 0.1.0
provider: atlassian-jira
summary: Sync Jira projects and issues into canonical task and project entities.
author: example-author
capabilities:
  - tasks.read
  - projects.read
  - tickets.transition
auth:
  type: oauth2
entitiesProduced:
  - task
  - project
syncModes:
  - manual
  - scheduled
settingsSchema: schemas/settings.schema.json
```

## Connector responsibilities

A connector is responsible for:
- defining and exposing its capabilities
- authenticating to its provider through host-supported flows
- reading and/or writing provider data
- mapping provider data to canonical entities
- retaining provider metadata
- reporting sync status and errors
- respecting runtime permission controls

## Connector interface direction

A connector implementation should conceptually support functions such as:
- `getManifest()`
- `checkAuth()`
- `syncEntities()`
- `listCapabilities()`
- `performAction(capability, payload)`
- `getSyncStatus()`

The exact SDK shape will be defined in implementation, but these concerns are required.

## Capability resolution

Skills declare required capabilities in their manifest.

At runtime:
1. the host collects available connector capabilities
2. the runtime resolves which connectors can satisfy the skill
3. if multiple connectors satisfy a capability, host policy or user choice determines the source
4. the skill receives canonical entities or action surfaces associated with those capabilities

## Read vs write capabilities

Capabilities must distinguish read access from write/side-effect access.

Examples:
- `tasks.read` vs `tasks.write`
- `mail.draft` vs `mail.send`
- `documents.read` vs `documents.write`

This distinction is required for trust and approval flows.

## Why this decision was made

A capability model is necessary because:
- skills should depend on behavior, not vendor names
- permissions must be understandable to users
- the runtime must validate dependencies before execution
- multiple connectors should be substitutable where possible

## Consequences

### Positive consequences
- skills are more portable across providers
- dependency resolution becomes structured
- package permissions can be surfaced clearly
- connector behavior is easier to reason about

### Negative consequences
- connector authors must implement mapping and capability declarations carefully
- some provider-specific nuances may not fit neatly into shared capability names

## Alternatives considered

### Alternative A: skills name specific connectors directly
Rejected because it increases coupling and reduces portability.

### Alternative B: connectors expose only custom functions without capabilities
Rejected because discovery and permission UX would be weak.

### Alternative C: connectors expose stable capability declarations and canonical entity mapping
Selected.

## Summary

Connectors will be installable packages that expose standardized capabilities and map provider data into canonical entities. Skills will depend on capabilities rather than vendor-specific connector names wherever possible.

---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003: Skill Manifest Specification]]
- [[06_Shared_Knowledge/srgnt_framework_adr005_executor_interface|ADR-005: Executor Interface]]
- [[06_Shared_Knowledge/srgnt_framework_product_concept|srgnt Product Concept]]
