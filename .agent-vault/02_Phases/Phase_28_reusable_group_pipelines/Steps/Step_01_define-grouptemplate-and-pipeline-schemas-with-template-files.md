---
note_type: step
template_version: 2
contract_version: 1
title: Define GroupTemplate and Pipeline schemas with template files
step_id: STEP-28-01
phase: '[[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on: []
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Define GroupTemplate and Pipeline schemas with template files

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Define GroupTemplate and Pipeline schemas with template files.
- Parent phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]].
- Exact outcome: GroupTemplate and Pipeline schemas exist in contracts (members with role/harness/model/system-prompt path; stages with prompt templates and an ordered, first-match-wins list of completion conditions — stop reason, explicit token, or user gate — with user gates modeled as their own memberless gate stages; transitions with conditions, explicit `advance`/`loop_back` kinds, `maxIterations`), plus a template file loader/validator reading `groups/templates/` (global) and per-project template dirs. The flagship `implement → review → QA → iterate` template (STEP-28-04) must be expressible as written.
- Starting files: `packages/contracts/src/pipeline.ts` (new schemas; export from `index.ts`); `packages/runtime/src/templates/loader.ts` (new — runtime owns disk, not harness); fixture templates under the runtime package's test resources. (Supersedes the earlier `packages/harness/src/groups/templates/` pointer — built-in template *data* lands in STEP-28-04.)
- Validate: schema decode + tolerance tests; `validateGroupTemplate` semantic checks (dangling refs, unknown placeholders, unreachable `done`); loader surfaces actionable `{ file, message }` errors and skips-not-aborts on a bad file.

## Why This Step Exists

- Every later step consumes these types: the runner (02) executes an `SPipeline`, the GroupBoard (03) renders its stages, the built-ins (04) are `SGroupTemplate` instances. Modeling first makes 02–04 wiring, not invention.
- Productizes this repo's own workflow shapes: `.pi/agents/*.md` frontmatter → template member spec; docs/pi-teams.md loop tokens → completion conditions. The transition-graph shape is intentionally richer than v1 UI needs so a later visual editor is a new front-end, not a schema migration.

## Prerequisites

- PHASE-27 merged through STEP-27-01: `SGroupMemberSpec` (role slug `^[a-z0-9][a-z0-9-]{0,31}$`) + `SSession.members` exist; the template member spec extends that shape.
- Read: `packages/contracts/src/session.ts` (tolerant-reader house style to copy exactly); `packages/contracts/src/workspace/layout.ts` (`workspaceDirectories.groupTemplates`); `.pi/agents/*.md` + docs/pi-teams.md (shapes being generalized); ARCH-0009 pipeline data-flow bullet.

## Relevant Code Paths

- `packages/contracts/src/pipeline.ts` (new) — `STemplateMemberSpec`, `SCompletionCondition` (stop_reason/token/user_gate), `STransition` (`to`/`kind: advance|loop_back`/`ifOutputContains`/`ifGate`/`ifCompletedBy`/`maxIterations`, first-match-wins), `SStage` (ordered `completionConditions[]`, first-match-wins, total condition last; gate stages carry no member/prompt), `SPipeline`, `SGroupTemplate`; tolerant `readGroupTemplate` + semantic `validateGroupTemplate`.
- `packages/runtime/src/templates/loader.ts` (new) — global `groups/templates/*.json` + per-project `.srgnt/templates/*.json`, project shadows global, `{ templates, errors, warnings }` (warnings = non-fatal, template still loads; e.g. an unsupported `model` hint). The loader passes each file's `sourceDir` into `validateGroupTemplate` and checks `systemPromptPath` containment before reading any prompt file.
- `packages/contracts/src/session.ts`, `.../workspace/layout.ts` — house style + template dir constant to reuse.
- Details, full schema shape, placeholder set, and the path-escape guard: the Execution Brief.

## Required Reading

- [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (pipeline data flow)
- `.pi/agents/*.md` frontmatter (the member-spec shape being generalized)

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

- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files/Validation_Plan|Validation Plan]].
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
