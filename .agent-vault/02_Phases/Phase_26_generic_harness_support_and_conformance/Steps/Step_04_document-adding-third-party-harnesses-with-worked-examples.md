---
note_type: step
template_version: 2
contract_version: 1
title: Document adding third-party harnesses with worked examples
step_id: STEP-26-04
phase: '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-26-02
  - STEP-26-03
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Document adding third-party harnesses with worked examples

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Document adding third-party harnesses with worked examples.
- Parent phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]].
- Exact outcome: an "Add your own harness" guide ships in `docs/` with three worked, manually verified examples — Gemini CLI, claude-code-acp, and codex-acp — covering install, HarnessDefinition setup (or registry add), conformance-runner verification, and known quirks per agent.
- Starting files: `docs/` (new guide); registry + conformance runner from earlier steps; the three target agents installed for verification.
- Validate: following the doc verbatim on at least one real third-party agent produces a working session; the other two verified at least through conformance-runner pass/report.

## Why This Step Exists

- The docs are the phase's proof-of-generality: a third party following the guide from "I have an ACP agent" to "it has a capability-matrix row" without insider knowledge is what makes bring-your-own real. The guide is grounded in the shipped flow: install yourself → add (catalog / editor / hand-edit `harnesses.json`) → detect → conformance run → matrix row.
- The three worked examples double as the phase's manual proof runs (Gemini CLI through a full session; claude-code-acp and codex-acp at least through conformance reports).

## Prerequisites

- STEP-26-02 and STEP-26-03 merged; the three agents installable locally; provider credentials for at least Gemini CLI.
- Verify each agent's exact ACP invocation from its *current* docs at execution time — never from memory or from this note; record tested versions (the `PI_ACP_VERSION` discipline applied to prose).
- Read the lessons note (its comparison axes structure each worked example's quirks section) and the Outcome notes of steps 01–03 (document what shipped, not what was planned).

## Relevant Code Paths

- `docs/adding-your-own-harness.md` (new; beside `docs/flagship-workflow-walkthrough.md` for house style) + a `README.md` pointer.
- Optional in-product "Learn more" link from the Add-harness flow (recorded default: yes).
- Evidence inputs: the STEP-26-02 conformance reports per agent; `packages/contracts/src/harness.ts` for the field-by-field concepts section.

## Required Reading

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]

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

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-18
- Next action: Read [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples/Validation_Plan|Validation Plan]].
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
