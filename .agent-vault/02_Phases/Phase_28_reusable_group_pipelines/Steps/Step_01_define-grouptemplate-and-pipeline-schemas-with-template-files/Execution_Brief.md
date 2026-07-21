# Execution Brief

## Why

- Every other step in the phase consumes these types: the runner (02) executes a `Pipeline`, the GroupBoard (03) renders its stages, and the built-ins (04) are instances of `GroupTemplate`. Getting the schema right first means 02–04 are execution and rendering, not modeling.
- The schema productizes two proven shapes from this repo's own workflow: `.pi/agents/*.md` frontmatter (`name`, `model`, `thinking` + the markdown body as system prompt) generalizes into the template member spec, and the docs/pi-teams.md loop conventions (explicit tokens like `QA REVIEW REQUESTED`, loop-until-pass) generalize into completion conditions and transitions.
- The transition-based graph shape is deliberately richer than v1 UI needs (linear chains + loop-backs) so a later visual editor is a new front-end, not a schema migration (phase non-goal: no drag-and-drop editor now).

## Prerequisites

- PHASE-27 merged through STEP-27-01 at minimum: `packages/contracts/src/group.ts` exists with `SGroupMemberSpec { role, harnessId, name?, nudgePolicy? }` (role = id-safe slug `^[a-z0-9][a-z0-9-]{0,31}$`) and `SSession.members`. The template member spec must **extend/instantiate-to** that shape, not duplicate it.
- Read fully: `packages/contracts/src/session.ts` (the tolerant-reader house style to copy exactly — open `kind` strings, `safeParse`, unknown-extra-fields-dropped, `readXxx` never throws); `packages/contracts/src/workspace/layout.ts` (`workspaceDirectories.groupTemplates = 'groups/templates'` — the global template dir, already scaffolded by workspace-v2 bootstrap from STEP-21-04); `.pi/agents/reviewer.md` + `.pi/teams.yaml` (the member shape being generalized); `docs/pi-teams.md` (the token conventions completion conditions must be able to express).
- Read ARCH-0009 "Pipeline" data-flow bullet — the schema must express exactly that loop: template → prompt → completion condition (stop reason / token / user gate) → transitions with `maxIterations` loop-backs.

## Likely Code Paths

