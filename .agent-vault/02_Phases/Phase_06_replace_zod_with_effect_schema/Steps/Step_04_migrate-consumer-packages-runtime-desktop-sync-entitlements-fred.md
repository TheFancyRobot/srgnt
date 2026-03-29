---
note_type: step
template_version: 2
contract_version: 1
title: Migrate consumer packages runtime desktop sync entitlements fred
step_id: STEP-06-04
phase: '[[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]'
status: completed
owner: ''
created: '2026-03-27'
updated: '2026-03-28'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-28-021556-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-021556 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]]'
  - '[[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Migrate consumer packages runtime desktop sync entitlements fred

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Migrate consumer packages runtime desktop sync entitlements fred.
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
- Next action: Use STEP-06-05 to decide and finish the remaining contracts-layer Zod cleanup.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Migrated the remaining production consumer schemas to Effect Schema in `packages/sync/src/engine.ts`, `packages/sync/src/classification.ts`, `packages/fred/src/boundary.ts`, `packages/entitlements/src/index.ts`, and `packages/desktop/src/main/pty/contracts.ts`.
- Updated `packages/desktop/src/main/pty/node-pty-service.ts` to decode PTY request and process payloads with `parseSync(...)` instead of Zod `.parse()`.
- Repaired validation fallout in `packages/runtime/src/store/canonical.test.ts` by switching the runtime validator fixture from `zEntityEnvelope` to `SEntityEnvelope`.
- Consumer-package tests now validate the Effect schemas directly via `safeParse(...)` / `parseSync(...)`, especially in `packages/desktop/src/main/terminal/terminal-ipc.test.ts`, `packages/fred/src/boundary.test.ts`, and `packages/entitlements/src/index.test.ts`.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-021556-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-021556 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]] - Session created.
- 2026-03-28 - [[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- STEP-06-04 is complete.
- Runtime-adjacent consumer packages and desktop PTY contracts now use Effect Schema, and the repo once again passes `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Follow-up shifts to STEP-06-05 because the only remaining direct `zod` dependency is the legacy compatibility layer still inside `packages/contracts/`.
