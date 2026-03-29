---
note_type: step
template_version: 2
contract_version: 1
title: Migrate contracts package schemas to Effect Schema
step_id: STEP-06-03
phase: '[[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]'
status: completed
owner: opencode
created: '2026-03-27'
updated: '2026-03-28'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-28-014423-migrate-contracts-package-schemas-to-effect-schema-opencode|SESSION-2026-03-28-014423 opencode session for Migrate contracts package schemas to Effect Schema]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Migrate contracts package schemas to Effect Schema

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Migrate contracts package schemas to Effect Schema.
- Parent phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]].

## Why This Step Exists

- Explain why this step matters to the parent phase.
- Call out the risk reduced, capability added, or knowledge gained.

## Prerequisites

- List the notes, approvals, tooling, branch state, or prior steps required before starting.
- Include blocking commands or setup steps if they are easy to forget.

## Relevant Code Paths

- List the most likely files, directories, packages, tests, commands, or docs to inspect.
- Include only the paths that help a new engineer get oriented quickly.

## Required Reading

- [[01_Architecture/System_Overview|System Overview]]
- Link the minimum notes, docs, source files, or tests that must be read before editing.
- If a reader can skip something safely, do not list it here.

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner: opencode
- Last touched: 2026-03-28
- Next action: Proceed to STEP-06-04 (migrate consumer packages and validation callers).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Migrated base.ts entity schemas: SEntityEnvelope, SCanonicalEntity (Effect Schema equivalents).
- Migrated task.ts: STask schema created.
- Migrated event.ts: SEvent schema created.
- Effect Schema API: Schema.Struct, Schema.String, Schema.optional, Schema.Literal, Schema.Array, Schema.Record, Schema.pattern for datetime validation.
- datetime string fields: use Schema.String.pipe(Schema.pattern(datetimePattern)) where datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.
- Full migration scope: entities (base, task, event, message, person, artifact, briefing, launch), workspace/layout, ipc/contracts, connectors/manifest, executors/run, skills/manifest.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-004306-audit-zod-usage-across-codebase|SESSION-2026-03-28-004306]] - Migration in progress (base, task, event migrated).
- 2026-03-28 - [[05_Sessions/2026-03-28-014423-migrate-contracts-package-schemas-to-effect-schema-opencode|SESSION-2026-03-28-014423 opencode session for Migrate contracts package schemas to Effect Schema]] - Session created.
<!-- AGENT-END:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-014423-migrate-contracts-package-schemas-to-effect-schema-opencode|SESSION-2026-03-28-014423]] - Completed migration of all remaining contracts schemas.

## Outcome Summary

- STEP-06-03 is complete.
- `packages/contracts/` now provides Effect Schema `S*` equivalents across entities, workspace, IPC, connectors, executors, skills, and shared primitives, while the legacy `z*` compatibility layer remains for follow-on cleanup.
- Validation at the time of completion passed with the then-current full test suite and build, and later Phase 06 audit work confirmed the contracts-side `S*` layer was the solid base for consumer migration.