- `packages/contracts/src/pipeline.ts` (new; export from `contracts/src/index.ts`) — the schema family, effect/Schema house style throughout:
  - `STemplateMemberSpec`: `{ role, harnessId, name?, model?, systemPromptPath?, nudgePolicy? }` — `role` reuses the STEP-27-01 slug pattern; `model` is an optional harness-settings hint (harness may ignore it — see constraints); `systemPromptPath` is a **relative path resolved against the template file's directory** (built-ins carry inline `systemPrompt` text instead — allow `Schema.Union` of `systemPromptPath` / `systemPrompt`, at most one).
  - `SCompletionCondition` (tagged union on `type`): `{ type: 'stop_reason' }` (turn ends with `end_turn` → stage output complete — the baseline); `{ type: 'token', token: string }` (stage completes when the turn's final agent message contains the token — the `QA REVIEW REQUESTED` convention, for harnesses with ambiguous stops); `{ type: 'user_gate', prompt?: string }` (pause for human approve/reject in the UI).
  - `STransition`: `{ to: <stageId | 'done'>, ifOutputContains?: string, ifGate?: 'approve' | 'reject', maxIterations?: int >= 1 }` — ordered list per stage, **first match wins**, a condition-free transition is the default/fallback; `maxIterations` only meaningful on edges that revisit an earlier stage (loop-backs).
  - `SStage`: `{ id (slug), member (role ref), promptTemplate: string, completion: SCompletionCondition, transitions: readonly STransition[] }`.
  - `SPipeline`: `{ entryStage: string, stages: readonly SStage[] }`.
  - `SGroupTemplate`: `{ id (slug), name, description?, version?: int (default 1), members: readonly STemplateMemberSpec[], pipeline?: SPipeline }` — `pipeline` optional so a template can also describe a plain Phase-27 manual group.
  - Tolerant reader `readGroupTemplate(value)` mirroring `readSessionEvent` (never throws, unknown extra fields tolerated) **plus** a semantic validator `validateGroupTemplate(template)` returning a list of human-readable errors for cross-references the schema alone cannot check: every `stage.member` ∈ member roles; every `transition.to` ∈ stage ids ∪ `'done'`; `entryStage` exists; stage/member ids unique; every `{{placeholder}}` in every `promptTemplate` ∈ the known set (see constraints); at least one path from `entryStage` to `'done'` (simple reachability walk — prevents un-terminable pipelines at load time, not run time).
- `packages/runtime/src/templates/loader.ts` (new module dir; runtime owns disk, harness never does — ARCH-0009 boundary) — `loadTemplates({ workspaceRoot, projectRoot? })`:
  - Global dir: `<workspaceRoot>/groups/templates/*.json` (use `workspaceDirectories.groupTemplates`, never a hard-coded string).
  - Per-project dir (recorded assumption): `<projectRoot>/.srgnt/templates/*.json` — in-repo so templates travel with the project via git, mirroring the `.pi/` precedent. Project templates **shadow** global ones on `id` collision.
  - Returns `{ templates, errors }` where each error carries `{ file, message }` — a malformed file is reported and skipped, it never aborts the whole load (tolerant-loader stance). Semantic-validation failures are errors too, with the template id and the offending reference named (e.g. `"stage 'qa' references unknown member role 'tester'"`).
- Fixture templates under `packages/runtime/src/templates/__fixtures__/` (or the package's existing test-resource convention — follow what `runtime` tests already do): at least one fully valid pipeline template, one schema-invalid file, one semantically invalid file (dangling stage ref), one unreachable-`done` file.

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- **Canonical on-disk format is JSON** (`*.json`, decoded with the effect/Schema reader). The phase note's "JSON/YAML" is satisfied by: export always JSON; YAML import is deferred (no `yaml` dependency exists anywhere in the workspace today — adding one is a STEP-28-04 decision, not a schema concern). Recorded in the phase note.
- Prompt templating is dumb string substitution, no logic: known placeholders are `{{task}}` (the run's kickoff input), `{{previous_output}}` (final agent-message text of the immediately preceding stage turn), `{{stage.<id>.output}}` (last completed output of a named stage), `{{iteration}}` (current visit count of this stage). Unknown placeholders are a load-time validation error, never a runtime surprise.
- `model` and `systemPromptPath` are *hints with universal fallbacks*: ACP has no portable per-session model/system-prompt field, so the runner (02) delivers the system prompt as a preamble of the member's first stage prompt (works on every tier and harness), and `model` maps to harness settings only where the definition supports it (else surfaced as a template-load warning, not an error).
- Schemas live in `@srgnt/contracts`; the file loader lives in `@srgnt/runtime`; **nothing in this step touches `@srgnt/harness` or the UI** — the step-note's earlier `packages/harness/src/groups/templates/` pointer is superseded (built-in template *data* lands in 04 and its home is decided there).
- Unknown/extra fields on templates decode-and-drop (forward compatibility): a newer srgnt may add fields; an older one must still load the file.

## Execution Checklist

1. Write `packages/contracts/src/pipeline.ts` with the schema family above; export from the package index; round-trip + tolerance tests beside the existing `session.test.ts` pattern.
2. Implement `validateGroupTemplate` semantic checks with one test per rule (dangling member, dangling transition, missing entry, duplicate ids, unknown placeholder, unreachable `done`).
3. Implement `packages/runtime/src/templates/loader.ts` (global + per-project dirs, shadowing, `{ templates, errors }` shape); tests over the fixture set including a mixed dir (one good + one bad file → good template loads, bad file reported with its path).
4. Add the group-template IPC surface stub to `contracts/src/ipc/` (list-templates request/response) so 03/04 have a typed channel to build on — wiring the handler is 04's job.
5. Run the Validation Plan; record deviations (esp. any schema-shape changes negotiated during review) in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files|STEP-28-01 Define GroupTemplate and Pipeline schemas with template files]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- Substrate: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_01_model-group-sessions-with-member-channels-and-roster-ui|STEP-27-01]] (`SGroupMemberSpec`, role slug rules)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (pipeline data flow, contracts ownership, workspace layout)
