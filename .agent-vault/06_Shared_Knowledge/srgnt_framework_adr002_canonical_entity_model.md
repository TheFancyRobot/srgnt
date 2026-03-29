---
note_type: shared_knowledge
title: ADR-002 Canonical Entity Model
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - adr
---

# ADR-002: Canonical Entity Model

**Status:** Proposed  
**Date:** 2026-03-17  
**Decision Owner:** Framework Core  
**Scope:** v1 shared data model between connectors, skills, and executors

## Context

The framework will support multiple connectors that integrate with external systems such as Jira, Outlook, Teams, Slack, GitHub, and others.

If skills operate directly on provider-specific schemas, the system will quickly become hard to extend and maintain. Connector-specific assumptions would leak into skills, making each skill brittle and reducing reusability across providers.

We need a shared model that allows:
- multiple providers to map into common concepts
- skills to operate on stable abstractions
- executors to receive predictable structured context
- generated artifacts to reference durable semantic entities

## Decision

We will define and use a **canonical entity model** as the primary interface between connectors and skills.

Connectors must map provider-specific objects into canonical entities plus retained source metadata.

Skills should depend on canonical entities and declared capabilities, not raw provider schemas, unless a skill explicitly opts into provider-specific behavior.

## Selected v1 canonical entities

The v1 entity set will include:
- `Task`
- `Event`
- `Message`
- `Thread`
- `Person`
- `Project`
- `Document`
- `ActionItem`
- `Artifact`

## Core entity structure

Every canonical entity record will include a common envelope:

```ts
interface EntityRecord<TCanonical, TRaw = unknown> {
  id: string
  entityType:
    | 'task'
    | 'event'
    | 'message'
    | 'thread'
    | 'person'
    | 'project'
    | 'document'
    | 'action_item'
    | 'artifact'
  sourceConnector: string
  sourceObjectType: string
  sourceId: string
  canonicalData: TCanonical
  rawMetadata?: TRaw
  syncedAt: string
  createdAt?: string
  updatedAt?: string
  hash?: string
  references?: string[]
}
```

## Canonical entity definitions

### Task
Represents a unit of work from systems such as Jira, GitHub, Linear, Planner, or manually created tasks.

Suggested canonical fields:
- `title`
- `description`
- `status`
- `priority`
- `assigneeIds`
- `projectId`
- `dueDate`
- `labels`
- `url`
- `estimate`
- `parentTaskId`
- `blockedByIds`
- `sourceState`

### Event
Represents a calendar event or scheduled item.

Suggested canonical fields:
- `title`
- `description`
- `startTime`
- `endTime`
- `location`
- `attendeeIds`
- `organizerId`
- `status`
- `meetingUrl`
- `url`
- `allDay`
- `seriesId`

### Message
Represents an individual message in chat or email-like systems.

Suggested canonical fields:
- `subject`
- `bodyText`
- `bodyHtml?`
- `senderId`
- `recipientIds`
- `sentAt`
- `threadId`
- `channelId?`
- `importance`
- `url`

### Thread
Represents a message thread, chat thread, or email conversation.

Suggested canonical fields:
- `title`
- `participantIds`
- `messageIds`
- `lastMessageAt`
- `url`
- `channelId?`

### Person
Represents a human identity normalized across systems.

Suggested canonical fields:
- `displayName`
- `emails`
- `usernames`
- `externalIds`
- `role?`
- `teamIds?`
- `url?`

### Project
Represents a project, board, initiative, or workstream.

Suggested canonical fields:
- `name`
- `description`
- `status`
- `ownerIds`
- `url`
- `labels`

### Document
Represents a source document or note-like external artifact.

Suggested canonical fields:
- `title`
- `summary?`
- `url`
- `authorIds`
- `lastModifiedAt`
- `path?`
- `tags?`

### ActionItem
Represents a derived or synthesized action, often created from meetings, messages, or summaries.

Suggested canonical fields:
- `title`
- `description`
- `ownerIds`
- `dueDate?`
- `status`
- `sourceEntityIds`
- `artifactIds?`

### Artifact
Represents an output written by the framework into the vault or another target.

Suggested canonical fields:
- `title`
- `artifactType`
- `path`
- `generatedBySkillId`
- `generatedByRunId`
- `relatedEntityIds`
- `createdAt`
- `url?`

## Mapping rules

### Rule 1: connectors must preserve source metadata
Canonicalization should not destroy provider details. Provider-specific fields should remain accessible through `rawMetadata` or equivalent typed extension fields.

### Rule 2: canonical fields must be semantically stable
Canonical fields should describe meaning, not mirror any one provider's schema naming.

### Rule 3: missing data is allowed
Not every provider will support every field. Canonical entities may be partially populated.

### Rule 4: connectors own mapping responsibility
Skills must not be responsible for translating Jira fields or Outlook fields into canonical structures.

### Rule 5: provider-specific skills are allowed, but explicit
If a skill truly depends on provider-specific semantics, it must declare that requirement explicitly rather than quietly depending on raw metadata shape.

## Why this decision was made

The canonical model is required to:
- avoid schema sprawl across skills
- support multiple equivalent providers
- improve testability
- reduce ecosystem lock-in
- make execution context more predictable for agents

## Consequences

### Positive consequences
- skills become more portable
- connector responsibilities are clearer
- tests can use canonical fixtures
- community package authors have a stable abstraction layer

### Negative consequences
- mapping work moves into connector implementations
- some provider-specific richness must live outside the core canonical fields
- the canonical model must be carefully versioned over time

## Alternatives considered

### Alternative A: skills consume raw provider schemas
Rejected because it tightly couples skills to provider details and makes ecosystem growth brittle.

### Alternative B: provider-specific adapters inside each skill
Rejected because it duplicates translation logic and creates inconsistent behavior.

### Alternative C: canonical entity model with source metadata retention
Selected.

## Summary

We will use a canonical entity model as the boundary between connectors and skills. Connectors map provider objects into shared semantic entities while retaining raw provider metadata for advanced use cases.

---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003: Skill Manifest Specification]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004: Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr005_executor_interface|ADR-005: Executor Interface]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_product_concept|srgnt Product Concept]]
