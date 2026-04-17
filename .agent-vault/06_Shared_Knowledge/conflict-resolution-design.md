---
note_type: shared_knowledge
title: Conflict Resolution Design
created: '2026-04-16'
updated: '2026-04-16'
tags:
  - architecture
  - sync
  - conflict-resolution
---

# Conflict Resolution Design

## Purpose
Define how sync conflicts are detected, resolved, and recovered. This ensures the sync architecture handles real-world scenarios where multiple devices edit the same content offline.

## Core Principles

1. **Visible conflicts**: Conflicts surface to users instead of being silently resolved
2. **Local authority**: The local workspace is always the authoritative store
3. **Manual for body**: Markdown body conflicts require manual resolution
4. **Auto for metadata**: Non-overlapping frontmatter changes can merge automatically
5. **Derived rebuild**: Dataview indexes are derived and never conflict-resolved

## Conflict Types

```typescript
enum ConflictType {
  FrontmatterField = 'frontmatterField',   // YAML frontmatter fields diverge
  MarkdownBody = 'markdownBody',           // Markdown content diverges
  FileDeleted = 'fileDeleted',             // One device deleted, other modified
  FileCreatedBoth = 'fileCreatedBoth',     // Same file created independently
}
```

## Conflict Scenarios and Verdict Table

| Scenario | Verdict | Resolution Strategy |
|----------|---------|-------------------|
| Offline edits - non-overlapping frontmatter | PASS | Auto-merge: union of non-conflicting fields |
| Offline edits - overlapping frontmatter | PASS | Auto-merge: latest timestamp wins per field |
| Offline edits - body text changes | PASS | Manual resolution with conflict markers for review |
| Reconnect drift - same file edited on multiple devices | PASS | Field-level merge for frontmatter, manual for body |
| Stale Dataview indexes | PASS | Indexes rebuilt after sync completes |
| Device loss | PASS | Revoked device cannot sync; data preserved on other devices |
| Conflicting YAML frontmatter | PASS | Field-level merge for non-overlapping; pending for overlapping |
| Conflicting markdown body | PASS | Conflict markers inserted; manual resolution required |
| Deleted on one device, modified on another | NEEDS-WORK | Current: preserve newer version with warning marker |
| Binary attachment divergence | FAIL | No auto-merge; requires manual resolution or last-write-wins |

## Merge Strategies

```typescript
enum MergeStrategy {
  LastWriteWins = 'lastWriteWins',         // Latest timestamp wins
  FieldLevelMerge = 'fieldLevelMerge',     // Auto-merge non-overlapping fields
  ManualResolution = 'manualResolution',  // User must resolve
}
```

### Frontmatter Merge Rules
1. Non-overlapping fields: automatically merged (union)
2. Overlapping fields: latest timestamp wins
3. Required fields: preserved from both, flagged if different
4. Tags: union of both devices' tags

### Body Merge Rules
1. **Non-overlapping changes**: conflict markers inserted, user reviews
2. **Conflicting changes**: conflict markers inserted, manual resolution required
3. **Last-write-wins**: used when auto-merge is not appropriate

## Markdown File Conflict Format

When manual resolution is needed, conflict markers are inserted:

```markdown
# Title

<<<<<<< LOCAL (device-desktop-1, 2026-03-25T14:30:00Z)
Content from local device
=======
Content from remote device
>>>>>>> REMOTE (device-mobile-1, 2026-03-25T16:45:00Z)

Additional context that is the same on both...
```

## Deleted vs Modified Handling

### Current Behavior (NEEDS-WORK)
When one device deletes a file and another device modifies it:

1. The modification is newer than the delete
2. Content is preserved with a restoration marker
3. User is notified of the restoration

### Ideal Behavior (FUTURE)
- Present user with choice: restore or keep deleted
- Option to archive conflicting versions

## Dataview Index Handling

### Rule
Dataview indexes are **derived**, not authoritative. They are **never conflict-resolved**.

### Sync Behavior
1. On sync, markdown files are reconciled
2. After reconciliation, Dataview indexes are rebuilt
3. Any index divergence is automatically resolved by the rebuild

### Rebuild Triggers
- After any sync operation
- When workspace opens
- Manual trigger available to user

## Attachment Strategy

### Binary Attachments
- **No field-level merge**: binary content cannot be meaningfully merged
- **Options**:
  1. Last-write-wins + conflict copy of losing version
  2. Manual resolution required

### Current Design Decision
Binary attachments use **last-write-wins with conflict copy**:
- Newest timestamp wins as the primary
- Loser is preserved as `<filename>.conflict.<timestamp>`

## Rollback and Rebuild Expectations

### Dataview Indexes
| Event | Rebuild Required? | Method |
|-------|------------------|--------|
| Sync completes | Yes | Rebuild from synced markdown |
| Conflict resolved | Yes | Rebuild affected indexes |
| Workspace opens | Optional | User-triggered or auto |

### Artifact Cache
| Event | Rebuild Required? | Method |
|-------|------------------|--------|
| Sync completes | Optional | Cache invalidated, rebuilt on access |
| Conflict resolved | Optional | Affected artifacts re-generated |

## Failure Scenarios

### Scenario: Sync fails mid-transfer
**Handling**:
- Transaction not committed
- Client retries on next sync attempt
- No partial state stored

### Scenario: Device goes offline during conflict resolution
**Handling**:
- Conflict remains pending
- Other devices see conflict
- Resolution completes when device reconnects

### Scenario: All devices lose sync state
**Handling**:
- Each device has local state
- On reconnect, devices sync from last known cursor
- Conflicts surfaced as pending

## Test Fixtures

See `packages/sync/src/test-fixtures/`:
- `conflicting-frontmatter.fixture.ts` — frontmatter merge scenarios
- `conflicting-body.fixture.ts` — body conflict with manual resolution
- `deleted-vs-modified.fixture.ts` — delete vs modify scenario
- `offline-reconnect.fixture.ts` — offline edits with multiple devices

## Open Issues

1. **Deleted vs Modified UX**: Current preservation-with-warning may not match user intent. Need user research.

2. **Binary Conflict Copy**: Storage implications of keeping conflict copies need validation.

3. **Large File Conflicts**: Performance of conflict detection and marker insertion for large markdown files.

## Related Notes

- [[sync-architecture|Sync Architecture]] — sync protocol and architecture
- [[data-classification-matrix|Data Classification Matrix]] — data class sync eligibility
