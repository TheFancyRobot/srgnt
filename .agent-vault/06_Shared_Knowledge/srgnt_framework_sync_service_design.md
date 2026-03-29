---
note_type: shared_knowledge
title: Sync Service Design
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - sync
  - convex
  - encryption
---

# Sync Service Technical Design (Initial)

## Sync storage requirement note
The future sync service must not become the primary storage system for raw user workspace data.

Convex or any future sync backend should be used for:
- encrypted sync payloads
- sync metadata
- device/account state
- user settings
- coordination state

It should not be treated as the readable authoritative store for local workspace content.

## Purpose
Define the initial design direction for the future paid sync service so the desktop product is built in a sync-compatible way from the start.

## Product role
The sync service is a paid add-on that provides:
- encrypted cloud sync
- multi-device continuity
- backup/recovery
- eventual mobile continuity

It is not required for the base product to provide value.

## Design goals
- preserve local-first behavior
- avoid cloud dependency for core usability
- support multi-device state continuity later
- design with future HIPAA-sensitive constraints in mind
- minimize remote plaintext exposure for sensitive data classes

## Recommended sync model
Use a sync architecture built around:
- device registration
- per-workspace sync state
- structured metadata synchronization
- encrypted content storage
- explicit conflict handling strategy

## Candidate backend
Convex is a reasonable candidate for:
- account state
- subscription state
- sync metadata
- realtime coordination
- device records
- job/state updates

Use with caution for sensitive plaintext content. Prefer client-side encryption paths for higher-sensitivity categories.

## What should sync
Initial sync candidates:
- workspace metadata
- artifact metadata
- selected artifact content
- run history metadata
- connector configuration metadata
- local preferences/layouts
- sync cursors and change records

## What should not sync by default
- secrets/tokens
- unrestricted terminal transcripts
- raw sensitive content without policy review
- debug logs containing sensitive data

## Sync unit model
Consider sync units such as:
- artifact records
- artifact content blobs
- entity snapshots or views
- run records
- workflow states
- settings/preferences

## Encryption direction
At minimum:
- encryption in transit
- encryption at rest on backend

HIPAA-forward direction:
- support client-side encryption for sensitive content categories
- separate metadata from encrypted content blobs where possible
- design key management with future regulated use in mind

## Conflict strategy direction
For v1 sync beta:
- prefer conservative conflict detection
- use explicit last-modified/version metadata
- surface conflicts visibly instead of hiding them
- keep merge behavior simple and trustworthy

## Device model
The service should support:
- device registration
- device revocation
- per-device sync cursors
- future remote wipe or access revocation strategies

## Relationship to mobile
The sync service is what makes a future mobile client practical.

Mobile can initially use sync to:
- access artifacts
- review runs
- approve actions
- view daily briefings

without requiring full desktop workflow parity.

## Security implications
The sync service must respect the data classification matrix.

Rules:
- Class C should not sync as general content
- Class D should have a client-side encryption path
- sync logs should not expose content unnecessarily
- backend access should be minimized and auditable

## Summary
The paid sync service should be designed as an optional encrypted continuity layer built on top of a local-first workspace architecture, with Convex as a plausible backend for metadata/realtime coordination and a path toward stronger client-side encryption for sensitive content.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[06_Shared_Knowledge/srgnt_framework_data_classification_matrix|Data Classification Matrix]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]]
