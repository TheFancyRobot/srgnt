---
note_type: step
template_version: 2
contract_version: 1
title: Add Connector Status And Freshness UI
step_id: STEP-04-05
phase: '[[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-04-02
  - STEP-04-03
  - STEP-04-04
related_sessions: '[[05_Sessions/2026-03-22-170211-add-connector-status-and-freshness-ui-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 05 - Add Connector Status And Freshness UI

Expose connector health, freshness, and auth state inside the desktop product.

## Purpose

- Make connector trust visible to users and to later workflow validation.
- Give Today and Calendar surfaces the context they need when upstream data is stale or disconnected.

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

## Required Reading

- [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Add the UI surfaces that show installed connectors, auth state, freshness, and last-sync health.
2. Keep the UI dependent on normalized connector status models rather than connector-specific view logic.
3. Include one manual smoke path for stale, healthy, and disconnected states.
4. Validate with UI smoke checks plus targeted state-model tests if available.
5. Update notes with the exact surfaces added and any health state not yet represented.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Freshness state is part of user trust, not just internal diagnostics.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Connector management UI surface in `packages/desktop/renderer/` — a settings/status panel showing all installed connectors with: name, auth state (connected / disconnected / expired), freshness status (fresh / stale / unknown), last sync timestamp, and error summary
- Normalized connector status model in `packages/runtime/` or `packages/connectors/sdk/` — a single `ConnectorStatus` Zod schema that all connectors emit, consumed by the UI without connector-specific view logic
- IPC channels in `packages/desktop/preload/` for querying connector status (read-only from renderer)
- Manual smoke test documentation covering three states: healthy (all connectors fresh), stale (one connector behind), and disconnected (auth expired or network failure)
- UI tests or component tests for the status panel if the testing infrastructure from PHASE-02 supports it

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): `ConnectorStatus` schema must be Zod-defined; UI consumes typed status, not raw objects
- DEC-0004 (macOS + Windows + Linux): UI must render correctly on all three platforms
- DEC-0005 (pnpm monorepo): UI components in the desktop app package, status model in SDK or runtime
- DEC-0007 (Dataview/markdown local data): Status is derived from sync state in local files, not a separate status database

**Starting files (must exist before this step runs):**
- All three connectors complete: STEP-04-02 (Jira), STEP-04-03 (Outlook), STEP-04-04 (Teams)
- Connector SDK with auth/session lifecycle from STEP-04-01
- Desktop shell and renderer from PHASE-02
- Freshness model established in STEP-04-03

**Constraints:**
- Do NOT add connector-specific rendering logic — the UI must consume the normalized `ConnectorStatus` model only
- Do NOT expose connector secrets or tokens in the status UI
- Do NOT implement connector configuration/setup flows in this step (that is a separate concern) — this is read-only status display
- Prefer explicit stale/disconnected states over silent fallback (per Human Notes)

**Validation:**
A junior dev verifies completeness by:
1. Opening the desktop app and navigating to the connector status panel
2. Seeing all three connectors (Jira, Outlook Calendar, Teams) listed with auth state and freshness
3. Simulating a stale connector (e.g., expired fixture timestamp) and confirming the UI shows "stale" not "healthy"
4. Simulating a disconnected connector (e.g., revoked auth fixture) and confirming the UI shows "disconnected" with error context
5. Confirming the renderer code has zero direct imports from connector packages — only from the status model

**Junior-readiness verdict:** PASS — This is a well-bounded UI step with clear inputs (three working connectors, a status model) and clear outputs (a status panel with three testable states). The main risk is connector-specific view logic creeping in, which the constraints guard against.

## Human Notes

- Prefer explicit stale/disconnected states over silent fallback behavior.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-add-connector-status-and-freshness-ui-opencode|SESSION-2026-03-22-170211 opencode session for Add Connector Status And Freshness UI]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means users and later workflows can see whether connector data is trustworthy.
- Validation target: healthy, stale, and disconnected states are all visible in the UI.
