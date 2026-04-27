# Implementation Notes

- Sync is continuity/replication, not the source of truth.
### Refinement (readiness checklist pass)

**Exact outcome (DEC-0006: design doc + production scaffolding):**

*Design document:*
- `.agent-vault/06_Shared_Knowledge/sync-architecture.md` — sync architecture document covering:
  - Sync model overview (local-first, workspace is authoritative, sync is replication/continuity)
  - Encryption strategy: which payloads are encrypted, what metadata stays in plaintext, key management approach
  - Account model: minimum account/subscription concepts needed (user ID, device ID, subscription tier)
  - Trust boundaries: local workspace = authority, remote = encrypted replica, renderer never touches key material
  - Sync protocol sketch: how markdown files with YAML frontmatter are diffed, packaged, encrypted, and transmitted
  - Dataview index handling: indexes are derived/rebuildable, never synced as authoritative
  - Key-rotation, device-revocation, and account-recovery sections: minimum recovery expectations, what happens to old keys, and how a lost device is removed without making the remote service authoritative
  - Explicit non-goals for this phase (no implementation, no server build, no account UI)

*Production scaffolding code:*
- `packages/sync/src/interfaces/sync-engine.ts` — TypeScript interfaces:
  - `ISyncEngine` (init, push, pull, resolveConflict, getStatus)
  - `SyncPayload` (encrypted content, metadata envelope, device origin)
  - `SyncStatus` (connected, disconnected, syncing, conflicted, error)
- `packages/sync/src/interfaces/account.ts` — TypeScript interfaces:
  - `IAccountProvider` (authenticate, getSubscription, getDeviceId)
  - `AccountInfo` (userId, deviceId, subscriptionTier)
  - `SubscriptionTier` enum (free, premium)
- `packages/sync/src/schemas/sync-payload.ts` — Effect Schema definitions for:
  - `SyncPayloadSchema` — validates the shape of encrypted sync payloads
  - `SyncMetadataSchema` — validates the plaintext metadata envelope
  - `DeviceInfoSchema` — validates device identification data

**Key decisions to apply:**
- DEC-0002 (TypeScript + Effect.Schema) — interfaces as TypeScript, runtime validation as Effect Schema
- DEC-0005 (pnpm) — new files go in the existing `packages/sync/` created in STEP-09-01
- DEC-0006 (docs + scaffolding) — both the architecture doc and the interface/schema files are required
- DEC-0007 (markdown/Dataview) — sync must handle markdown files as the data format; Dataview indexes are derived and not synced

**Starting files:**
- `packages/sync/` from STEP-09-01 with classification schemas
- Data classification matrix from STEP-09-01
- Workspace storage models from PHASE-02/03
- Telemetry policy from PHASE-08

**Constraints:**
- Do NOT implement sync — only interfaces, types, schemas, and architecture doc
- Do NOT build a server or remote service — architecture is design-only
- Do NOT make the remote service the data authority — local workspace stays authoritative (this is the primary design constraint)
- Do NOT put key material or decryption logic in the renderer process
- Do NOT sync Dataview indexes — they are derived and must be rebuildable from synced markdown files

**Validation:**
1. Sync architecture doc exists and covers all 7 sections listed above
2. Architecture doc explicitly states "local workspace is the authoritative store" (or equivalent)
3. All new interface files compile: `pnpm --filter sync build` succeeds
4. `ISyncEngine` interface has at minimum: init, push, pull, resolveConflict, getStatus methods
5. `IAccountProvider` interface has at minimum: authenticate, getSubscription, getDeviceId methods
6. Effect Schema definitions in `sync-payload.ts` can decode a valid example payload
7. The architecture doc references the STEP-09-01 classification matrix for sync eligibility decisions
8. No interface method accepts raw unencrypted workspace content as a parameter to a remote-facing operation
9. The architecture doc includes explicit treatment of key rotation, device revocation, and account recovery

**Junior-readiness verdict:** PASS — the step produces design docs and interface stubs, not working implementations. The main challenge is making sound architecture decisions about encryption and trust boundaries. Mitigate by requiring the executing agent to reference the STEP-09-01 classification matrix explicitly and to have the architecture doc reviewed before writing interfaces.

## Related Notes

- Step: [[02_Phases/Phase_09_sync_preparation/Steps/Step_02_draft-encrypted-sync-architecture-and-account-model|STEP-09-02 Draft Encrypted Sync Architecture And Account Model]]
- Phase: [[02_Phases/Phase_09_sync_preparation/Phase|Phase 09 sync preparation]]
