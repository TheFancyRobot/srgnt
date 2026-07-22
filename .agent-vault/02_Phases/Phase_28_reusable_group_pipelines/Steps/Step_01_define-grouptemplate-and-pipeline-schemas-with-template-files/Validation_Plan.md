# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — schema round-trip, tolerance, and semantic-validator suites for `pipeline.ts`.
- `pnpm --filter @srgnt/runtime test` — template loader suite over the fixture set.
- `pnpm typecheck && pnpm lint` — workspace-wide; both packages export cleanly.

## Acceptance Checks

- A valid pipeline template fixture (members + stages + token/gate/stop-reason conditions + a `kind: 'loop_back'` transition with `maxIterations`) decodes, semantic-validates clean, and round-trips encode→decode unchanged.
- **Multi-condition stages**: a stage declaring `completionConditions: [{ token: 'ISSUE REPORT' }, { stop_reason }]` decodes with the order preserved, and the fixture's `ifCompletedBy` transitions resolve against the declared conditions. Order is load-bearing (first match wins) — assert it survives encode→decode, not just that both conditions are present.
- **Gate stages are real nodes**: a stage whose sole condition is `user_gate` and which carries no `member`/`promptTemplate` validates clean, is a legal `transition.to` target, and its `ifGate: 'approve' | 'reject'` edges validate.
- The built-in shapes are expressible: write the **whole** `implement → review → QA → iterate` flow as a fixture — `review` completing on the `REVIEW COMPLETE` token with a `stop_reason` fallback, `qa` completing on `ISSUE REPORT`/`QA REVIEW REQUESTED`/`stop_reason`, a `kind: 'loop_back'` edge to `implement` with `maxIterations`, and an explicit `approve` gate stage before `done` — encoding STEP-28-04's mapping table stage-for-stage. If the schema cannot express the phase's own flagship template, the step is not done.
- `loadTemplates` returns global + per-project templates with per-project shadowing on `id` collision (assert the project copy wins).
- Loader errors are actionable: each carries the file path and a message naming the failing field/reference; a junior can fix the template from the error alone (spot-check the strings in tests, not just error counts).
- **Warnings are a distinct non-fatal channel:** a template whose member carries a `model` hint the harness definition cannot apply appears in `templates` (it loads and is usable) *and* produces exactly one `warnings` entry naming file, template id, member role, and the ignored value — and produces **no** `errors` entry. Assert the two lists are disjoint and that `templates.length + errors.length` equals the number of files considered.
- **Path containment is the loader's job and runs before reading:** `validateGroupTemplate(template)` called without `sourceDir` still rejects absolute paths, `..` segments, and non-POSIX separators; called with `sourceDir` it also rejects a path that resolves outside that directory. Assert with a spy/fixture that no prompt-file read happens for a rejected `systemPromptPath`.

## Edge Cases

- Schema-invalid JSON (wrong types) → reported in `errors` with its path, other files in the dir still load.
- Non-JSON garbage / empty file → same: skip + report, never throw.
- Semantically invalid: dangling `stage.member`, dangling `transition.to`, missing `entryStage`, duplicate stage ids, unknown `{{placeholder}}`, no path to `'done'` — one failing fixture or inline case each, each producing a distinct named error.
- Semantically invalid, multi-condition rules: empty `completionConditions`; a stage whose last condition is a `token` (no total fallback → could hang); `user_gate` mixed with other conditions or on a stage that also has a `member`; a gate stage carrying a `promptTemplate`; `ifGate` on a non-gate stage; `ifCompletedBy` naming a condition the stage never declares; an `advance` edge that re-enters an earlier stage or a `loop_back` edge that does not — one case each, each with its own named error.
- Unknown extra fields at every level (template, member, stage, transition) decode successfully and are dropped (tolerant-reader invariant).
- Template with `members` but no `pipeline` is valid (plain Phase-27 group template).
- Missing template dirs (fresh workspace, project without `.srgnt/`) → empty result, no error.
- `systemPromptPath` absolute (POSIX `/etc/...`, Windows `C:\...`, UNC `\\host\share`), containing `..`, empty, or a sibling-directory near-miss (`../templates-evil/p.md` next to `templates/`) → validation error and the template is skipped, not loaded prompt-less. Include a symlink case: a prompt file inside the template dir that symlinks outside it is rejected after `realpath`, matching the ARCH-0009 fs path-guard stance.

## Regression Expectations

- No behavior change to existing `contracts` schemas: `session.test.ts`, `shared-schemas.test.ts`, and the Phase-27 `group.ts` suites stay green untouched.
- Workspace bootstrap behavior unchanged — this step reads `groups/templates/`, it does not alter layout or seeding.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files|STEP-28-01 Define GroupTemplate and Pipeline schemas with template files]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
