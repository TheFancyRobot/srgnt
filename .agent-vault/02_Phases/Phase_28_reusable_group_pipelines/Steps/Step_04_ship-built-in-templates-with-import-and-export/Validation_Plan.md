# Validation Plan

## Commands

- `pnpm --filter @srgnt/runtime test` — built-in templates validate clean; `io.ts` export/import round-trip + malformed-import suites; loader shadowing (builtin < global < project).
- `pnpm --filter @srgnt/desktop test` — picker list/badge/preview, member→harness mapping gate, import/export UI.
- `pnpm --filter @srgnt/desktop test:e2e` — scripted multi-mock-agent pipeline E2E (the phase's automated acceptance).
- `pnpm typecheck && pnpm lint`.

## Acceptance Checks

- Both built-ins (`implement → review → QA → iterate`, `research → implement → test`) load, pass `validateGroupTemplate`, and appear in the picker with a `builtin` badge and a static stage-graph preview.
- The built-ins encode the pi-teams mapping exactly: QA/test loop-back keys on the real tokens (`ISSUE REPORT`, `QA REVIEW REQUESTED`), `maxIterations: 3` bounds every `kind: 'loop_back'` edge, and `implement → review → QA → iterate` reaches `done` through a declared `approve` gate stage.
- **The flagship is representable with no schema strain**: both built-ins load through the unmodified STEP-28-01 reader + `validateGroupTemplate`; every stage's `completionConditions` ends in a total condition (`stop_reason`/`user_gate`); every `transition.to` resolves to a stage id or `'done'` (no transition points at a bare completion condition).
- **A passing QA turn never re-prompts**: drive the flagship with a scripted QA turn that ends `end_turn` carrying neither `ISSUE REPORT` nor `QA REVIEW REQUESTED` — the trailing `stop_reason` condition completes the stage on the first turn and the run advances to the gate. A regression here (token-only completion) fails every successful run, so assert the turn count, not just the outcome.
- **Import/export round-trips**: `import(export(t))` equals `t`; export produces canonical, diffable JSON.
- Malformed import (bad schema, dangling reference, unknown placeholder) is rejected with the actionable `{ field/reference, message }` errors from STEP-28-01 — no partial write.
- A user can override a built-in by saving a global template with the same `id` (shadowing precedence honored).
- Instantiation blocks start until every member is mapped to a configured harness; a tier-2-only Pi mapping is accepted and runnable.
- **E2E (phase acceptance criterion)**: scripted mock-agent pipeline — 3 stages including one loop-back and one user gate — runs green: loop-back fires on the failure token, the gate pauses for and resumes on the scripted approval, the run reaches a terminal state.
- **Dogfood (phase acceptance criterion)**: a real run of `implement → review → QA → iterate` on an actual srgnt task, with ≥1 tier-2-only Pi member, reaches a terminal state and is written up as a session note linked to this step (loop-back on QA failure and honest `maxIterations`/success termination both demonstrated or explained).

## Edge Cases

- YAML file on import → clear "unsupported format, convert to JSON" message, no half-parse.
- `id` collision on import into the global dir → refused with "id already exists" (no destructive overwrite); user renames/deletes first.
- Built-in edited in the UI → read-only; "duplicate to edit" writes a copy to the global dir, original untouched.
- Export to an unwritable path → surfaced error, no silent failure.
- A built-in that regressed to invalid (bad edit) → the validate-at-test gate fails the build, not the app at runtime.
- Empty/missing per-project and global dirs → built-ins still list (they ship with the package).

## Regression Expectations

- STEP-28-01 loader behavior for global/project dirs unchanged; built-ins are an additive lowest-precedence source.
- The runner (02) and GroupBoard (03) render the built-ins with no template-specific special-casing — they are ordinary `SPipeline`s.
- No new runtime dependency added (JSON only; no `yaml`).

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export|STEP-28-04 Ship built-in templates with import and export]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
