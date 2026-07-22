---
note_type: phase
template_version: 2
contract_version: 1
title: Reusable Group Pipelines
phase_id: PHASE-28
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-20'
depends_on:
  - '[[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]]'
related_architecture:
  - '[[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]'
related_decisions:
  - '[[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017 Pivot srgnt from data aggregator to ACP coding-agent command center]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 28 Reusable Group Pipelines

Use this note for a bounded phase of work in \`02_Phases/\`. This note is the source of truth for why the phase exists, what is in scope, and how completion is judged. Session notes can narrate execution, but they should not replace this note as the plan of record. Keep it aligned with [[07_Templates/Note_Contracts|Note Contracts]] and link to the related architecture, bug, and decision notes rather than duplicating them here.

## Objective

- Define and complete the Reusable Group Pipelines milestone.
- Define GroupTemplate + Pipeline schemas — members (role, harness, model, system prompt) generalizing `.pi/agents/*.md`; stages with prompt templates and completion conditions (stop reason / token / user gate); transitions with loop-backs and `maxIterations` — stored as reusable template files (global or per-project).
- Implement the deterministic pipeline runner as a main-process state machine over ACP prompt turns, with first-class user gates for human review.
- Visualize stage progress on the GroupBoard; ship built-in templates (`implement → review → QA → iterate`, `research → implement → test`) with import/export.

## Why This Phase Exists

- Capture the next bounded milestone after [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]].

## Scope

- Add the concrete work items for this milestone.
- Create step notes as execution becomes clearer.
- GroupTemplate schema (members: role/harness/config with model + system prompt path) and Pipeline schema (stages with prompt templates + completion conditions; transitions with conditions, loop-backs, `maxIterations`), persisted as template files under `groups/templates/` (global) and per-project.
- Deterministic pipeline runner in main: state machine over ACP prompt turns — fill stage template (prior-stage output + bus context) → prompt the stage member → await completion condition (stop reason / explicit token / user gate) → evaluate transitions → advance or loop.
- User gates as first-class stage completions (pause for human review/approval in the UI).
- GroupBoard visualization: stage graph, current stage, iteration counters, per-stage transcripts.
- Built-in templates: `implement → review → QA → iterate` and `research → implement → test` (generalizing this repo's own pi-team loops); template import/export as JSON/YAML.
- Pipeline runs are sequential by default (one active member per stage) — the write-conflict stance from Phase 27 carries over.

## Non-Goals

- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.
- A visual drag-and-drop pipeline editor — v1 authoring is template files + a picker (schema is transition-based and graph-ready for later).
- Parallel stage execution (sequential by default; the write-conflict stance from Phase 27 holds).
- LLM-based routing/coordination as the built-in mechanism — the runner is deterministic; a coordinator-role member over the bus remains possible but is user-configured, not shipped logic.
- Marketplace/sharing infrastructure for templates beyond file import/export.

## Dependencies

- Depends on [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]].
- Must stay aligned with [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (pipeline data flow, deterministic-runner invariant).
- Requires PHASE-27's group sessions, broker, and bus tiers — pipelines orchestrate members that already work manually.

## Acceptance Criteria

- [ ] Scope is concrete and linked to the right durable notes.
- [ ] Step notes exist for the first executable work units.
- [ ] Validation and documentation expectations are explicit.
- [ ] The built-in `implement → review → QA → iterate` template runs end-to-end on a real task with loop-back on QA failure and terminates at `maxIterations` or success.
- [ ] User gates pause the pipeline for human review and resume/abort cleanly.
- [ ] GroupBoard shows stage graph, active stage, iteration counters, and links to per-stage transcripts.
- [ ] Templates load from files (global + per-project), validate against schema with actionable errors, and import/export round-trips.
- [ ] Pipeline runs persist: reopening the app restores the run state honestly (running turns are marked interrupted, resumable where load-capable).
- [ ] E2E: scripted mock-agent pipeline (3 stages incl. one loop-back and one user gate) green.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|PHASE-27 Groups v1 Multi-Harness Sessions and Bus]]
- Current phase status: planned
- Next phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|PHASE-29 Polish Packaging and Release]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- None yet.
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- None yet.
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- None yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [ ] [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files|STEP-28-01 Define GroupTemplate and Pipeline schemas with template files]]
- [ ] [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs|STEP-28-02 Implement deterministic pipeline runner with gates and loop-backs]]
- [ ] [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_03_visualize-stage-progress-on-groupboard|STEP-28-03 Visualize stage progress on GroupBoard]]
- [ ] [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export|STEP-28-04 Ship built-in templates with import and export]]
<!-- AGENT-END:phase-steps -->

## Notes

- Add architecture, bug, and decision links as the milestone becomes more concrete.
- Use the `Steps/` directory for the first executable units instead of expanding this note too far.
- Deterministic-runner decision (decision log D12): reproducible, debuggable, token-free orchestration in code; a coordinator-role member over the bus remains a user-configurable pattern, not shipped logic.
- Completion conditions in practice: ACP stop reasons are the baseline; explicit token match (e.g. `QA REVIEW REQUESTED` — the convention from docs/pi-teams.md) covers harnesses with ambiguous stops; user gates cover judgment calls.
- Built-in templates generalize this repo's own loops: `implement → review → QA → iterate` (review-team/bugfix/qa flow) and `research → implement → test` (`srgnt-team` loop).
- Step order: schemas + templates (01) → runner (02) → GroupBoard viz (03) → built-ins + import/export (04). 03 and 04 parallelize after 02.
- Validation: mock-agent scripted pipeline E2E (loop-back + user gate); one real dogfood run of the implement→review→QA→iterate template on an actual srgnt task, written up as a session note.
- Refinement pass 2026-07-20 (companions filled to junior depth; details live in each step's Execution Brief + Validation Plan):
  - **Schemas home + house style** (STEP-28-01): schema family in `packages/contracts/src/pipeline.ts` (effect/Schema, tolerant `readGroupTemplate` mirroring `readSessionEvent`) + a semantic `validateGroupTemplate` for cross-references the schema can't check (dangling member/transition refs, missing `entryStage`, duplicate ids, unknown `{{placeholder}}`, no path to `'done'`). File loader in `packages/runtime/src/templates/` (runtime owns disk — harness never does, ARCH-0009 boundary). This supersedes the step note's earlier `packages/harness/src/groups/templates/` pointer.
  - **Template member spec extends `SGroupMemberSpec`** (STEP-27-01), not a duplicate; adds `model?` + `systemPromptPath?`/inline `systemPrompt` (at most one). ACP has no portable system-prompt/model field, so the runner delivers the system prompt as a first-turn preamble (works on every tier/harness) and `model` maps to harness settings only where supported (else a load warning).
  - **Runner split** (STEP-28-02): pure deterministic state machine in `packages/harness/src/groups/pipeline-runner.ts` (injected `invokeMember` + clock, disk/transport-free, unit-testable with a scripted fake); `PipelineController` in desktop main hosts it, wires `invokeMember` to `GroupSessionController.prompt`, persists events, owns gate/abort IPC and restart replay — same harness/main split as the broker.
  - **Run state = its event log**: no separate run-state file. Run transitions persist as `system/pipeline_*` kinds in the `SGroupBusEvent` **open-kind space** on `bus.jsonl` (no new log type). This gives rebuildable-from-log run state (STEP-28-03 folds it into a pure projection; restart recovery replays it; a `stage_entered` with no completion = interrupted turn, resumable only where the harness supports load). For that to be true rather than aspirational, the log must be self-sufficient: every event carries a `runId`, `pipeline_started` inlines the **whole immutable pipeline snapshot** plus `templateId`/version/digest, member bindings and the kickoff task, and `stage_entered` records the rendered prompt actually sent. Replay never re-reads `groups/templates/` — template files are mutable, so editing a template must change the next run and nothing already logged.
  - **Completion conditions**: each stage declares an **ordered, non-empty `completionConditions` array**, evaluated first-match-wins, with the matched one recorded as `completedBy`. Kinds: `stop_reason` (baseline, `end_turn`; `refusal`/`max_tokens` = stage failure), `token` (explicit match, e.g. `QA REVIEW REQUESTED`), `user_gate` (suspends indefinitely for the human). The array exists because real stages finish more than one way — a QA stage keys on failure tokens *and* falls back to end-of-turn, so a clean pass is not re-prompted to death; the validator therefore requires the last condition to be a total one. A `user_gate` is a **gate stage** (sole condition, no member/prompt) so transitions still only ever target a stage id or `'done'`. Transitions are labelled `advance`/`loop_back`, and loop-back exhaustion at `maxIterations` terminates honestly (`max_iterations_exhausted`), never loops forever.
  - **Tier-2-only Pi is first-class**: pipelines compose Phase-27 bus tiers; the runner never assumes tier 1 — a member with `capabilityOverrides: { mcpServers: false }` receives stage handoffs via nudge/prompt preamble and runs as a normal stage (E2E + dogfood both assert this).
  - **Built-ins origin cited** (STEP-28-04): `implement → review → QA → iterate` maps from `docs/pi-teams.md` (`review-team`/`bugfix`/`qa`, `QA REVIEW REQUESTED` handoff) and `research → implement → test` from `.pi/teams.yaml` `srgnt-team` — concrete role→member + token→condition table in the STEP-28-04 brief (tokens: `RESEARCH BRIEF`, `REVIEW COMPLETE`, `ISSUE REPORT`, `QA REVIEW REQUESTED`). Built-ins ship harness-agnostic (member `harnessId` is a picker-filled placeholder; start blocks until every member is mapped).
  - **Format decision**: canonical on-disk + export format is **JSON**; YAML import deferred (no `yaml` dependency in the workspace; adding one for import-only is out of v1 scope). Import validates + refuses `id` collisions and half-parses (no destructive/partial writes); `import(export(t)) === t`.
  - Recorded assumptions / Decision-needed items: per-project template dir = `<projectRoot>/.srgnt/templates/` (in-repo, travels via git, mirrors `.pi/`); built-in template data home = `packages/runtime/src/templates/builtins/*.json` (files, not codegen — keeps import/export symmetric); prompt placeholders = `{{task}}`/`{{previous_output}}`/`{{stage.<id>.output}}`/`{{iteration}}` only; token-condition miss re-prompts up to a small cap then fails; `maxIterations` default (unset loop-back edge) = small constant in one options object (default 3 in the built-ins). Decision needed (non-blocking): whether tier-2 member *replies* need mechanical re-ingestion onto the bus — depends on STEP-27-04's deferred `mailbox-out` watcher; the runner reads a stage's output from the member's completing turn directly, so v1 does not require it, but a fully-autonomous tier-2 loop-back would.
