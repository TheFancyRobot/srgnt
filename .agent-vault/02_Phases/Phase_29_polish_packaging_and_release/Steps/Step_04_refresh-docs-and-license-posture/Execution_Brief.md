# Execution Brief

## Why This Step Exists

The repo docs were rewritten for the ACP product in STEP-21-05, but that was BEFORE the
product actually existed — they describe intent (harness "planned for Phase 22"), not
shipped features. After phases 22-28, the docs are materially stale and would mislead a
new user or contributor. Separately, `LICENSE.md` predates the pivot and has never been
reviewed for the new product; shipping publicly under an unreviewed license is a
liability. This step makes the docs match reality and records a deliberate license
decision.

## What "Done" Looks Like

- README, TESTING.md, AGENTS.md, and the site copy (srgnt.app) describe the SHIPPED
  product: quick start, harness setup (detect/install Pi/opencode), projects/sessions,
  groups/pipelines, and the testing guide. Every documented flow actually works when
  followed against the built app.
- Specific stale claims fixed: README's "A fifth package, `@srgnt/harness`, is planned
  for Phase 22 and does not exist yet" (and the "4 packages" framing) — harness now
  exists and is real. STEP-21-05's own follow-up flagged this exact promotion.
- LICENSE.md reviewed for the new product; the outcome (keep BSL 1.1 as-is / adjust
  terms / relicense) is recorded as a NEW decision note under `04_Decisions/` and
  linked from PHASE-29 (Related Decisions).
- The license mismatch is reconciled: `LICENSE.md` is Business Source License 1.1
  (Licensor "The Fancy Robot, LLC", Change Date 2029-03-29, Change License MPL 2.0),
  but `packages/desktop/scripts/build-fedora-rpm.sh`'s rpm spec declares
  `License: UNLICENSED` (line 73). These must agree; fixing the rpm spec's license
  string is part of this step (or explicitly deferred with a reason).

## Prerequisites

- Phases 22-28 feature-complete and STEP-29-01/02/03 merged — docs describe what those
  shipped (onboarding harness detection, consolidated settings, packaging targets).
- Read DEC-0017 (pivot framing the docs must reflect) and DEC-0018 (honest-capability
  copy: Pi self-approves permissions; MCP unavailable for Pi; no client fs/terminal
  mediation) so the docs describe capabilities honestly.

## Relevant Code Paths / Docs

- `README.md` — product pitch, package structure (currently lists tsconfig/contracts/
  runtime/desktop + "planned" harness; update to 5 real packages), package boundaries.
- `TESTING.md` — core commands, RC shortcuts, coverage matrix. Already lists
  `release:check:repo`, `test:e2e:packaged:linux`, `dist:rpm:fedora`. Update the
  coverage matrix in coordination with STEP-29-05 (single source of truth for the
  matrix) and add the Windows caveats from STEP-29-03.
- `AGENTS.md` — contributor/agent guidance; align with the shipped harness model.
- `LICENSE.md` — BSL 1.1 (see above).
- `docs/` — `pi-teams.md` (design provenance), `flagship-workflow-walkthrough.md`
  (banner-marked historical in STEP-21-05 — leave historical or remove).
- Site copy at srgnt.app — copy refresh only (phase non-goal: no marketing build-out).
- `06_Shared_Knowledge/srgnt_framework_*` vault notes still describe the aggregator era
  without banners (STEP-21-05 follow-up) — out of scope unless trivially in the way.

## Smallest Execution Checklist

1. Walk the actual built app end to end; note every flow (onboarding → harness setup →
   project → session → group → pipeline → settings). Write the docs FROM that walk so
   every documented step is real.
2. Fix README's harness "planned/does not exist" claim and the package count/structure.
3. Update TESTING.md commands + coverage matrix (coordinate with STEP-29-05) and add
   the STEP-29-03 Windows caveats.
4. Review LICENSE.md for the ACP product; create a decision note recording the outcome
   and reasoning; link it from PHASE-29. Reconcile the rpm spec `License:` string.
5. Refresh site copy to match; no new site features.

## Integration Touchpoints / Downstream Effects

- STEP-29-05 owns the E2E coverage matrix content; TESTING.md should reference/mirror
  it, not diverge. Decide which is source of truth (recommend: STEP-29-05 defines it,
  TESTING.md embeds it).
- The new license decision note is a PHASE-29 Related Decision and a release-checklist
  gate item (STEP-29-05).

## Assumptions / Decision-Needed

- ASSUMPTION: docs are updated in place (no docs-site framework change) — copy refresh
  per the phase non-goals.
- DECISION-NEEDED (owner: human): the actual license posture for public release —
  keep BSL 1.1, adjust the Additional Use Grant, or relicense. This step RECORDS the
  decision; it does not have authority to choose terms unilaterally. Default action if
  no human input: document current BSL 1.1 as the reviewed posture, note the
  rpm-spec `UNLICENSED` mismatch as a bug to fix, and flag "confirm before public
  release" in the decision note.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_04_refresh-docs-and-license-posture|STEP-29-04 Refresh docs and license posture]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- Decision: [[04_Decisions/DEC-0017_pivot-srgnt-from-data-aggregator-to-acp-coding-agent-command-center|DEC-0017]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (honest-capability copy)
