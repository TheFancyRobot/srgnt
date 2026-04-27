# Execution Brief

## Step Overview

Define the executor request/result contracts and the run/logging model that make agent execution auditable and backend-agnostic.

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

## Execution Prompt

1. Define the executor request and result contracts so skills can run against different agent backends without changing the core runtime contract.
2. Define the run/logging model needed for approvals, audit trails, artifact status, and sensitivity-aware debugging.
3. Encode security boundaries directly into the contract surface: explicit allowed capabilities, allowed paths, approval modes, and redaction-aware logs.
4. Keep renderer or UI assumptions out of the contract; the desktop app should consume these contracts, not redefine them.
5. Verify the model against the planned daily-briefing skill and sample connector so request assembly and result handling are realistic.
6. Validate by checking the contract can represent success, failure, partial completion, and approval-gated flows without leaking secrets or provider-specific data.
7. Update notes with the final request/result shapes, log categories, and any open policy question that must be settled before runtime implementation.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_05_define-executor-and-run-contracts|STEP-01-05 Define Executor And Run Contracts]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
