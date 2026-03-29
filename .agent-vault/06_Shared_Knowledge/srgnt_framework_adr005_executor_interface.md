---
note_type: shared_knowledge
title: ADR-005 Executor Interface
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - architecture
  - adr
---

# ADR-005: Executor Interface

**Status:** Proposed  
**Date:** 2026-03-17  
**Decision Owner:** Framework Core  
**Scope:** v1 pluggable execution interface for agent backends

## Context

The framework is designed to work with terminal-based coding agents such as Codex and OpenCode, with the possibility of future custom executors.

If skills are tightly coupled to a single agent tool, the framework will inherit unnecessary lock-in and operational fragility.

We need an executor interface that allows different agent backends to run skills while presenting a stable runtime contract to the framework.

## Decision

We will define executors as pluggable packages that implement a stable execution interface.

The runtime will invoke an executor with structured context, and the executor will be responsible for translating that context into whatever invocation model its backend requires.

Skills must not depend directly on a specific executor implementation except for declared compatibility constraints.

## Executor responsibilities

An executor is responsible for:
- accepting a structured execution request
- preparing the agent/backend invocation
- enforcing tool/file/context boundaries as supported
- invoking the selected agent
- collecting outputs, artifacts, and logs
- returning a normalized execution result to the runtime

## Execution request model

A v1 execution request should conceptually include:
- skill metadata
- referenced prompt/instruction/template files
- resolved canonical input entities
- runtime variables
- allowed vault paths
- allowed capabilities/actions
- approval/policy context
- expected output contract

Example conceptual shape:

```ts
interface ExecutionRequest {
  runId: string
  skillId: string
  executorId: string
  instructions: {
    system?: string
    user?: string
    templatePaths?: string[]
  }
  inputs: {
    entities: EntityRecord<any>[]
    variables: Record<string, unknown>
  }
  permissions: {
    allowedCapabilities: string[]
    allowedPaths: string[]
    approvalMode: 'read_only' | 'preview_before_write' | 'auto_write' | 'approval_required_for_side_effects'
  }
  outputs: {
    expectedArtifacts?: Array<{
      type: string
      target: string
    }>
    outputSchemaPath?: string
  }
}
```

## Execution result model

A v1 execution result should conceptually include:
- status
- logs/messages
- proposed or written artifacts
- validation results
- side effects attempted or requested
- raw executor metadata

Example conceptual shape:

```ts
interface ExecutionResult {
  runId: string
  status: 'success' | 'failed' | 'partial' | 'awaiting_approval'
  logs: Array<{
    level: 'info' | 'warn' | 'error'
    message: string
    timestamp: string
  }>
  artifacts: Array<{
    type: string
    path: string
    status: 'proposed' | 'written'
  }>
  sideEffects?: Array<{
    capability: string
    status: 'requested' | 'completed' | 'blocked'
  }>
  rawMetadata?: Record<string, unknown>
}
```

## Compatibility model

A skill may optionally declare compatible executors.

Examples:
- `codex`
- `opencode`

This allows hosts to warn users when an installed skill expects executor features not universally available.

## Why this decision was made

The executor abstraction is necessary because:
- agent backends will evolve over time
- different users will prefer different tools
- the framework should not inherit a single tool's assumptions
- testing and simulation become easier with a normalized contract

## Consequences

### Positive consequences
- reduced lock-in to one terminal agent
- easier experimentation with new execution backends
- improved testability through mock executors
- clearer boundary between skill definition and agent invocation

### Negative consequences
- executor authors must map their backend into the framework contract
- not every backend will support all controls equally well

## Alternatives considered

### Alternative A: hardcode a single terminal agent into the framework
Rejected because it creates unnecessary lock-in and limits ecosystem growth.

### Alternative B: let each skill define its own invocation method
Rejected because it produces inconsistent runtime behavior.

### Alternative C: pluggable executor interface with normalized request/result types
Selected.

## Summary

Executors will be pluggable packages that translate a standardized framework execution request into a backend-specific run and return normalized results back to the runtime.


---

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_adr002_canonical_entity_model|ADR-002: Canonical Entity Model]]
- [[06_Shared_Knowledge/srgnt_framework_adr003_skill_manifest|ADR-003: Skill Manifest Specification]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004: Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_product_concept|srgnt Product Concept]]
