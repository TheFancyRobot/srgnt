# Execution Brief

## Why

- Templates + runner are inert without ready-made pipelines a user can pick and run. This step ships the two flagship templates and the file-based import/export that make templates portable — the payoff of the whole phase, and the substrate for the phase's dogfood acceptance run.
- The built-ins are not invented: they generalize **this repo's own pi-team loops**, harness-agnostically. `docs/pi-teams.md` and `.pi/teams.yaml` are the origin of the `implement → review → QA → iterate` pattern; encoding them as srgnt templates is the concrete proof that the schema (01) + runner (02) actually productize the workflow srgnt was built with. Cite that mapping (below) verbatim in the template files' descriptions.

## Prerequisites

- STEP-28-02 merged (runner executes pipelines; gate/abort IPC). STEP-28-01 merged (schema + loader; the built-ins must validate clean through `validateGroupTemplate`). STEP-28-03 recommended-merged so the dogfood run is observable on the GroupBoard (not strictly blocking — 03 and 04 parallelize after 02 per the phase note).
- Read fully: `docs/pi-teams.md` (the QA → bugfix → QA loop, the `QA REVIEW REQUESTED` handoff token, the "keep one orchestrator, loop until pass" convention) and `.pi/teams.yaml` + `.pi/agents/*.md` (the concrete roles and their structured output tokens — the mapping source below); the STEP-28-01 Execution Brief (template file format, `systemPrompt` inline vs `systemPromptPath`, placeholder set, per-project vs global dirs).

## The concrete pi-teams → template mapping (cite this in the template descriptions)

**Built-in 1 — `implement → review → QA → iterate`** (origin: `docs/pi-teams.md` `review-team`/`bugfix`/`qa` flow):

