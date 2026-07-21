# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — schema round-trip, tolerance, and semantic-validator suites for `pipeline.ts`.
- `pnpm --filter @srgnt/runtime test` — template loader suite over the fixture set.
- `pnpm typecheck && pnpm lint` — workspace-wide; both packages export cleanly.

## Acceptance Checks

- A valid pipeline template fixture (members + stages + token/gate/stop-reason conditions + a loop-back transition with `maxIterations`) decodes, semantic-validates clean, and round-trips encode→decode unchanged.
- The built-in shapes are expressible: write the `implement → review → QA → iterate` flow as a fixture (QA stage with `ifOutputContains` loop-back to implement, `maxIterations`, token condition `QA REVIEW REQUESTED`) — if the schema cannot express the phase's own flagship template, the step is not done.
- `loadTemplates` returns global + per-project templates with per-project shadowing on `id` collision (assert the project copy wins).
- Loader errors are actionable: each carries the file path and a message naming the failing field/reference; a junior can fix the template from the error alone (spot-check the strings in tests, not just error counts).

## Edge Cases

- Schema-invalid JSON (wrong types) → reported in `errors` with its path, other files in the dir still load.
- Non-JSON garbage / empty file → same: skip + report, never throw.
- Semantically invalid: dangling `stage.member`, dangling `transition.to`, missing `entryStage`, duplicate stage ids, unknown `{{placeholder}}`, no path to `'done'` — one failing fixture or inline case each, each producing a distinct named error.
- Unknown extra fields at every level (template, member, stage, transition) decode successfully and are dropped (tolerant-reader invariant).
- Template with `members` but no `pipeline` is valid (plain Phase-27 group template).
- Missing template dirs (fresh workspace, project without `.srgnt/`) → empty result, no error.
- `systemPromptPath` absolute or escaping the template directory → validation error (path-escape guard, same stance as ARCH-0009 fs path-guards).

## Regression Expectations

- No behavior change to existing `contracts` schemas: `session.test.ts`, `shared-schemas.test.ts`, and the Phase-27 `group.ts` suites stay green untouched.
- Workspace bootstrap behavior unchanged — this step reads `groups/templates/`, it does not alter layout or seeding.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files|STEP-28-01 Define GroupTemplate and Pipeline schemas with template files]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
