---
note_type: step
template_version: 2
contract_version: 1
title: Remove Zod dependency from clean up
step_id: STEP-06-05
phase: '[[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]'
status: completed
owner: opencode
created: '2026-03-27'
updated: '2026-03-28'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Remove Zod dependency from clean up

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Remove Zod dependency from clean up.
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
- Next action: Phase 06 is complete; continue with Phase 07 when ready.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Removed the final direct `zod` dependency from `packages/contracts/package.json` and refreshed `pnpm-lock.yaml`.
- Renamed the remaining legacy `z*` schema exports to `S*` everywhere in contracts source, tests, examples, and desktop terminal contract checks.
- Removed the temporary compatibility-wrapper path entirely; `packages/contracts/src/shared-schemas.ts` now exposes only Effect helpers such as `parseSync(...)` and `safeParse(...)`.
- Full repo validation passed after cleanup: `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-025155-migrate-consumer-packages-runtime-desktop-sync-entitlements-fred-opencode|SESSION-2026-03-28-025155 opencode session for Migrate consumer packages runtime desktop sync entitlements fred]] - Continued session after STEP-06-04 completion to remove the remaining contracts-layer Zod compatibility surface.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- STEP-06-05 is complete.
- The repository no longer has any source-level Zod builder usage or any direct `zod` dependency in workspace package manifests.
- DEC-0013 records the final cleanup boundary: contracts now expose `S*` Effect schemas only, with shared parse helpers for decoding.
