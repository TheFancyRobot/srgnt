# Execution Brief

## Step Overview

Deliver the first event-oriented connector and expose freshness information that Calendar and Today can trust.

## Why This Step Exists

- Outlook Calendar is a named first connector and a primary input to daily command-center output.
- Freshness is especially important for event data because users need to trust timing and recency.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]].

## Relevant Code Paths

- `packages/connectors/outlook-calendar/` or equivalent path chosen in Step 04-01
- `packages/contracts/`
- `packages/runtime/`
- connector fixtures, sync tests, and freshness models

## Execution Prompt

1. Implement the Outlook Calendar connector using the shared SDK and canonical event model.
2. Preserve raw provider metadata and expose freshness timestamps/status the UI can reason about.
3. Add fixture-backed tests for event sync, freshness updates, and unsupported-provider-field handling.
4. Validate that the connector can feed later Calendar and Today surfaces without provider-specific logic leaking upward.
5. Update notes with freshness semantics, mapped event fields, and any open issue for recurring events or timezone handling.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_03_implement-outlook-calendar-connector-fixtures-and-freshness-hooks|STEP-04-03 Implement Outlook Calendar Connector Fixtures And Freshness Hooks]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
