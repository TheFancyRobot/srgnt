# Execution Brief

## Step Overview

Expose connector health, freshness, and auth state inside the desktop product.

## Why This Step Exists

- The framework makes freshness and status a deliverable of the first integrations milestone.
- Without visible connector state, workflow failures will look arbitrary and hard to debug.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping|STEP-04-02 Implement Jira Connector Fixtures And Canonical Mapping]].
- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_03_implement-outlook-calendar-connector-fixtures-and-freshness-hooks|STEP-04-03 Implement Outlook Calendar Connector Fixtures And Freshness Hooks]].
- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_04_resolve-teams-or-slack-wedge-and-implement-third-connector|STEP-04-04 Implement Teams Wedge Connector]].

## Relevant Code Paths

- `packages/desktop/renderer/`
- `packages/desktop/preload/`
- connector status models in `packages/runtime/`
- connector packages from Steps 02-04

## Execution Prompt

1. Add the UI surfaces that show installed connectors, auth state, freshness, and last-sync health.
2. Keep the UI dependent on normalized connector status models rather than connector-specific view logic.
3. Include one manual smoke path for stale, healthy, and disconnected states.
4. Validate with UI smoke checks plus targeted state-model tests if available.
5. Update notes with the exact surfaces added and any health state not yet represented.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|STEP-04-05 Add Connector Status And Freshness UI]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
