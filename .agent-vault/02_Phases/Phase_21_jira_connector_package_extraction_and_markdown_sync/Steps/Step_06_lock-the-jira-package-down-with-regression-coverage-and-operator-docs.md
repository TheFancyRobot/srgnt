---
note_type: step
template_version: 2
contract_version: 1
title: Lock the Jira package down with regression coverage and operator docs
step_id: STEP-21-06
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-05
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 06 - Lock the Jira package down with regression coverage and operator docs

## Purpose

- Outcome: prove the extracted Jira package is safe, documented, and regression-resistant across package, settings, sync, and markdown behavior.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- Jira touches packaging, secrets, network sync, workspace writes, and UI state; without tight coverage this phase will drift or regress quickly.
- Operators need explicit setup and troubleshooting guidance for the first live external connector package.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]].

## Relevant Code Paths

- all touched Jira package tests
- desktop settings/connectors tests
- CLI/package-host tests
- package README or operator documentation paths

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- all prior Step 21 notes
- `README.md`, `TESTING.md`, and any connector/operator docs touched by the implementation

## Execution Prompt

1. Add regression tests covering package extraction, settings persistence, token non-persistence, live-sync mapping, markdown output, and stale/archive behavior.
2. Run the narrowest useful tests first, then the broader suite needed to make the phase credible.
3. Update operator docs with setup steps, required Jira inputs, sync behavior, file locations, and archive/stale semantics.
4. Record any deliberately deferred work (for example Atlassian OAuth or dashboards) explicitly instead of letting it hide inside TODOs.
5. Do not mark the phase ready unless the docs and tests reflect the final connector shape.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-06 after STEP-21-05.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Minimum validation map:
  - extracted Jira package tests/typecheck;
  - desktop settings tests for Jira config + secret non-persistence;
  - package-host / integration tests for install-load-connect state;
  - markdown persistence tests including stale/archive cases.
- Likely broader validation before shipping:
  - `pnpm test`
  - relevant desktop e2e/package-host checks if the Jira package path is exercised there.
- Documentation should answer:
  - where Jira markdown lands;
  - what fields are configurable;
  - what “archived/stale” means;
  - how to reconnect or rotate the API token.

## Human Notes

- Be explicit about what is still future work so dashboard planning later starts from an honest baseline.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the Jira package is covered, documented, and safe to hand to execution without rediscovering setup or lifecycle assumptions.
