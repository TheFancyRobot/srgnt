---
note_type: shared_knowledge
title: Data Classification Matrix
created: '2026-03-21'
updated: '2026-04-16'
tags:
  - architecture
  - security
  - data-classification
  - sync
---

# Data Classification Matrix

## Purpose
Provide a comprehensive data classification framework that defines what sync may and may not move. The local workspace is the authoritative store; sync is a continuity/replication layer, not a source of truth.

## Classification Levels

### DataClassification Enum
| Level | Description |
|-------|-------------|
| `public` | Non-sensitive, can be handled with standard protections |
| `internal` | Product operational data, requires standard protections |
| `confidential` | Sensitive operational content, requires encryption |
| `secret` | Credentials and secrets, must never leave secure storage |

### SyncEligibility Enum
| Eligibility | Description |
|-------------|-------------|
| `syncSafe` | Can be synced with standard protections |
| `encryptedOnly` | Must be encrypted in transit and at rest |
| `localOnly` | Must never be synced remotely |
| `rebuildable` | Derived/cached, can be rebuilt from authoritative sources |

## Classification Matrix

| Data Type | Format | Classification | Eligibility | Authoritative | Rationale |
|-----------|--------|----------------|-------------|---------------|-----------|
| Workspace markdown files | markdown-file | internal | syncSafe | authoritative | Primary user content. Workspace is authoritative store. |
| YAML frontmatter | yaml-frontmatter | internal | syncSafe | authoritative | Tied to file content. Syncs with the file. |
| Dataview indexes | derived-index | internal | rebuildable | derived | Rebuildable from source markdown files. Never synced as authoritative. |
| Connector credentials | secure-storage | secret | localOnly | authoritative | OAuth tokens, API keys. OS secure storage only. Must never leave device. |
| Crash logs | log-file | internal | localOnly | derived | Local diagnostics. Per DEC-0012, not synced remotely. |
| User settings | json-structured | internal | syncSafe | authoritative | UI preferences, layouts, feature flags. Standard sync with encryption at rest. |
| Run history | json-structured | internal | encryptedOnly | authoritative | Execution metadata. May contain sensitive context. Requires encryption in transit and at rest. |
| Approval records | json-structured | confidential | encryptedOnly | authoritative | Human approval decisions. Must be encrypted. |
| Artifact cache | binary-cache | internal | rebuildable | derived | Cached generated artifacts. Rebuildable from source. |
| Connector install metadata | json-structured | internal | syncSafe | authoritative | Connector installation state without secrets. Standard sync. |
| Terminal session transcripts | log-file | confidential | localOnly | derived | Session transcripts may contain sensitive output. Local-only by default. |
| AI/Fred request payloads | json-structured | confidential | encryptedOnly | derived | AI request metadata. May contain sensitive context. Requires encryption. |

## Schema Reference

See `packages/sync/src/schemas/classification.ts` for Effect Schema definitions:

```typescript
export const SDataClassification = Schema.Literal('public', 'internal', 'confidential', 'secret');
export const SSyncEligibility = Schema.Literal('syncSafe', 'encryptedOnly', 'localOnly', 'rebuildable');
export const SDataClassEntry = Schema.Struct({
  name: Schema.String,
  format: SStorageFormat,
  classification: SDataClassification,
  eligibility: SSyncEligibility,
  authoritative: SAuthoritative,
  rationale: Schema.String,
});
```

## Design Implications

1. **Local-first authority**: The workspace is always the authoritative store. Sync replicates, it does not replace.

2. **Class C (secret) never leaves device**: Credentials and secrets use OS-native secure storage and are never transmitted.

3. **Class D (confidential) requires encryption**: Run history, approval records, and AI payloads must use end-to-end encryption.

4. **Derived data is rebuildable**: Dataview indexes and artifact cache can be reconstructed from source markdown files.

5. **Sync eligibility can be overridden**: Frontmatter can carry `srgntClass` hints that sync tooling respects.

## Related Notes

- [[sync-architecture|Sync Architecture]] — encryption strategy, account model, sync protocol
- [[conflict-resolution-design|Conflict Resolution Design]] — conflict handling and recovery
- [[srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[srgnt_framework|SRGNT Product and Architecture Foundation]]
