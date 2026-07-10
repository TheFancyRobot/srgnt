# Execution Brief

## Why

- Phases 22–24 need the domain schemas (HarnessDefinition for the registry, SessionEvent for the store) and the workspace layout to exist before any feature code lands. Rewriting contracts is also the cheapest moment to leave deprecated `@effect/schema` 0.75 for `effect/Schema` (effect ≥3.10 ships Schema in core; the repo is on 3.21).

## Prerequisites

- STEP-21-02 complete (aggregator entities and their consumers gone or dying).
- Read the target domain model in [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] — schemas must match it, not improvise.

## Likely Code Paths

- `packages/runtime/src/workspace/bootstrap.ts` + tests: replace PARA dirs (`Daily/`, `Projects/`, `People/`, `Meetings/`, `.command-center/*`) with v2 (`projects/`, `groups/templates/`, `harnesses.json`, `settings.json` seeds). Keep the create/validate/missing-dirs API shape — desktop main already consumes it.
- `packages/contracts/src/`: new modules `project.ts`, `session.ts` (Session, status enum, `parentSessionId`; SessionEvent envelope `{seq, ts, protocolVersion, kind, payload}` with tolerant unknown-kind decoding), `harness.ts` (HarnessDefinition, LaunchSpec, quirks enum, capability overrides). Delete `src/entities/` aggregator schemas and DEC-0013's z-star compat wrappers if their last consumers died in STEP-21-02.
- Every `package.json` with `@effect/schema` → drop the dep; imports become `import { Schema } from 'effect'`.

## Execution Checklist

1. Rewrite bootstrap + tests first (self-contained, proves the layout).
2. Add contracts v2 modules with decode/encode tests, including a property test that unknown SessionEvent kinds round-trip through the tolerant reader.
3. Migrate remaining `@effect/schema` imports repo-wide (mostly contracts + runtime + desktop main), then remove the dependency everywhere.
4. `rg '@effect/schema' packages/` → zero hits; run all suites.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_04_bootstrap-workspace-v2-layout-and-contracts-v2-domain-skeleton|STEP-21-04 Bootstrap workspace v2 layout and contracts v2 domain skeleton]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
