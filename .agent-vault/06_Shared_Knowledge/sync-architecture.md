---
note_type: shared_knowledge
title: Sync Architecture
created: '2026-03-21'
updated: '2026-04-16'
tags:
  - architecture
  - sync
  - encryption
---

# Sync Architecture

## Overview

The sync service provides encrypted cloud sync, multi-device continuity, and backup/recovery for the local-first workspace. The local workspace is the **authoritative store**; the sync backend stores encrypted replicas only.

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL WORKSPACE                         │
│  (Authoritative Store - Markdown Files + Frontmatter)      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    [Sync Engine]
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   ENCRYPTED PAYLOADS                         │
│  (Content encrypted client-side, key material never leaves  │
│   local device, renderer never touches key material)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SYNC BACKEND (Convex)                     │
│  (Encrypted replicas + metadata + coordination state)      │
└─────────────────────────────────────────────────────────────┘
```

## Sync Model

### Core Principles
1. **Local-first**: The workspace directory is always the authoritative source of truth.
2. **Encrypted replicas**: Remote storage contains encrypted payloads that cannot be read without local key material.
3. **Renderer isolation**: Key material and decryption logic live in the main process or worker, never in the renderer.
4. **Explicit conflicts**: Conflicts surface visibly instead of being silently resolved.

### What Syncs

| Data Class | Sync Eligibility | Encryption |
|------------|-----------------|------------|
| Workspace markdown files | syncSafe | Encrypted at rest + in transit |
| YAML frontmatter | syncSafe | Encrypted with file |
| User settings | syncSafe | Encrypted at rest |
| Run history | encryptedOnly | E2E encrypted |
| Approval records | encryptedOnly | E2E encrypted |
| Connector credentials | localOnly | N/A - never synced |
| Crash logs | localOnly | N/A - never synced |
| Dataview indexes | rebuildable | Not synced - rebuilt locally |

### What Does NOT Sync
- Secrets/credentials stored in OS secure storage
- Crash logs and debug data
- Terminal session transcripts (by default)
- Dataview indexes (derived, rebuilt from source)

## Encryption Strategy

### Client-Side Encryption
- Content is encrypted before leaving the local device
- Key material never transmitted to backend
- Renderer process never handles raw content or keys

### Encryption Layers
1. **In transit**: TLS for all network communication
2. **At rest**: Client-side encryption with per-file or per-payload keys
3. **Key exchange**: Public key infrastructure for device key rotation

### Key Management
- Each device has a unique encryption key pair
- File keys are encrypted with device key and stored in payload metadata
- Key material stored in OS secure storage (Keychain/Credential Manager)

## Account Model

### Account Types
| Tier | Capabilities |
|------|-------------|
| Free | Basic sync, 2 devices |
| Premium | Full sync, unlimited devices, recovery |

### Account Data
- User identity (email, display name)
- Subscription tier
- Device registry
- Sync cursors and change tracking

## Device Model

### Device Registration
- Each device registers with a unique device ID
- Device public key stored in account service
- Device can be remotely revoked

### Device Lifecycle
1. **Registration**: Device added to user's device registry
2. **Active**: Device participates in sync
3. **Revoked**: Device removed, local data preserved, no new sync
4. **Recovery**: Device can re-register after revocation

## Sync Protocol (Design Sketch)

### Push Flow
1. Local workspace detects file changes
2. Changes packaged as payloads with metadata envelope
3. Content encrypted client-side
4. Encrypted payloads sent to sync backend
5. Backend acknowledges and updates sync cursor

### Pull Flow
1. Client requests changes since last sync cursor
2. Backend returns encrypted payloads
3. Client decrypts locally using device key
4. Changes applied to local workspace
5. Conflicts surfaced for manual resolution

### Markdown + Frontmatter Handling
- Files treated as `(frontmatter, body)` tuples
- Frontmatter fields can be merged field-level
- Body conflicts require manual resolution with conflict markers
- Dataview indexes rebuilt after sync completes

## Key Rotation

### Purpose
Key rotation allows periodic replacement of encryption keys without losing access to synced data.

### Process
1. New key pair generated on device
2. Existing file keys re-encrypted with new key
3. New public key registered with account service
4. Old key marked deprecated but retained for pending payloads
5. After all devices have new key, old key retired

### Timeline
| Phase | Action |
|-------|--------|
| T+0 | New key generated |
| T+1 | File keys re-encrypted |
| T+2 | New public key registered |
| T+3 | Old key deprecated |
| T+4 | Old key retired (after grace period) |

### Device Key Rotation
- Per-device: Each device can rotate its key independently
- Account-level: Emergency rotation invalidates all device keys

## Device Revocation

### Process
1. User or admin initiates revocation for a device
2. Backend marks device as revoked
3. Revoked device receives revocation notice on next sync
4. Revoked device stops sending/receiving sync
5. Local data on revoked device preserved

### Verdict Table

| Scenario | Outcome |
|----------|---------|
| Device lost/stolen | Remote wipe NOT performed. Local data preserved. Revocation prevents future sync. User can recover by re-registering on new device. |
| Device sold | Revocation prevents new owner from accessing sync. Previous owner's data preserved on other devices. |
| Employee departure | Revocation prevents former employee device from syncing. Data preserved per company policy. |
| Compromised device | Revocation prevents attacker from syncing. Incident response may require key rotation. |

## Account Recovery

### Recovery Scenarios

| Scenario | Pass/Fail | Notes |
|----------|-----------|-------|
| User remembers password | PASS | Full account recovery with existing devices |
| User forgot password, has device | PASS | Recovery via device verification |
| User forgot password, no device | FAIL | Account cannot be recovered without identity verification |
| Device loss, has another device | PASS | New device registers, syncs from cloud replicas |
| All devices lost | FAIL | Without device verification, account cannot be recovered |

### Data Loss Prevention
- Encrypted replicas on backend enable new device to sync state
- Key material on lost devices cannot be recovered
- User should export critical data before losing all devices

### Recovery Process (with at least one device)
1. User installs app on new device or recovers existing
2. User authenticates with credentials
3. Device verification confirms device identity
4. Key material restored from secure backup or re-established
5. Sync resumes, pulling latest state from backend

## Conflict Handling

### Conflict Types
- **Frontmatter field**: Non-overlapping changes can merge automatically
- **Markdown body**: Requires manual resolution with conflict markers
- **File deleted vs modified**: Preserves newer version with warning
- **File created on multiple devices**: Requires manual merge or rename

### Dataview Index Handling
- Indexes are derived, never conflict-resolved
- After sync, indexes rebuilt from synced markdown files
- Any index divergence auto-resolved by rebuild

## Architecture Non-Goals

This document does NOT include:
- Working sync implementation (future implementation phase)
- Server/Convex build details
- Account management UI
- Sync conflict resolution UI
- Mobile client specifics

## Related Notes

- [[data-classification-matrix|Data Classification Matrix]] — data classes and sync eligibility
- [[conflict-resolution-design|Conflict Resolution Design]] — conflict scenarios and resolution strategies
- [[srgnt_framework|SRGNT Product and Architecture Foundation]]
