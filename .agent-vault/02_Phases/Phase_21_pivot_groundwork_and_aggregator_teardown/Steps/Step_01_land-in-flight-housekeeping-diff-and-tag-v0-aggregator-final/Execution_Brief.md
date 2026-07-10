# Execution Brief

## Why

- The pivot (DEC-0017) deletes most aggregator code. Landing the five uncommitted files first gives a clean, green, *tagged* baseline so the old product is always one `git checkout v0-aggregator-final` away, and the deletion diff stays reviewable.
- The onboarding `secondaryAction` change is generic UI work the new onboarding (Phase 29) reuses — it must not be lost in the teardown.

## Prerequisites

- Working tree contains exactly the five known modified files (verify with `git status`); nothing else staged.
- CI is green on `main` at HEAD (`gh run list --branch main --limit 3`).

## Likely Code Paths

- `packages/connectors/tsconfig.json` (CommonJS module settings)
- `packages/desktop/package.json` (`build:deps` script)
- `packages/desktop/src/main/index.ts` (connector catalog URL + dialog parenting)
- `packages/desktop/src/renderer/components/Onboarding.tsx` (`secondaryAction` support)
- `packages/desktop/src/renderer/main.tsx` (workspace choose-or-default onboarding step)

## Execution Checklist

1. `git diff` — re-read the five files; confirm no secrets/debug leftovers.
2. Run the full suites (see Validation Plan). If Onboarding tests fail on the new `secondaryAction` rendering, update `Onboarding.test.tsx` expectations in the same commit — behavior change is intended.
3. Commit all five files as one commit on `main` (message: final aggregator-era housekeeping; note that the pivot begins after this commit).
4. `git tag -a v0-aggregator-final -m "srgnt data-aggregator product final state (pre ACP pivot, DEC-0017)"` on that commit.
5. Push branch + tag only through the repo's normal flow (ask the maintainer if direct-push to `main` vs PR is preferred that day).

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_01_land-in-flight-housekeeping-diff-and-tag-v0-aggregator-final|STEP-21-01 Land in-flight housekeeping diff and tag v0-aggregator-final]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
