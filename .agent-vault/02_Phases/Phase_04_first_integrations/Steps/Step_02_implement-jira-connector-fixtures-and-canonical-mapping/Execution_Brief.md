# Execution Brief

## Step Overview

Deliver the first task-oriented connector and its canonical entity mapping.

## Why This Step Exists

- Jira is one of the framework's named first connectors and a major source for the daily command center.
- This step should validate the canonical task mapping before more connectors land.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]].

## Relevant Code Paths

- `packages/connectors/jira/` or equivalent path chosen in Step 04-01
- `packages/contracts/`
- `packages/runtime/`
- connector fixtures and tests

## Execution Prompt

1. Implement the Jira connector using the shared SDK and the canonical task model from Phase 01.
2. Preserve raw source metadata while exposing normalized entities and freshness state.
3. Prefer fixtures and replayable test data over immediate live-service dependence.
4. Validate with connector tests that prove canonical mapping and fixture-based sync behavior.
5. Update notes with the exact mapped entity set, unsupported fields, and any provider-specific edge cases.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping|STEP-04-02 Implement Jira Connector Fixtures And Canonical Mapping]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
