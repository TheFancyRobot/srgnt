---
note_type: step
template_version: 2
contract_version: 1
title: Define Executor And Run Contracts
step_id: STEP-01-05
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-02
  - STEP-01-03
  - STEP-01-04
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Define Executor And Run Contracts

Define the executor request/result contracts and the run/logging model that make agent execution auditable and backend-agnostic.

## Purpose

- Specify the executor interface for backend-agnostic skill execution.
- Define the run-result and logging model needed for approvals, audit trails, and future desktop UX.

## Why This Step Exists

- The executor abstraction prevents `srgnt` from inheriting lock-in to one terminal agent.
- The run/logging model is where security, approvals, and auditability become enforceable instead of implied.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]].
- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]].
- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-005, Base Product Architecture, and Security Boundary Model.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- The future executor or runtime-facing contract locations frozen in Step 01.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]

## Execution Prompt

1. Define the executor request and result contracts so skills can run against different agent backends without changing the core runtime contract.
2. Define the run/logging model needed for approvals, audit trails, artifact status, and sensitivity-aware debugging.
3. Encode security boundaries directly into the contract surface: explicit allowed capabilities, allowed paths, approval modes, and redaction-aware logs.
4. Keep renderer or UI assumptions out of the contract; the desktop app should consume these contracts, not redefine them.
5. Verify the model against the planned daily-briefing skill and sample connector so request assembly and result handling are realistic.
6. Validate by checking the contract can represent success, failure, partial completion, and approval-gated flows without leaking secrets or provider-specific data.
7. Update notes with the final request/result shapes, log categories, and any open policy question that must be settled before runtime implementation.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The framework doc already treats executors as pluggable backends such as Codex and OpenCode.
- Web pressure-testing reinforced that desktop security boundaries must keep secrets out of the renderer and make privileged operations explicit and auditable.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/executor/` for:
1. `ExecutorRequest` — skillRef, inputEntities[], capabilities granted, approvalMode, contextWindow, timeoutMs
2. `ExecutorResult` — status (success | failure | partial | approval-pending), outputArtifacts[], logs[], errors[], duration
3. `RunLog` — timestamped entries with: level (info | warn | error | debug), message, sensitivityTag, redacted flag
4. `ArtifactOutput` — type, content, format, approvalStatus, targetPath

Plus schemas in `packages/contracts/src/approvals/`:
5. `ApprovalRequest` — what action, which entity, requested by (skill), approval mode, context summary
6. `ApprovalDecision` — approved | denied | modified, decidedBy, reason, timestamp

**Key decisions to apply**:
- DEC-0002: All schemas are Zod.
- The approval model defined in Step 03 (`ApprovalMode` enum) is consumed here. This step defines the **runtime approval flow contracts** (request/decision) while Step 03 owns the **declaration vocabulary**.

**Constraints**:
- Executor contracts must not reference specific agent backends (no `codex` or `opencode` types).
- Run logs must have a `sensitivityTag` field so PHASE-07/07 redaction logic can filter them.
- No renderer-specific types (no React components, no IPC message shapes).

**Security considerations**:
- Secrets (API keys, tokens) must never appear in `ExecutorRequest` or `RunLog`. They are resolved by the connector layer, not passed through executor contracts.
- The `redacted` flag on log entries is for display-time filtering; actual redaction happens at the runtime layer (PHASE-03/06).

**Validation**:
- A mock daily-briefing execution flow (request -> result with artifacts) can be represented without errors.
- `pnpm -r run typecheck` passes.
- The model can represent: success, failure, partial completion, and approval-gated pause.

**Junior-readiness verdict**: PASS. Approval model ownership clarified, security boundaries explicit, executor is backend-agnostic.

## Human Notes

- Integrity risk: if run logs casually retain sensitive content or privileged context, later sync and premium features will inherit unsafe defaults.
- Do not expose unrestricted IPC or secret-bearing payloads through the executor contract.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the repo has an executor contract and a run/logging model that can express approvals, artifacts, and backend-agnostic execution results.
- Validation target: the model can represent the planned skill and connector flow without assuming one agent backend or leaking privileged data.
