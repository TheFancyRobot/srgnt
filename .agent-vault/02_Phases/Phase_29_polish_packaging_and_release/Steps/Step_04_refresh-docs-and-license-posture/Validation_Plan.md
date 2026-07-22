# Validation Plan

## Primary Acceptance Checks

1. Docs (README, TESTING, AGENTS, site copy) describe the shipped product and every
   documented flow works when followed against the built app. Maps to phase criterion
   "Docs describe the shipped product; LICENSE posture reviewed and recorded as a
   decision."
2. A license decision note exists under `04_Decisions/` and is linked from PHASE-29
   Related Decisions.

## Verification Method

- This is primarily a read-through-against-reality check, not an automated test.
  Follow each documented command/flow in a clean checkout and confirm it behaves as
  written. Treat any doc step that does not work as a failing check.
- `pnpm install && pnpm --filter @srgnt/desktop build:icons && pnpm test` — confirm the
  documented core commands in TESTING.md actually run.
- `pnpm run release:check:repo` — confirm the RC shortcut TESTING.md documents works.

## Concrete Checks

- README no longer claims `@srgnt/harness` is "planned for Phase 22 and does not exist
  yet"; the package structure lists 5 real packages
  (tsconfig/contracts/runtime/harness/desktop).
- Grep for stale aggregator references:
  `rg -i "connector|aggregator|TodayView|CalendarView|Jira|Outlook" README.md TESTING.md AGENTS.md`
  returns only intentional historical pivot references (the DEC-0017 banner), nothing
  live.
- Every command block in TESTING.md maps to a real script in `package.json` /
  `packages/desktop/package.json`.
- The rpm spec's license string equals the decision note's `canonical_license_id`
  **exactly** — `rg "^License:" packages/desktop/scripts/build-fedora-rpm.sh` yields
  `License: <canonical_license_id>` (`License: BUSL-1.1` under the default value), and
  `UNLICENSED` appears nowhere in the script. Compare against the decision note's
  field, not against LICENSE.md's prose: an SPDX identifier and a license text are
  different representations and comparing them is what produced this ambiguity.
- The decision note exists, is linked from PHASE-29, and carries exactly one
  `canonical_license_id` value (not a list, not blank) plus the inventory of every
  release-metadata surface that must carry it; each listed surface is spot-checked
  against that value.
- The DEC-0018 honest-capability language (Pi self-approves; MCP unavailable for Pi;
  no client fs/terminal mediation) appears where the docs describe harness capabilities
  — no over-claiming.

## Edge Cases / Failure Modes

- Docs describe a flow that only exists in a planned-but-unmerged phase — do not
  document unshipped features as shipped. If a feature slipped, mark it accordingly.
- License decision recorded but not linked from PHASE-29 — the link is part of the
  acceptance check.
- Coverage matrix in TESTING.md diverges from STEP-29-05's — keep one source of truth.

## Regression Expectations

- Docs-only changes should not affect tests; if TESTING.md changes command names,
  those scripts must still exist and pass. No E2E rerun required for pure copy edits
  (STEP-21-05 precedent), but the documented commands must be spot-checked.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture|STEP-29-04 Refresh docs and license posture]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
