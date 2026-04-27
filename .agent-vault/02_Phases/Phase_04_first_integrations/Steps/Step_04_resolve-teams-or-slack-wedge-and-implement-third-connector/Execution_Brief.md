# Execution Brief

## Step Overview

Implement the already-selected third wedge connector and the collaboration stream it provides.

## Why This Step Exists

- The framework leaves this choice open, but [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]] already settles it in favor of Microsoft Teams.
- The remaining work is implementation and shared-auth coordination, not product-scope debate.

## Prerequisites

- Complete [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]].

## Relevant Code Paths

- `packages/connectors/teams/` or `packages/connectors/slack/`
- `packages/contracts/`
- `packages/runtime/`
- roadmap and phase notes if the choice changes wedge language

## Execution Prompt

1. Use [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]] as the fixed wedge choice and implement the Microsoft Teams connector using the shared SDK and canonical message/thread models.
2. Reuse the shared Microsoft auth adapter from STEP-04-03 rather than duplicating Azure AD token handling.
3. Preserve raw source metadata and fixture-based validation just like the other first connectors.
4. Update roadmap or phase notes only if implementation details reveal a mismatch with the settled Teams-first wedge language.
5. Validate with connector tests and by checking that Phase 05 can consume the output without vendor names in workflow logic.
6. Record implementation notes, shared-auth assumptions, and any Slack follow-up work without reopening the v1 decision.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_04_resolve-teams-or-slack-wedge-and-implement-third-connector|STEP-04-04 Implement Teams Wedge Connector]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
