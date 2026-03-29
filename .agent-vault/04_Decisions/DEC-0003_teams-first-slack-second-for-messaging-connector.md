---
note_type: decision
template_version: 2
contract_version: 1
title: Teams first, Slack second for messaging connector
decision_id: DEC-0003
status: accepted
decided_on: '2026-03-21'
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]]'
tags:
  - agent-vault
  - decision
---

# DEC-0003 - Teams first, Slack second for messaging connector

Lock the third wedge connector so Phase 04 can implement one collaboration stream instead of re-opening product scope.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Decision needed: Teams first, Slack second for messaging connector.
- Related notes: [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]].
The v1 wedge requires Jira + Outlook Calendar + a messaging platform for daily briefing, meeting prep, and team communication. PHASE-04 defines three connectors. The choice of Teams vs Slack as the messaging platform affects auth complexity, API surface, and user target market.

Primary user personas are enterprise developers and engineering managers who use Microsoft 365 tooling. The existing Outlook Calendar connector already requires Azure AD auth.

## Decision

- State the chosen direction clearly.
- Include the boundary of the choice so readers know what is and is not decided.
**Microsoft Teams** is the first messaging connector (PHASE-04 Step 04). **Slack** will follow as a fast-follow connector after v1 ship, using the same connector SDK interface.

Rationale: Teams shares Azure AD auth with Outlook Calendar, reducing the number of distinct OAuth providers users must configure. The target persona (enterprise devs on M365) is more likely to use Teams than Slack.

## Alternatives Considered

- List realistic alternatives, not strawmen.
- For each option, say why it was not selected.
- **Slack first**: Simpler OAuth, better-documented APIs, broader developer adoption. Rejected because it would require a second OAuth provider and the target persona skews M365.
- **Both simultaneously**: Too much scope for v1. The connector SDK interface (DEC-0002, Zod contracts) ensures adding Slack later is mechanical.

## Tradeoffs

- Describe the costs, risks, complexity, migration burden, and operational implications.
- Include short-term and long-term tradeoffs when they differ.
- **Pro**: Single Azure AD auth flow covers both Outlook Calendar and Teams connectors.
- **Pro**: Aligns with enterprise persona targeting.
- **Con**: Teams Graph API for chat/channels is more complex than Slack's Web API.
- **Con**: Developers in Slack-only orgs cannot use the messaging feature until Slack connector ships.

## Consequences

- Record what changes now that this decision exists.
- Note follow-up work, deprecations, or docs/tests that should change.
- PHASE-04 Step 04 scope changes from "Slack or Teams" to "Teams" specifically.
- Teams connector uses Microsoft Graph API with delegated permissions.
- Slack connector becomes a post-v1 roadmap item.
- Connector SDK (PHASE-04 Step 01) must be designed to support both without modification.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|PHASE-04 First Integrations]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-21 - Created as `proposed`.
- 2026-03-22 - Accepted during phase-readiness review; downstream connector and workflow steps now treat Teams as the v1 collaboration connector.
<!-- AGENT-END:decision-change-log -->
