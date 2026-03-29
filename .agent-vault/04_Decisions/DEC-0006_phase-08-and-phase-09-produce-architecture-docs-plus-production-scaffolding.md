---
note_type: decision
template_version: 2
contract_version: 1
title: PHASE-09 and PHASE-10 produce architecture docs plus production scaffolding
decision_id: DEC-0006
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]]'
tags:
  - agent-vault
  - decision
---

# DEC-0006 - PHASE-09 and PHASE-10 produce architecture docs plus production scaffolding

Clarify late-phase output expectations so sync and premium preparation produce durable docs plus production-grade interfaces instead of vague future ideas.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: PHASE-09 and PHASE-10 produce architecture docs plus production scaffolding.
- Related notes: [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]].
PHASE-09 (Sync Preparation) and PHASE-10 (Premium Fred Preparation) were originally ambiguous about whether they produce only design documents or also include code. Both phases deal with forward-looking architecture (sync engine, premium entitlements) that won't ship in v1 but needs to be designed before v1 ships to avoid rework.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
PHASE-09 and PHASE-10 produce **architecture design documents plus production scaffolding code**. Each step delivers:

1. A reviewed architecture document (the primary deliverable).
2. Production-ready foundation code: interfaces, types, directory structure, and stub implementations that future phases will build on.

This is not throwaway prototype code. The scaffolding must follow the same quality standards as other phases (Zod schemas, tests, linting).

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **Architecture documents only**: Lowest scope. Rejected because it defers all implementation risk to future phases, increasing the chance of design-implementation mismatch.
- **Architecture docs + throwaway prototypes**: Validates assumptions but creates waste. Rejected because the scaffolding work (interfaces, types, directory structure) is not throwaway — it's the foundation future code builds on.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Validates architecture decisions with real code before committing to full implementation.
- **Pro**: Future phases can build on existing interfaces and directory structure rather than starting from scratch.
- **Pro**: Catches integration issues early (e.g., does the sync schema actually compose with the workspace domain model?).
- **Con**: Increases scope of PHASE-09/09 by ~30-40%.
- **Con**: Scaffolding code may need revision when full implementation begins. Mitigated by keeping scaffolding to interfaces and types, not business logic.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- Each PHASE-09/09 step must define both a document deliverable and a code deliverable.
- Code deliverables must be in the monorepo under appropriate package directories.
- Scaffolding code must use Zod schemas (DEC-0002) and pass lint/typecheck.
- Step acceptance criteria must include both document review and code review.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_09_sync_preparation/Phase|PHASE-09 Sync Preparation]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review; PHASE-09 and PHASE-10 now assume doc deliverables plus production scaffolding as the baseline contract.
<!-- AGENT-END:decision-change-log -->
