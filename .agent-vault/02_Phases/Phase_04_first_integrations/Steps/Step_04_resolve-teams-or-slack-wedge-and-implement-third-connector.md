---
note_type: step
template_version: 2
contract_version: 1
title: Implement Teams Wedge Connector
step_id: STEP-04-04
phase: '[[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-01
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-teams-wedge-connector-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 04 - Implement Teams Wedge Connector

Implement the already-selected third wedge connector and the collaboration stream it provides.

## Purpose

- Add the message or thread-oriented source the daily command center needs.

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

## Required Reading

- [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
- [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
- [[02_Phases/Phase_04_first_integrations/Steps/Step_03_implement-outlook-calendar-connector-fixtures-and-freshness-hooks|STEP-04-03 Implement Outlook Calendar Connector Fixtures And Freshness Hooks]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Use [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003]] as the fixed wedge choice and implement the Microsoft Teams connector using the shared SDK and canonical message/thread models.
2. Reuse the shared Microsoft auth adapter from STEP-04-03 rather than duplicating Azure AD token handling.
3. Preserve raw source metadata and fixture-based validation just like the other first connectors.
4. Update roadmap or phase notes only if implementation details reveal a mismatch with the settled Teams-first wedge language.
5. Validate with connector tests and by checking that Phase 05 can consume the output without vendor names in workflow logic.
6. Record implementation notes, shared-auth assumptions, and any Slack follow-up work without reopening the v1 decision.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step is intentionally where the unresolved Teams-vs-Slack ambiguity becomes explicit.
### Refinement (readiness checklist pass)

**Exact outcome:**
- **Decision resolved:** DEC-0003 already decided Teams first, Slack second. The "resolve" framing in this step's title is now a formality — the decision is made. This step implements the Microsoft Teams connector.
- `packages/connectors/teams/` — Teams connector package: manifest, Azure AD OAuth2 auth adapter (reused from shared Microsoft auth, see STEP-04-03), Microsoft Graph Teams/Chat API sync, canonical message/thread mapper
- `packages/connectors/teams/src/mapping.ts` — canonical mapping: Teams channel messages / chat messages → canonical message entity (sender, timestamp, channel/thread, content summary, mentions, raw metadata blob)
- `packages/connectors/teams/fixtures/` — replayable Microsoft Graph Teams API response fixtures (channel messages, chat messages, mentions, reactions)
- Tests proving: fixture-based sync, canonical message mapping, freshness propagation
- A decision note (or update to DEC-0003) confirming Teams is implemented and recording any Slack considerations for later

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): All contracts Zod-validated
- DEC-0003 (Teams first, Slack second): This step IS the execution of DEC-0003. Do not re-litigate. Implement Teams. Record any Slack-specific concerns for future phases.
- DEC-0004 (macOS + Windows + Linux): Azure AD OAuth2 flow must work cross-platform (same constraint as Outlook)
- DEC-0005 (pnpm monorepo): Own workspace package
- DEC-0007 (Dataview/markdown local data): Messages persisted as local files

**Starting files (must exist before this step runs):**
- Connector SDK from STEP-04-01
- Canonical entity Zod schemas from PHASE-01 (message/thread schema)
- Shared Microsoft Azure AD auth adapter (should exist from STEP-04-03 or be co-created if STEP-04-03 and STEP-04-04 run in parallel — coordinate on the shared auth module)
- Runtime sync primitives from PHASE-03

**Constraints:**
- Do NOT re-open the Teams vs. Slack decision — DEC-0003 is settled
- Do NOT duplicate Azure AD auth code — reuse the shared Microsoft auth adapter from STEP-04-03. If running in parallel with STEP-04-03, coordinate: one step creates the shared adapter, the other consumes it
- Do NOT add Teams-specific logic to SDK, runtime, or UI layers
- Do NOT attempt to mirror the full Teams data model — map only messages/threads the daily command center needs (mentions, recent activity, blockers)
- Content summary should be plain text / markdown, not HTML — strip Teams-specific markup

**Validation:**
A junior dev verifies completeness by:
1. Running `pnpm test --filter @srgnt/connector-teams` — all fixture tests pass
2. Confirming canonical message entities Zod-parse successfully
3. Verifying the Teams connector uses the same Azure AD auth adapter as the Outlook connector (import path check)
4. Checking that no Teams-specific types leak into `packages/runtime/` or `packages/contracts/` beyond the canonical message schema
5. Confirming DEC-0003 decision note exists and references this step

**Junior-readiness verdict:** PASS — With DEC-0003 resolved, the "resolve" ambiguity is eliminated. This is a straightforward connector implementation parallel to STEP-04-02 and STEP-04-03. The main coordination risk is the shared Azure AD auth module — if running in parallel with STEP-04-03, assign one owner to the shared auth adapter and have the other depend on it.

## Human Notes

- If the decision cannot be made yet, document the blocker rather than pretending both are in scope.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-teams-wedge-connector-opencode|SESSION-2026-03-22-170211 opencode session for Implement Teams Wedge Connector]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the third wedge connector is explicit and produces normalized collaboration data.
- Validation target: Phase 05 can name the collaboration input without scope ambiguity.
