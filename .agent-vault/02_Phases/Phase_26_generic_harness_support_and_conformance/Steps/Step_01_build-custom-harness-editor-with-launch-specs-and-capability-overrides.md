---
note_type: step
template_version: 2
contract_version: 1
title: Build custom harness editor with launch specs and capability overrides
step_id: STEP-26-01
phase: '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Build custom harness editor with launch specs and capability overrides

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Build custom harness editor with launch specs and capability overrides.
- Parent phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]].
- Exact outcome: Settings gains a custom-harness editor — create/edit/delete HarnessDefinitions (command, args, env, capability overrides, quirk flags) persisted to workspace `harnesses.json`, with validation and a "test launch" affordance; custom harnesses then behave identically to built-ins everywhere.
- Starting files: `packages/desktop/src/renderer/components/Settings.tsx`; `packages/harness/src/registry/`; workspace `harnesses.json` schema from contracts.
- Validate: add a custom definition pointing at the mock agent binary and run a full session with it; definitions survive restart; invalid specs produce actionable errors.

## Why This Step Exists

- The mechanics of custom harnesses already shipped (contracts + `loadWorkspaceHarnesses` + registry wholesale-shadow merge, and STEP-25-02's settings service/section) — but STEP-25-02 deliberately excluded creation ("no Add harness button"). This step is the front-end that makes bring-your-own a product flow: create/edit/delete over the *full* `SHarnessDefinition` surface, plus a minimal test-launch probe.
- First consumer of the PHASE-25 lessons-learned note: REQ-26-xx entries are expected to name editor fields/emphases. Mechanism is fixed by shipped code; parameters flex with the note.

## Prerequisites

- PHASE-25 merged (STEP-25-01 `detectCommand`/`detectHarness`, STEP-25-02 harnesses service + IPC + section, STEP-25-04 lessons note). Phase note rule: do not start without the lessons note.
- Read the Execution Brief's field-by-field spec before touching the form; read `06_Shared_Knowledge/cross-harness-lessons-learned.md` and reconcile REQ-26-xx onto it first.

## Relevant Code Paths

- `packages/contracts/src/harness.ts` — every field the form covers; `packages/contracts/src/ipc/contracts.ts` — extend the `harness:*` channels.
- `packages/harness/src/registry/registry.ts` — shadow semantics the UI must explain (id collision with a built-in = wholesale shadow, not an error).
- `packages/desktop/src/main/services/harnesses.ts` — create/delete paths on the 25-02 service; renderer Harnesses settings section — the Add flow + full-field editing.
- `packages/harness/src/testing/mock-agent/bin.ts` — the zero-cost real stdio agent for validation (spawn shape in `mock-agent.subprocess.test.ts`).

## Required Reading

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (HarnessDefinition data model)
- `06_Shared_Knowledge/cross-harness-lessons-learned.md` — the PHASE-25 lessons-learned note (requirements input; carries the REQ-26-xx list)

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

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides/Validation_Plan|Validation Plan]].
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
