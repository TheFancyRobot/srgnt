---
note_type: step
template_version: 2
contract_version: 1
title: Implement live Jira API sync with configurable issue extraction
step_id: STEP-21-03
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-21'
updated: '2026-04-21'
depends_on:
  - STEP-21-01
  - STEP-21-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Implement live Jira API sync with configurable issue extraction

## Purpose

- Outcome: replace the fixture-only Jira runtime with a real Jira API client that fetches issue-first rich metadata using the new settings/secret contract.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Why This Step Exists

- This is the first step that turns the Jira package into a real connector rather than a packaging exercise.
- It proves the Phase 20 package runtime can drive a live provider integration.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01]].
- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02]].

## Relevant Code Paths

- `packages/connector-jira/` API client, mapping, and package entrypoint
- Jira tests/fixtures/mocks in the new package
- host capability surfaces used to obtain settings, fetch, logging, and credentials

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- the extracted Jira package files from STEP-21-01
- the Jira settings contract from STEP-21-02

## Execution Prompt

1. Implement a Jira REST client inside the package using API-token auth and bounded pagination.
2. Default to issue-first rich extraction: issue fields, comments, labels, links, subtasks, sprint identifiers/names, worklog summaries, attachment metadata, and changelog summaries when available.
3. Honor the user-configurable scope and extraction toggles from Step 02.
4. Preserve raw provider metadata where the canonical task model is intentionally lossy.
5. Fail closed on missing/invalid credentials, malformed Jira responses, or unsupported settings combinations.
6. Keep attachment binaries and dashboard-specific transforms out of this step.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-03 after STEP-21-01 and STEP-21-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The sync result should expose enough structured data for Step 04 to write markdown without re-fetching Jira.
- Strongly prefer mocked HTTP fixtures for tests over live Jira dependence.
- Integrity risks:
  - rate-limit blowups from unbounded pagination;
  - scope toggles that silently do nothing;
  - overcoupling markdown formatting concerns into the API client layer.
- Validation target:
  - package unit tests for request construction, pagination, mapping, toggle behavior, and error handling;
  - typecheck for the extracted package and any touched shared contracts.

## Human Notes

- If Jira API quirks force a narrower first implementation, preserve the issue-first rich-metadata direction and document the exact gap rather than silently shrinking scope.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the package can fetch real Jira data with the agreed settings model and produce a structured sync payload ready for markdown persistence.
