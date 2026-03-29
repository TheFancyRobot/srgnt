---
note_type: shared_knowledge
title: Security Boundary Model
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - security
  - hipaa
  - boundary-model
---

# Security Boundary Model

## Purpose

Define the high-level security boundary model for the product so that current decisions remain compatible with a future HIPAA-sensitive deployment posture.

This is not a compliance certification document. It is an architectural security framing document.

## Core principle

**Security boundaries must be designed now, even if full compliance obligations come later.**

Retrofitting trust boundaries late is expensive and risky.

## Security zones

### Zone 1: UI/Renderer Zone
Examples:
- desktop renderer UI
- mobile client UI
- webview surfaces

Characteristics:
- user-facing
- should be treated as less trusted than privileged local/system services
- should not directly access secrets or unrestricted privileged capabilities

Allowed responsibilities:
- rendering views
- gathering user intent
- displaying artifacts and summaries
- requesting actions through mediated APIs

Disallowed responsibilities:
- holding raw secrets long-term
- direct token management
- direct unrestricted connector/network control
- broad filesystem privileges without mediation

### Zone 2: Local Privileged Zone
Examples:
- Electron main-process privileged services
- secure local runtime services
- OS keychain/key storage integrations
- local connector auth/session handlers

Characteristics:
- more trusted than renderer/UI
- should handle secrets, tokens, and privileged operations
- should mediate local file/process/network operations

Allowed responsibilities:
- secret storage/retrieval
- connector auth refresh
- terminal/agent process launch
- encrypted local cache handling
- sync client authentication
- policy enforcement gates

### Zone 3: Local Data Zone
Examples:
- local entity store
- artifact store
- logs/run history
- sync cache
- encrypted local state

Characteristics:
- durable local persistence
- should be partitioned by sensitivity
- should support future selective sync and encryption

Recommended categories:
- public/local metadata
- sensitive operational content
- secrets/tokens (prefer OS secure storage, not general app storage)
- logs with redaction controls

### Zone 4: Remote Application Service Zone
Examples:
- sync backend
- account/subscription services
- premium Fred services
- remote job orchestration

Characteristics:
- remote controlled services
- must have clear data contracts
- should not receive more data than necessary
- must support auditing and policy-aware flows

### Zone 5: External Provider Zone
Examples:
- Jira
- Outlook/Microsoft Graph
- Teams
- Slack
- AI model providers
- observability vendors
- payments vendors

Characteristics:
- outside direct product control
- require vendor-specific trust review
- may require BAAs or other contractual controls depending on product tier/use case

## Data classification model

The product should classify data at minimum into:

### Class A: non-sensitive product metadata
Examples:
- UI preferences
- layout state
- non-sensitive config references

### Class B: user operational content
Examples:
- notes
- task summaries
- meeting notes
- workspace artifacts

### Class C: secrets and credentials
Examples:
- OAuth refresh tokens
- API tokens
- session secrets

### Class D: sensitive regulated content
Examples:
- PHI or healthcare-adjacent content
- other regulated or contractual confidential content

The architecture should assume that Class D may eventually exist even if v1 is primarily Class A/B/C.

## Boundary rules

### Rule 1: secrets stay out of renderer/UI
Class C data must not be broadly exposed to renderer/UI code.

### Rule 2: data minimization for remote services
Only the minimum necessary data should leave the device for sync or premium orchestration.

### Rule 3: sensitive content should support client-side encryption paths
The system should preserve a path toward client-side encryption for Class D data in remote sync/storage.

### Rule 4: AI access must be explicit and bounded
Any AI or Fred workflow must clearly define what data it can access and transmit.

### Rule 5: logging must be redactable and sensitivity-aware
Operational logs should not casually retain sensitive content.

### Rule 6: package/skill/connector permissions must be visible
The system should communicate read/write/network/sensitive-data implications clearly.

## Sync security direction

For the future sync service:
- encrypt data in transit
- encrypt data at rest on the backend
- design for client-side encryption of sensitive categories
- separate sync metadata from content where possible
- ensure device registration and revocation are supported
- support selective sync and remote wipe strategies later if needed

## Fred security direction

For Fred integration:
- premium AI features must respect policy and data classification boundaries
- some product modes may prohibit sending certain content classes to Fred
- premium orchestration requests should be logged at the category level
- data minimization and redaction should be default behaviors, not optional afterthoughts

## Community extensibility security direction

If a community ecosystem exists, the product should not default to unrestricted arbitrary code/plugin trust.

Recommended principles:
- declarative capability requests
- clear install-time permission disclosure
- least-privilege defaults
- read-only by default where possible
- curated or signed distribution paths for higher-trust packages

## HIPAA-forward architectural implications

To remain compatible with future HIPAA-sensitive deployments, avoid these mistakes now:
- storing all synced content as broad plaintext server-readable blobs by default
- allowing unrestricted AI access to all workspace content
- keeping secrets in general-purpose app storage
- treating audit logging as optional
- designing connectors/skills with no permission boundary model

## Summary

The product should adopt a multi-zone security model now, with strong separation between UI, privileged local services, local data, remote services, and external providers. This keeps current product decisions compatible with future HIPAA-sensitive requirements even before formal compliance work begins.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_fred_integration|Fred Integration Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_data_classification_matrix|Data Classification Matrix]]
- [[06_Shared_Knowledge/srgnt_framework_sync_service_design|Sync Service Design]]
