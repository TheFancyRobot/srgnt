---
note_type: step
template_version: 2
contract_version: 1
title: Add prompt-turn nudges and file mailbox fallback tiers
step_id: STEP-27-04
phase: '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-27-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Add prompt-turn nudges and file mailbox fallback tiers

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add prompt-turn nudges and file mailbox fallback tiers.
- Parent phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]].
- Exact outcome: tier 2 and tier 3 of the bus land — a nudge scheduler injects pending-message digests into a member's next `session/prompt` (debounced, per-member policy for idle members), and the bus mirrors continuously to `group/notes/mailbox.md` so harnesses with broken MCP passthrough still participate via their own file tools when nudged.
- Starting files: `packages/harness/src/groups/` (nudge scheduler in broker); mailbox writer beside the bus persistence; per-member tier selection driven by conformance/quirk data.
- Validate: integration test where a member with MCP disabled receives and answers a message purely via nudge + mailbox; debounce behavior unit-tested; mailbox content matches `bus.jsonl`.

## Why This Step Exists

- Tiers 2/3 make the bus universal — and under the entry gate's conservative outcome **this is the only way Pi members participate at all** (spike: MCP injection never arrives, but prompt text flows fine). Mirrors the proven pi-teams nudge UX.

## Prerequisites

- STEP-27-03 merged. Read: spike report probe 2 + implications; `docs/pi-teams.md`; `supervisor/types.ts` (`SupervisorClock` injected-clock seam for debounce tests); STEP-24-05 brief (derived-file rules `mailbox.md` copies).

## Relevant Code Paths

- `packages/harness/src/groups/nudges.ts` (new) — `NudgeScheduler`: pending digests, 2 s debounce, injected clock; emits `nudge-ready`, delivery is the controller's job.
- `GroupSessionController` — `nudgePolicy` `'auto'` (prompt idle members, never interrupt an in-flight turn) vs `'on-next-prompt'`; fenced `[srgnt group bus]` digest with tier-appropriate reply instruction.
- Tier derivation: effective capabilities + hello-state → roster badges (quirk-badge pattern from 23-03/25-03); Pi's `mcp-passthrough-gaps` clamp lands it on tier 2 automatically, nothing keyed on harness id.
- `packages/runtime/src/sessions/mailbox.ts` (new) — `group/notes/mailbox.md` mirror: append live, atomic regen from `bus.jsonl` on open, never source of truth. Tier-2/3 E2E needs NO new mock directives (`expect_prompt` + `read_file`).

## Required Reading

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (tier rationale)
- `docs/pi-teams.md` (nudge delivery precedent)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
