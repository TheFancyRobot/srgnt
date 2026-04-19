---
note_type: shared_knowledge
title: Fred Architecture
created: '2026-04-16'
updated: '2026-04-16'
tags:
  - architecture
  - fred
  - premium
  - data-classification
  - phase-10
related_phases:
  - Phase_08_product_hardening
  - Phase_09_sync_preparation
  - Phase_10_fred_integration
---

# Fred Architecture

## Purpose

This document defines the architectural boundaries, data access rules, and integration contracts for Fred, the premium AI orchestration layer. It formalizes Phase 10 integration requirements and aligns explicitly with STEP-09-01 `data-classification-matrix.md` and the Phase 08 telemetry policy.

Fred is the premium add-on service that provides advanced AI orchestration and in-app intelligence beyond the local free tier.

---

## Fred Definition

Fred is a **premium AI features layer** that operates as an optional orchestration service. It is not a required component of the base product.

### Fred is NOT
- Required for the base product to function
- The source of truth for local workspace state
- The only execution path for workflows
- A data aggregation service with broad workspace access

### Fred IS
- An optional premium orchestration layer behind a stable service boundary
- A service that enables in-app AI experiences (synthesis, briefings, copilot interactions)
- A future cross-device intelligence layer with explicit user consent
- A monetizable add-on that enhances the command center

### Fred Use Cases

**Approved premium use cases:**
- Cross-source synthesis across artifacts and connectors
- In-app conversational orchestration
- Advanced workflow planning and recommendations
- Premium briefings and strategic summaries
- Richer interactive copilots for command-center views
- Higher-order automation recommendations

**Prohibited early use cases:**
- Replacing local workflow execution as the default path
- Silently sending broad workspace data without minimization
- Making common command-center features unavailable without premium

---

## Data Access Rules

Fred access is governed by the Phase 09 data classification matrix. Every data class has explicit eligibility for Fred access.

### Classification Matrix Reference

| Data Type | Classification | Fred Access | Rationale |
|-----------|---------------|-------------|-----------|
| Workspace markdown files | internal | **never direct** | Primary user content. Fred receives derived artifacts, never raw files. |
| YAML frontmatter | internal | **never direct** | Synced with files. Fred access flows through file-level grants only. |
| Dataview indexes | internal | rebuildable | Fred may query dataview indexes directly. Source markdown is authoritative. |
| Connector credentials | secret | **never** | OS secure storage only. Fred never receives credentials. |
| Crash logs | internal | **never** | Local-only per DEC-0012. Not transmitted to Fred. |
| User settings | internal | **encryptedOnly** | Fred may receive user preference summaries for personalization. |
| Run history | internal | **encryptedOnly** | Fred may receive execution metadata for workflow context. Must be encrypted in transit. |
| Approval records | confidential | **never** | Human approval decisions are local-only. Never sent to Fred. |
| Artifact cache | internal | rebuildable | Fred may read cached artifacts. Rebuildable from source. |
| Connector install metadata | internal | syncSafe | Fred may receive connector state without secrets for orchestration. |
| Terminal session transcripts | confidential | **never** | Session transcripts may contain sensitive output. Local-only by default. |
| AI/Fred request payloads | confidential | encryptedOnly | Fred request metadata must be encrypted. May include minimization hints. |

### Fred Data Access Summary

| May Fred Access? | Data Classes |
|-------------------|--------------|
| **Never** | connector credentials (secret), approval records (confidential), terminal session transcripts (confidential), crash logs (internal, localOnly) |
| **EncryptedOnly** | run history (internal), AI/Fred request payloads (confidential), user settings (internal) |
| **Rebuildable** | dataview indexes (internal), artifact cache (internal) |
| **syncSafe** | connector install metadata (internal) |
| **Never direct** | workspace markdown files (internal), YAML frontmatter (internal) — Fred receives derived output only |

---

## Minimization Rules

### Core Principle: Never Full Workspace by Default

Fred must **never** receive the full workspace or unrestricted access to all files. Context is assembled per-request with explicit scope.

### Minimization Rules

