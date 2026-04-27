# Execution Brief

## Step Overview

Define the connector manifest and capability contract, plus one sample connector package that proves the model is usable.

## Why This Step Exists

- Connectors need stable capability and mapping contracts so skills depend on behavior, not vendor names.
- This step prevents the skill runtime from inheriting ad hoc provider-specific APIs and makes permission boundaries inspectable.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-004 and the connector sections.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- The example connector location frozen in Step 01, expected to contain a Jira-oriented sample connector.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Execution Prompt

1. Define the connector manifest fields, capability taxonomy, and mapping responsibilities in the shared contract location chosen earlier in the phase.
2. Distinguish read capabilities from write or side-effect capabilities so later approval and trust UX can be explicit.
3. Keep connectors responsible for provider auth, sync strategy, and canonicalization; do not let skills absorb those responsibilities.
4. Create or update one sample connector manifest, preferably aligned with the daily-briefing wedge, that shows produced entities, sync modes, and auth shape without requiring live implementation.
5. Preserve a path for raw provider metadata retention and capability-based dependency resolution.
6. Validate by checking the sample connector can satisfy the planned skill capabilities without skills naming a vendor directly.
7. Update notes with the final capability naming rules, the sample connector path, and any unresolved auth or sync-policy question.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_04_define-connector-capability-contract|STEP-01-04 Define Connector Capability Contract]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
