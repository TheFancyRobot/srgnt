---
note_type: shared_knowledge
title: Fred Integration Architecture
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - fred
  - premium
  - integration
---

# Fred Integration Architecture

## Purpose

Define how Fred should integrate into the product as a premium orchestration layer without becoming a hard dependency of the base product.

## Product role of Fred

Fred is a premium add-on service that provides AI orchestration and in-app intelligence beyond the local free tier.

Fred is not:
- required for the base product to function
- the source of truth for local workspace state
- the only way to execute workflows

Fred is:
- an optional premium orchestration layer
- a service that enables in-app AI experiences
- a future cross-device intelligence layer
- a monetizable add-on that enhances the base command center

## Core design principle

**The product must be designed so that Fred can be absent, disabled, or unavailable without breaking core desktop workflows.**

## Integration model

Fred should integrate through a stable internal service boundary.

Recommended conceptual shape:

```text
Desktop/Mobile Client
├── Local Core Runtime
│   ├── entities
│   ├── skills
│   ├── connectors
│   ├── policies
│   └── artifacts
│
└── Fred Integration Layer
    ├── entitlement checks
    ├── request shaping
    ├── redaction/policy enforcement
    ├── orchestration requests
    ├── result normalization
    └── premium feature state

Fred Service
├── orchestration engine
├── agent coordination
├── premium workflows
├── async/background orchestration
└── optional shared user context
```

## Responsibilities of the Fred integration layer

The app-side Fred integration layer should:
- check subscription/entitlement state
- determine whether a workflow is allowed to use Fred
- shape requests from local state into Fred-safe payloads
- enforce data minimization and redaction policies
- normalize Fred results back into product artifacts/actions
- preserve auditability of what was sent and what was received

It should not:
- bypass local permission models
- silently route user content to AI services
- become the only execution path for common workflows

## Fred use cases

Reasonable premium Fred use cases:
- cross-source synthesis across artifacts and connectors
- in-app conversational orchestration
- advanced workflow planning
- premium briefings and strategic summaries
- richer interactive copilots for command-center views
- higher-order automation recommendations

Unwise early use cases:
- replacing all local workflow execution
- silently sending broad workspace data by default
- making common command-center features unusable without premium

## Data boundary rules

### Rule 1: Fred receives the minimum required context
Only the subset of data required for a specific workflow should be sent.

### Rule 2: Fred access must be explicit and policy-aware
The system should know and record what categories of data were shared.

### Rule 3: sensitive-mode constraints must be supported
If the product later operates in HIPAA-sensitive environments, Fred integration must support reduced or prohibited access to certain categories of data.

### Rule 4: results return through normalized contracts
Fred outputs should become normalized artifacts, recommendations, or structured actions, not arbitrary opaque state.

## Deployment model options

### Option A: hosted Fred service
Best for premium orchestration and cross-device continuity.

### Option B: packaged local Fred runtime
Possible for advanced local-only editions but increases delivery complexity.

### Option C: hybrid model
Likely eventual direction if some customers want local-sensitive operation and others want fully hosted orchestration.

## Recommended near-term choice

Design for **hosted Fred service** first, with the possibility of a local-sensitive deployment model later if the market requires it.

This keeps monetization and cross-device premium behavior simpler.

## Fred and mobile

Fred is a stronger fit for mobile than terminal-agent workflows are.

Mobile should likely consume:
- generated artifacts
- premium summaries
- guided interactions
- approval/review flows

rather than trying to replicate the full desktop terminal-based experience.

## Fred and Convex

Convex is a plausible backend platform for Fred orchestration if used carefully.

Good fit areas:
- realtime premium state
- job coordination
- orchestration metadata
- user/session/subscription state
- premium feature entitlements

Caution areas:
- raw sensitive content handling
- unrestricted plaintext access to synced data
- broad AI context assembly without minimization or redaction

## Recommended product stance

The product should describe Fred as:
- an optional premium intelligence and orchestration layer
- a service that enhances, but does not replace, the local-first command center

This keeps the monetization story clean while preserving user trust.

## Summary

Fred should be integrated as a premium, policy-aware orchestration layer behind a stable boundary. It should enhance the product without becoming a hard dependency for the free or local-first experience.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[06_Shared_Knowledge/srgnt_framework_base_product_architecture|Base Product Architecture]]
- [[06_Shared_Knowledge/srgnt_framework_data_classification_matrix|Data Classification Matrix]]