Fred must NEVER access the following data directly: connector credentials, approval records, terminal session transcripts, crash logs, raw workspace markdown files, raw YAML frontmatter, and any unrestricted full-workspace listing.

1. **Scope assembly is request-scoped**: Fred receives only the data required for a specific workflow. No standing access to full workspace.

2. **Derived over raw**: Fred receives derived artifacts, indexes, and summaries rather than raw source files.

3. **Explicit scope per workflow**: Each Fred workflow declares the minimum data scope required. The integration layer enforces this scope.

4. **Redaction before transmission**: The integration layer redacts paths, credentials, tokens, and sensitive content before any Fred request.

5. **No broad workspace queries**: Fred cannot issue "get all files" or "list entire workspace" requests. It operates on scoped, named context.

6. **Retention limits**: Fred responses are not cached beyond the session without explicit user consent.

7. **Classification-aware routing**: The integration layer consults the classification matrix to block requests that would violate data boundaries.

### Minimization Enforcement Points

```
User Request
    │
    ▼
Base Product Layer
    │
    ▼
Fred Integration Layer
    ├── Entitlement check
    ├── Scope assembly (minimum required)
    ├── Redaction engine (paths, tokens, secrets)
    ├── Classification guard (blocks localOnly/secret)
    └── Request shaping
    │
    ▼
Fred Service
    │
    ▼
Normalized Response
```

---

## Local-Only Data Boundaries

The following data classes are **localOnly** and must never be transmitted to Fred under any circumstances:

### Hard Local-Only Boundaries

| Data Type | Classification | Eligibility | Boundary Rationale |
|-----------|---------------|-------------|-------------------|
| Connector credentials | secret | localOnly | OAuth tokens, API keys. OS secure storage only. |
| Crash logs | internal | localOnly | Local diagnostics per DEC-0012. Not remotely transmitted. |
| Terminal session transcripts | confidential | localOnly | May contain sensitive output. Default local-only. |
| Approval records | confidential | encryptedOnly | Human approval decisions. Encrypted locally only. |

### Enforcement

The Fred integration layer **must not** include localOnly data in any request payload. The classification guard blocks such access at the integration boundary.

If Fred requires information from a localOnly source for a legitimate workflow:
1. The integration layer extracts only the specific derived fact needed
2. The raw localOnly data never leaves the local boundary
3. The extracted fact is classified and treated accordingly

---

## API Surface Between Base Product and Fred

### Integration Layer Responsibilities

The app-side Fred integration layer handles:

| Responsibility | Description |
|----------------|-------------|
| Entitlement checks | Verify user has active Fred subscription before any request |
| Scope assembly | Determine minimum data scope for the requested workflow |
| Redaction | Remove paths, tokens, credentials, emails, secrets before transmission |
| Classification guard | Block requests that would violate localOnly or secret boundaries |
| Request shaping | Transform local state into Fred-safe payloads |
| Response normalization | Convert Fred outputs into normalized artifacts or actions |
| Audit logging | Record what was sent and received (without sensitive content) |

### Fred Request Contract

Every Fred request carries:

```typescript
interface FredRequest {
  workflow: string;              // Named workflow type
  scope: DataScope;              // Explicit scope declaration
  context: FredContext;          // Minimized context payload
  consentToken: string | null;  // User consent token if required
  classificationHints: ClassificationHints;  // Minimization metadata
}
```

### Fred Response Contract

```typescript
interface FredResponse {
  workflow: string;
  status: 'success' | 'error' | 'partial';
  artifacts: FredArtifact[];    // Normalized output artifacts
  actions: FredAction[];        // Structured actions to execute
  retentionHint: 'session' | 'persist' | 'none';
  auditId: string;             // Correlator for audit logs
}
```

### Unsupported Operations

Fred must not expose:
- Direct file system access to workspace
- Credential retrieval APIs
- Approval record queries
- Full workspace listing or search
- Raw crash log access

---

## Renderer Isolation

Fred's premium features operate in an **isolated renderer context** with strict boundaries from the main product renderer.

### Isolation Model

