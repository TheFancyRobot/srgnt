---
note_type: step
template_version: 2
contract_version: 1
title: Ship built-in templates with import and export
step_id: STEP-28-04
phase: '[[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-28-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Ship built-in templates with import and export

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Ship built-in templates with import and export.
- Parent phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]].
- Exact outcome: two built-in templates ship — `implement → review → QA → iterate` (loop-back on QA failure, `QA REVIEW REQUESTED`-style token convention from docs/pi-teams.md) and `research → implement → test` (the `srgnt-team` loop, minus its reviewer role — a documented, deliberate omission so this built-in stays the minimal fully automatic chain) — selectable from a template picker; templates import/export as **JSON** files (the only supported interchange format in v1) with schema validation on import and refusal on `id` collision.
- Starting files: `packages/harness/src/groups/templates/` (built-in template data); picker UI in the group-creation flow; import/export in Settings or the picker.
- Validate: one real dogfood run of implement→review→QA→iterate on an actual srgnt task recorded as a session note; import/export round-trip test; malformed import rejected with actionable errors.

## Why This Step Exists

- Templates + runner are inert without ready-made pipelines to pick and run. This ships the two flagship built-ins and file-based import/export — the phase's payoff and the substrate for its dogfood acceptance run.
- The built-ins are not invented: they generalize this repo's own pi-team loops harness-agnostically. `docs/pi-teams.md` + `.pi/teams.yaml` are the **origin** of `implement → review → QA → iterate`; encoding them proves the schema (01) + runner (02) productize the workflow srgnt was built with. The concrete role→member and token→condition mapping is tabulated in the Execution Brief and cited in the template descriptions.

## Prerequisites

- STEP-28-02 merged (runner + gate IPC). STEP-28-01 merged (built-ins must validate clean through `validateGroupTemplate`). STEP-28-03 recommended so the dogfood run is observable (03/04 parallelize after 02).
- Read: `docs/pi-teams.md` + `.pi/teams.yaml` + `.pi/agents/*.md` (roles + structured output tokens — the mapping source: `RESEARCH BRIEF`, `REVIEW COMPLETE`, `ISSUE REPORT`, `QA REVIEW REQUESTED`); the STEP-28-01 brief (template format, inline `systemPrompt` vs `systemPromptPath`, placeholder set).

## Relevant Code Paths

- `packages/runtime/src/templates/builtins/*.json` (new) — the two built-in templates, bundled, read-only in UI, lowest shadowing precedence (`builtin < global < project`).
- `packages/runtime/src/templates/io.ts` (new) — `exportTemplate` (canonical JSON) + `importTemplate` (decode → `validateGroupTemplate` → write; JSON only; no partial write; an `id` collision is always refused with a named error, never overwritten, suffixed, or prompted).
- Renderer — template picker in STEP-27-01's group-creation flow (`builtin` badge, static stage-graph preview via the STEP-28-03 projection, member→harness mapping form that blocks start until every member is mapped); import/export buttons.
- Dogfood run + session note (acceptance): the Execution Brief.

## Required Reading

- [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- `docs/pi-teams.md` (the loops the built-in templates generalize)

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

- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export/Validation_Plan|Validation Plan]].
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
