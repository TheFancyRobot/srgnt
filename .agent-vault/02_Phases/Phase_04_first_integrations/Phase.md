---
note_type: phase
template_version: 2
contract_version: 1
title: First Integrations
phase_id: PHASE-04
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-26'
depends_on:
  - PHASE-03
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]'
  - '[[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 04 First Integrations

Deliver the first real connector slice that feeds the command-center wedge: Jira, Outlook Calendar, and one collaboration connector backed by fixtures, auth/session scaffolds, and freshness surfaces.

## Objective

- Prove that the connector model can authenticate safely, sync into canonical entities, retain source metadata, and surface freshness/status inside the desktop product.

## Why This Phase Exists

- The framework names first integrations as the first externally connected milestone and the daily command-center wedge depends on these feeds.
- Connector trust boundaries, auth/session handling, and freshness are major integrity risks that must be validated before workflow composition.

## Scope

- Build the connector SDK and auth/session scaffolds behind the privileged local boundary.
- Implement Jira and Outlook Calendar connectors with fixtures, canonical mapping, and raw-metadata retention.
- Implement the third collaboration connector for the wedge: Teams (per [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]]).
- Add connector status and freshness UI surfaces so workflows can reason about stale data.

## Non-Goals

- Shipping broad write-back automation, email sending, or sync services.
- Expanding beyond the minimum connector set required for the flagship workflow.

## Dependencies

- [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]] must provide entity storage, policy rules, manifests, and run/artifact models.
- [[02_Phases/Phase_02_desktop_foundation/Phase|PHASE-02 Desktop Foundation]] must provide the privileged boundary for auth, secrets, and background work.
- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` defines the original three-connector wedge, while [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]] freezes the v1 collaboration connector to Teams.

## Acceptance Criteria

- [x] Connector SDK and auth/session scaffolds exist behind the privileged boundary.
- [x] Jira, Outlook Calendar, and one collaboration connector sync fixture-backed data into canonical entities while retaining source metadata.
- [x] Connector freshness/status is visible in the product.
- [x] The Teams connector is implemented as the fixed v1 collaboration connector without reopening the product choice.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: [[02_Phases/Phase_03_runtime_foundation/Phase|PHASE-03 Runtime Foundation]]
- Current phase status: partial
- Next phase: [[02_Phases/Phase_05_flagship_workflow/Phase|PHASE-05 Flagship Workflow]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Integration_Map|Integration Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]] - Start here; provides shared connector plumbing.
- [x] [[02_Phases/Phase_04_first_integrations/Steps/Step_02_implement-jira-connector-fixtures-and-canonical-mapping|STEP-04-02 Implement Jira Connector Fixtures And Canonical Mapping]] - Depends on Step 01.
- [x] [[02_Phases/Phase_04_first_integrations/Steps/Step_03_implement-outlook-calendar-connector-fixtures-and-freshness-hooks|STEP-04-03 Implement Outlook Calendar Connector Fixtures And Freshness Hooks]] - Depends on Step 01.
- [x] [[02_Phases/Phase_04_first_integrations/Steps/Step_04_resolve-teams-or-slack-wedge-and-implement-third-connector|STEP-04-04 Implement Teams Wedge Connector]] - Depends on Step 01; wedge already resolved to Teams per DEC-0003.
- [x] [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|STEP-04-05 Add Connector Status And Freshness UI]] - Depends on Steps 02-04.
<!-- AGENT-END:phase-steps -->

## Notes

- The repo now has real Jira, Outlook Calendar, and Teams fixture-backed connectors, plus connector SDK/auth scaffolds and renderer-visible status surfaces.
- This phase stays partial because the connectors are still local fixtures and simulated state changes rather than live authenticated sync against provider APIs.
- DEC-0010 is now linked here because the Microsoft secret boundary is the main architectural rule still governing the unfinished Outlook and Teams auth path.
