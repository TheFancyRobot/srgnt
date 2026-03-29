---
note_type: decision
template_version: 2
contract_version: 1
title: Use TypeScript + Zod for all contracts and schemas
decision_id: DEC-0002
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]'
tags:
  - agent-vault
  - decision
---

# DEC-0002 - Use TypeScript + Zod for all contracts and schemas

Freeze one contract-authoring format so Phase 01 through Phase 03 can share runtime-safe schemas without parallel validation approaches.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Use TypeScript + Zod for all contracts and schemas.
- Related notes: [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]].
Every contract in PHASE-01 through PHASE-03 needs a concrete format: entity schemas, connector contracts, executor interfaces, approval model, and workspace domain model. Without a locked format, each step author will make different choices, creating integration debt.

Options evaluated: TypeScript-only types, TypeScript + JSON Schema, TypeScript + Zod. The project is a TypeScript monorepo (Electron desktop app) with no cross-language consumers in v1.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
All contracts and schemas across the srgnt monorepo will be defined using **TypeScript types with Zod schemas** for runtime validation. This applies to:

- Entity schemas (PHASE-01 Steps 01-04)
- Connector contract interfaces (PHASE-01 Step 05)
- Executor interface (PHASE-01 Step 06)
- Workspace domain model (PHASE-03)
- All API boundaries and IPC message shapes

Zod schemas are the source of truth; TypeScript types are inferred via `z.infer<>`. Do not maintain separate type definitions alongside Zod schemas.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **TypeScript types only**: No runtime validation. Would require manual validation code or a separate validation layer later. Rejected because connectors receive untrusted external data (Jira, Outlook, Teams APIs).
- **TypeScript + JSON Schema**: Good for cross-language ecosystems, but srgnt v1 is TypeScript-only. JSON Schema tooling (ajv) is less ergonomic than Zod in TS codebases. Would add complexity without a current consumer.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Runtime validation at connector boundaries catches malformed API responses early.
- **Pro**: Single source of truth (Zod schema) eliminates type/validation drift.
- **Pro**: Zod is the most widely adopted TS validation library; strong ecosystem and IDE support.
- **Con**: Adds a runtime dependency (~50KB). Acceptable for a desktop app.
- **Con**: If srgnt later needs non-TS consumers (e.g., a Go sync server), Zod schemas won't export directly. Mitigation: `zod-to-json-schema` can bridge this if needed.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- `zod` added as a workspace dependency in the monorepo root.
- All PHASE-01 step notes must reference Zod as the schema format.
- Connector SDK (PHASE-04 Step 01) must use Zod for input/output validation.
- PHASE-03 runtime packages use Zod for workspace domain model validation.
- No separate JSON Schema or `.d.ts`-only contract files.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review; downstream contract and runtime steps now treat TypeScript + Zod as fixed.
<!-- AGENT-END:decision-change-log -->