| Pipeline stage | `.pi` role → `STemplateMemberSpec` | completion condition | transitions |
| --- | --- | --- | --- |
| `implement` | `executor-1` → member `implementer` | `stop_reason` (`end_turn`) | → `review` |
| `review` | `reviewer` (codex) → member `reviewer` | `token` = `REVIEW COMPLETE` (reviewer.md's literal output header) | `ifOutputContains: 'Ready for testing: no'` → `implement`; else → `qa` |
| `qa` | `tester` → member `qa` | `token` = `QA REVIEW REQUESTED` for a failure handoff (docs/pi-teams.md convention), else `stop_reason` on pass | `ifOutputContains: 'ISSUE REPORT'` (tester.md failure header) → `implement` with `maxIterations` (default 3); else → `user_gate` "Approve completed work?" → `done` |

The `user_gate` before `done` is the human judgment call docs/pi-teams.md leaves to the operator ("keep one orchestrator active"); the loop-back + `maxIterations` is the "loop until 100% pass" convention made terminating.

**Built-in 2 — `research → implement → test`** (origin: `.pi/teams.yaml` `srgnt-team`, "Loop: researcher → executor → reviewer → tester until 100% pass"):

| Pipeline stage | `.pi` role → member | completion condition | transitions |
| --- | --- | --- | --- |
| `research` | `researcher` → member `researcher` | `token` = `RESEARCH BRIEF` (researcher.md output header) | → `implement` |
| `implement` | `executor-1` → member `implementer` | `stop_reason` | → `test` |
| `test` | `tester` → member `tester` | `token` = `ISSUE REPORT` (fail) or `stop_reason` (pass) | `ifOutputContains: 'ISSUE REPORT'` → `implement` with `maxIterations` (default 3); else → `done` |

Members carry a short inline `systemPrompt` distilled from the corresponding `.pi/agents/*.md` body (role responsibilities + the structured output token the condition keys on). `harnessId` is left as a **placeholder the picker fills at instantiation** (built-ins ship harness-agnostic — a user maps `implementer`→opencode, `reviewer`→Pi, etc.; a tier-2-only Pi member is a valid mapping and must run).

## Likely Code Paths

- Built-in template *data* home (recorded decision, resolving the STEP-28-01 open question): ship as `*.json` files under `packages/runtime/src/templates/builtins/`, bundled with the package, surfaced by the loader as a third source (`builtin` < `global` < `project` in shadowing precedence, so a user can override a built-in by `id`). Built-ins are **read-only** in the UI; "duplicate to edit" writes a copy into the global dir. (Alternative — generate them from code — is rejected: files keep them import/export-symmetric and diffable.)
- `packages/runtime/src/templates/io.ts` — `exportTemplate(template) => string` (canonical JSON, stable key order) and `importTemplate(text, { intoDir }) => { template } | { errors }` (decode via STEP-28-01's reader + `validateGroupTemplate`, then write to the target dir with a filename derived from `id`). Import of a malformed/semantically-invalid file returns the same actionable `{ file/field, message }` errors the loader uses — never a partial write.
- Renderer — template picker in the group-creation flow (STEP-27-01's creation UI): lists loaded templates (built-in + global + project, shadowing applied, `builtin` badge), preview shows the stage graph (reuse the STEP-28-03 projection/board in a static "declared" mode) + the member→harness mapping form the user completes before start. Import/export buttons live here (and/or Settings): Export writes the selected template to a user-chosen path; Import reads a file, validates, and lands it in the global dir (or reports errors inline).
- The dogfood run (acceptance): instantiate `implement → review → QA → iterate` on a **real srgnt task**, map members to real harnesses (at least one tier-2-only Pi member to prove the tier path), run it to a terminal state (success or honest `maxIterations` failure), and write it up as a **session note** via `vault:create-session` linked to this step — the phase's required real-world validation.

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- **Canonical format is JSON**; YAML import is deferred (recorded in the phase note — no `yaml` dependency exists in the workspace, and adding one for import-only is out of scope for v1). If a user pastes YAML, the importer reports "unsupported format, convert to JSON" — it does not silently half-parse.
- Built-ins validate clean through `validateGroupTemplate` as a **test-time gate** (a shipped built-in that fails validation is a build failure, not a runtime surprise).
- Import never overwrites silently: an `id` collision with an existing global template prompts/΄suffixes (recorded default: refuse with a clear "id already exists" error; the user renames or deletes first) — no destructive import.
- Export is round-trip-exact: `import(export(t))` yields a template equal to `t` (canonical serialization, no lossy fields).
- Built-in member `harnessId` is unset/placeholder in the shipped file; instantiation requires the user to resolve every member to a configured harness before the run can start (the picker blocks start on an unmapped member).

## Execution Checklist

1. Author the two built-in `*.json` templates under `packages/runtime/src/templates/builtins/` with the mapping above encoded (stages, conditions, tokens, `maxIterations`, inline `systemPrompt`s, placeholder `harnessId`); a test asserts both pass `validateGroupTemplate`.
2. Extend the loader to surface built-ins as a third, lowest-precedence source; shadowing test (global copy overrides a built-in by `id`).
3. Implement `io.ts` export/import with canonical JSON + validation-on-import; round-trip and malformed-import tests.
4. Build the picker (list + `builtin` badge + static stage-graph preview + member→harness mapping form) and import/export UI; component tests incl. blocked-start on unmapped member.
5. Dogfood run of `implement → review → QA → iterate` on a real srgnt task (≥1 tier-2-only Pi member), to a terminal state; write the session note and link it to this step.
6. Run the Validation Plan; record deviations in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_04_ship-built-in-templates-with-import-and-export|STEP-28-04 Ship built-in templates with import and export]]
- Phase: [[02_Phases/Phase_28_reusable_group_pipelines/Phase|Phase 28 reusable group pipelines]]
- Origin of the built-ins: `docs/pi-teams.md`, `.pi/teams.yaml`, `.pi/agents/*.md` (roles → members, loop tokens → completion conditions)
- Substrate: [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_01_define-grouptemplate-and-pipeline-schemas-with-template-files|STEP-28-01]] (schema + loader + validator), [[02_Phases/Phase_28_reusable_group_pipelines/Steps/Step_02_implement-deterministic-pipeline-runner-with-gates-and-loop-backs|STEP-28-02]] (runner)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (templates dir, local-first per DEC-0017)
