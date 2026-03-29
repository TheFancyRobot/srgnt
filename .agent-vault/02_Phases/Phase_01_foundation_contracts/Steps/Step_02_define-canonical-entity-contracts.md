---
note_type: step
template_version: 2
contract_version: 1
title: Define Canonical Entity Contracts
step_id: STEP-01-02
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Define Canonical Entity Contracts

Define the shared canonical entity envelope and the v1 entity contracts that connectors, skills, and executors will share.

## Purpose

- Define the `EntityRecord`-style shared envelope and the v1 canonical entities used across the product.
- Produce concrete entity contracts for the highest-value v1 entities without coupling them to one provider.

## Why This Step Exists

- `srgnt_framework.md` identifies provider-schema coupling as one of the biggest architectural risks; this step creates the abstraction layer that later manifests and runtimes depend on.
- Without this step, the sample skill and connector contracts will drift into Jira-, Outlook-, or Teams-specific shapes.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-002 and the data-model sections.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`
- Expected contract targets after Step 01: entity schema files, shared type definitions, and sample canonical fixtures.

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]

## Execution Prompt

1. Use the layout frozen in Step 01 and define the single canonical home for entity contracts, examples, and any shared type or schema helpers.
2. Define the common entity envelope and the initial v1 entity set called out in the framework document.
3. Separate canonical fields from provider-specific metadata and make missing-data rules explicit so connectors are not forced into fake completeness.
4. Keep the contracts reusable by skills, connectors, executors, and future sync work; do not bake renderer, provider, or cloud-service assumptions into them.
5. Add at least minimal worked examples or fixtures for the entities the daily-briefing wedge needs first.
6. Validate by checking that Step 03 and Step 04 can reference these contracts without introducing provider-specific fields or ambiguous entity ownership.
7. Update Implementation Notes and Outcome Summary with the final entity list, open questions, and the exact files that now own the contracts.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Framework evidence already proposes `Task`, `Event`, `Message`, `Thread`, `Person`, `Project`, `Document`, `ActionItem`, and `Artifact` as the initial entity vocabulary.
- The contract must preserve raw provider metadata while keeping skills dependent on canonical entities.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/entities/` for:
1. `EntityEnvelope` — shared wrapper: `id`, `type`, `source`, `canonical`, `providerMeta`, `createdAt`, `updatedAt`
2. `Task` — title, status, priority, assignee, project, due, labels, description
3. `Event` — title, start, end, attendees, location, recurrence, calendar
4. `Message` — content, sender, channel/thread, timestamp, reactions
5. `Thread` — messages[], participants, topic, channel
6. `Person` — name, email, role, team, avatarUrl
7. `Project` — name, key, status, lead, description
8. `Document` — title, content, author, path, lastModified
9. `ActionItem` — description, owner, status, due, source entity ref
10. `Artifact` — type, content, format, generatedBy, approvalStatus

**Key decisions to apply**:
- DEC-0002: Each entity is a `z.object()` schema. TypeScript types are inferred via `z.infer<>`.
- DEC-0007: These schemas also define the expected YAML frontmatter shape for entity markdown files. Each entity schema must include a `frontmatterSchema` export that maps to the fields stored in YAML.

**Constraints**:
- Canonical fields must not reference provider-specific concepts (no `jiraKey`, `outlookId` in canonical schemas).
- Provider metadata lives in `providerMeta: z.record(z.unknown())` on the envelope.
- All fields that may be absent across providers must be `z.optional()`.

**Validation**:
- `pnpm -r run typecheck` passes after adding schemas.
- Each schema can parse a minimal fixture JSON without errors.
- Steps 03 and 04 can import entity types without adding provider-specific fields.

**Junior-readiness verdict**: PASS. Entity list is exhaustive, schema format is locked, fixture requirement is explicit.

## Human Notes

- Integrity risk: if canonical fields mirror one provider too closely, every later connector and skill will inherit that lock-in.
- Prefer semantically stable fields and allow partial population where providers differ.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the canonical entity envelope and v1 entity contracts exist in concrete files with examples and clear ownership.
- Validation target: the skill-manifest and connector-contract steps can consume these entities without redefining or translating them locally.
