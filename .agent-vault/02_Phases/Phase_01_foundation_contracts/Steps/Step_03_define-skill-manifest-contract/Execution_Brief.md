# Execution Brief

## Step Overview

Define the skill package contract, manifest schema, and one worked example for the daily-briefing command-center wedge.

## Why This Step Exists

- Skills are the main user-facing unit of value and need a stable installable format before runtime, marketplace, or UX work begins.
- A worked example keeps the manifest contract honest and stops it from staying abstract or impossible to satisfy.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-003 and the daily-briefing wedge.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- The example skill location frozen in Step 01, expected to include a daily-briefing package.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Define the skill manifest fields, package layout, and contract files in the shared location chosen earlier in the phase.
2. Keep skills dependent on canonical entities, declared capabilities, and explicit outputs rather than provider-specific schemas or one executor backend.
3. Make approval behavior explicit; no silent write or side-effect assumptions should be hidden in prompt prose.
4. Create or update a worked example `daily-briefing` skill package with manifest, prompt/template references, and schema references that the runtime can validate later.
5. Ensure the example is fixture-friendly and can be exercised without live connectors.
6. Validate by checking the example manifest matches the contract and can be satisfied by a connector and executor without custom escape hatches.
7. Update notes with the final field set, example paths, and any unresolved versioning or packaging question.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_03_define-skill-manifest-contract|STEP-01-03 Define Skill Manifest Contract]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