```
Main Process
├── Base Product Renderer (renderer-A)
│   ├── Local core workflows
│   ├── Command center UI
│   └── Free tier features
│
└── Fred Renderer (renderer-B)
    ├── Premium AI features
    ├── Fred orchestration UI
    └── Isolated from renderer-A state

Main Process
├── Fred Integration Layer
│   ├── Classification guard
│   ├── Redaction engine
│   └── IPC bridge (preload-only)
│
└── Fred Service (external)
```

### IPC Boundary Rules

| Rule | Rationale |
|------|-----------|
| Fred renderer has no direct IPC to base product renderer | Prevents silent data exfiltration |
| Fred renderer communicates only through preload bridge | Controlled interface, no arbitrary access |
| Base product renderer cannot invoke Fred directly | All Fred calls go through integration layer |
| Fred renderer state is sandboxed | Isolated JS context with no workspace FS access |

### Preload Bridge API (Fred Side)

```typescript
interface FredPreloadBridge {
  // Fred-specific capabilities
  fred: {
    submitWorkflow(request: FredRequest): Promise<FredResponse>;
    getEntitlementStatus(): Promise<EntitlementStatus>;
    getMinimizationHints(workflow: string): Promise<DataScope>;
  };
}
```

---

## User Consent Model

Fred operations require explicit user consent before transmitting data. Consent is scoped, granular, and revocable.

### Consent Categories

| Category | Description | Default |
|----------|-------------|---------|
| **Fred enabled** | Master toggle to allow Fred features | off |
| **Workspace context** | Allow Fred to receive workspace-derived context | off |
| **Run history** | Allow Fred to receive execution metadata | off |
| **Personalization** | Allow Fred to use preferences for personalization | off |
| **Future premium** | Allow future premium features (opt-in per feature) | off |

### Consent Requirements

1. **Master toggle**: Fred cannot operate without the master `Fred enabled` toggle ON.

2. **Scope-specific consent**: Even with Fred enabled, individual data categories require explicit consent.

3. **Per-workflow confirmation**: Certain high-scope workflows require user confirmation before execution.

4. **Revocable at any time**: User can revoke consent at any time via Settings.

5. **Consent not stored remotely**: Consent state is local only. Remote telemetry of consent state is prohibited per Phase 08 telemetry policy.

### Consent UI

- Settings exposes Fred consent toggles
- First use of each Fred workflow triggers consent prompt if not previously granted
- High-scope workflows show scope summary before confirmation

### Alignment with Phase 08 Telemetry Policy

Consent tokens and consent state are **Category C (Never capture)** for telemetry:
- Consent state is never transmitted as telemetry
- Consent tokens are never logged in crash reports
- User-entered prompt text is never sent to Fred without explicit consent

---

## Alignment Summary

### Phase 09 Classification Matrix Alignment

| Principle | Fred Alignment |
|-----------|----------------|
| Local workspace is authoritative | Fred never receives raw workspace files directly |
| Secret data never leaves device | Fred never receives connector credentials |
| Confidential data requires encryption | Fred access to run history, AI payloads is encryptedOnly |
| Derived data is rebuildable | Fred may access dataview indexes and artifact cache |
| Classification hints are respected | Fred integration layer enforces classification guard |

### Phase 08 Telemetry Policy Alignment

| Telemetry Rule | Fred Alignment |
|----------------|----------------|
| Local-only by default | Fred operates on explicit scope, not broad capture |
| Category C data never captured | Fred never receives raw workspace content, credentials, tokens, or raw terminal output |
| Redaction before persistence | Redaction is applied before any Fred request |
| User consent model | Explicit consent required per data category |
| Crash payloads are redacted | Fred request/response never appears in crash logs |

---

## Related Notes

- [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
- [[data-classification-matrix|Data Classification Matrix (`data-classification-matrix.md`)]] — classification levels, eligibility enums, matrix reference
- [[telemetry-policy|Telemetry Policy]] — Phase 08 privacy posture, redaction rules, never-capture categories
- [[srgnt_framework_fred_integration|Fred Integration Architecture]] — original design doc, product role, integration model
- [[srgnt_framework_security_boundary_model|Security Boundary Model]] — security boundary definitions
- [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]]
- [[02_Phases/Phase_10_fred_integration/Phase|PHASE-10 Fred Integration]]
