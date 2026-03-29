---
note_type: shared_knowledge
title: Data Classification Matrix
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - security
  - data-classification
  - hipaa
---

# Product Data Classification Matrix

## Purpose
Provide an initial product data classification framework so engineering decisions remain compatible with future HIPAA-sensitive requirements.

## Classification levels

### Class A: non-sensitive product metadata
Examples:
- UI preferences
- layout settings
- non-sensitive feature flags
- local display preferences
- connector installation metadata without secrets

Handling guidance:
- may be stored locally in general app storage
- may be synced with standard protections
- low sensitivity

### Class B: operational workspace content
Examples:
- task summaries
- generated briefings
- meeting prep artifacts
- workflow notes
- run metadata without secrets
- connector-derived non-regulated operational context

Handling guidance:
- store locally with standard app protections
- sync may be allowed with encryption in transit and at rest
- consider selective encryption paths for customer-sensitive deployments

### Class C: secrets and credentials
Examples:
- OAuth tokens
- refresh tokens
- API keys
- session credentials
- signing secrets

Handling guidance:
- do not store in renderer-accessible general storage
- use OS-native secure storage locally
- do not include in normal logs
- restrict remote persistence aggressively

### Class D: regulated or highly sensitive content
Examples:
- PHI
- highly confidential customer records
- regulated meeting content
- legally protected data classes

Handling guidance:
- design for client-side encryption path before remote sync
- minimize remote plaintext exposure
- prohibit casual AI access
- require explicit policy controls and auditability

## Initial matrix

| Data Type | Likely Class | Local Storage | Remote Sync | Fred Access | Logging |
|---|---:|---|---|---|---|
| UI preferences | A | General app storage | Yes | No | Minimal |
| Workspace layout | A | General app storage | Yes | No | Minimal |
| Connector install metadata | A/B | Structured local store | Yes | Usually no | Minimal |
| Canonical tasks/events/messages | B or D depending on content | Structured local store | Conditional | Conditional | Redacted metadata only |
| Generated artifacts | B or D depending on content | File-backed + metadata store | Conditional | Conditional | Metadata preferred |
| Run history | B | Structured local store | Conditional | Possibly metadata only | Redacted |
| OAuth/API tokens | C | OS secure storage | Prefer no | No | Never |
| Terminal session transcripts | B/C/D depending on content | Restricted local storage | Prefer off by default | No by default | Disabled or heavily redacted |
| AI/Fred request payloads | B/D depending on content | Restricted local metadata | Conditional | Yes by definition | Category-level only |

## Design implications
The product should:
- classify data before deciding sync behavior
- keep Class C out of general app persistence
- assume some Class B can become Class D depending on customer/context
- allow policy-based restriction of Fred and sync access by class

## Summary
This matrix should guide storage, sync, AI access, and logging decisions from the earliest implementation stages.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[06_Shared_Knowledge/srgnt_framework_sync_service_design|Sync Service Design]]
- [[06_Shared_Knowledge/srgnt_framework_fred_integration|Fred Integration Architecture]]
