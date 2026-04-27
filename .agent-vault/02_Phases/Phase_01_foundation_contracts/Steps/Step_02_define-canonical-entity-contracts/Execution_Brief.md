# Execution Brief

## Step Overview

Define the shared canonical entity envelope and the v1 entity contracts that connectors, skills, and executors will share.

## Why This Step Exists

- `srgnt_framework.md` identifies provider-schema coupling as one of the biggest architectural risks; this step creates the abstraction layer that later manifests and runtimes depend on.
- Without this step, the sample skill and connector contracts will drift into Jira-, Outlook-, or Teams-specific shapes.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-002 and the data-model sections.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`
- Expected contract targets after Step 01: entity schema files, shared type definitions, and sample canonical fixtures.

## Execution Prompt

1. Use the layout frozen in Step 01 and define the single canonical home for entity contracts, examples, and any shared type or schema helpers.
2. Define the common entity envelope and the initial v1 entity set called out in the framework document.
3. Separate canonical fields from provider-specific metadata and make missing-data rules explicit so connectors are not forced into fake completeness.
4. Keep the contracts reusable by skills, connectors, executors, and future sync work; do not bake renderer, provider, or cloud-service assumptions into them.
5. Add at least minimal worked examples or fixtures for the entities the daily-briefing wedge needs first.
6. Validate by checking that Step 03 and Step 04 can reference these contracts without introducing provider-specific fields or ambiguous entity ownership.
7. Update Implementation Notes and Outcome Summary with the final entity list, open questions, and the exact files that now own the contracts.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
