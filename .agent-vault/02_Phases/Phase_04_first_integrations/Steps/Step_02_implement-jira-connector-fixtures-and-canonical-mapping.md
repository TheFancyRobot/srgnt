---
note_type: step
template_version: 2
contract_version: 1
title: Implement Jira Connector Fixtures And Canonical Mapping
step_id: STEP-04-02
phase: '[[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-01
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-jira-connector-fixtures-and-canonical-mapping-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement Jira Connector Fixtures And Canonical Mapping

Deliver the first task-oriented connector and its canonical entity mapping.

## Purpose

- Prove the connector model on a task-heavy source system the wedge depends on.
- Establish how provider records, raw metadata, and canonical tasks coexist.

## Why This Step Exists

- Jira is one of the framework's named first connectors and a major source for the daily command center.
- This step should validate the canonical task mapping before more connectors land.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]].

## Relevant Code Paths

- `packages/connectors/jira/` or equivalent path chosen in Step 04-01
- `packages/contracts/`
- `packages/runtime/`
- connector fixtures and tests

## Required Reading

- [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Implement the Jira connector using the shared SDK and the canonical task model from Phase 01.
2. Preserve raw source metadata while exposing normalized entities and freshness state.
3. Prefer fixtures and replayable test data over immediate live-service dependence.
4. Validate with connector tests that prove canonical mapping and fixture-based sync behavior.
5. Update notes with the exact mapped entity set, unsupported fields, and any provider-specific edge cases.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This is the canonical task-source validation path for the wedge.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/connectors/jira/` — Jira connector package: manifest, auth adapter (Jira Cloud OAuth2 or API token), sync implementation, canonical task mapper
- `packages/connectors/jira/src/mapping.ts` — canonical task mapping: Jira issue → canonical task entity (title, status, assignee, priority, labels, due date, URL, raw metadata blob)
- `packages/connectors/jira/fixtures/` — replayable fixture data: sample Jira API responses for issues, transitions, sprint data
- `packages/connectors/jira/__tests__/` — connector tests proving: fixture-based sync, canonical mapping correctness, freshness timestamp propagation, unsupported-field handling (e.g., custom fields preserved in raw metadata)
- Updated `packages/contracts/` if canonical task schema needs fields discovered during implementation

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Jira-specific response shapes validated with Zod; canonical task output must match the PHASE-01 Zod contract exactly
- DEC-0005 (pnpm monorepo): Jira connector is its own workspace package depending on `@srgnt/connector-sdk` and `@srgnt/contracts`
- DEC-0007 (Dataview/markdown local data): Synced Jira data lands as local markdown-compatible files, not in a database

**Starting files (must exist before this step runs):**
- Connector SDK from STEP-04-01 (`packages/connectors/sdk/`)
- Canonical entity Zod schemas from PHASE-01 (`packages/contracts/`)
- Runtime sync primitives from PHASE-03

**Constraints:**
- Do NOT mirror Jira's full schema in the canonical model (per Human Notes) — map only fields the wedge consumes, preserve rest in raw metadata blob
- Do NOT require a live Jira instance for tests — all tests must run against fixtures
- Do NOT add Jira-specific logic to the SDK or runtime packages — Jira-specific code stays in `packages/connectors/jira/`
- Auth for Jira is independent of Azure AD (unlike Outlook/Teams) — do not conflate them

**Validation:**
A junior dev verifies completeness by:
1. Running `pnpm test --filter @srgnt/connector-jira` — all fixture-based tests pass
2. Inspecting a fixture-based sync output and confirming it produces valid canonical task entities (Zod parse succeeds)
3. Checking that raw Jira metadata (custom fields, etc.) is preserved alongside canonical fields
4. Verifying freshness timestamps are set on sync output
5. Confirming no Jira-specific imports exist in `packages/connectors/sdk/` or `packages/runtime/`

**Junior-readiness verdict:** PASS — The step is well-scoped: implement one connector against an existing SDK, using fixtures. The canonical mapping is the main intellectual challenge, but the constraint to map only wedge-consumed fields keeps it bounded. Steps 02-04 can run in parallel after STEP-04-01 completes.

## Human Notes

- Resist the urge to mirror Jira's full schema in the canonical model.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-jira-connector-fixtures-and-canonical-mapping-opencode|SESSION-2026-03-22-170211 opencode session for Implement Jira Connector Fixtures And Canonical Mapping]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means fixture-backed Jira data lands as normalized task entities with raw metadata preserved.
- Validation target: targeted connector tests prove mapping and freshness behavior.
