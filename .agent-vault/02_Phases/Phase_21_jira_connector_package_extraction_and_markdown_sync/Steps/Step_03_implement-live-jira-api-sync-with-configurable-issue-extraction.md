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

- Outcome: replace the fixture-only Jira runtime with a real Jira API client that fetches issue-first rich metadata using the new settings and credential contract.
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
- host capability surfaces used to obtain settings, fetch, logging, workspace root, and credentials
- any shared contracts added in Step 02 to describe Jira config or sync payloads

## Concrete Starting Points

- Replace fixture-only sync logic that was extracted from:
  - `packages/connectors/src/jira/connector.ts`
  - `packages/connectors/src/jira/index.ts`
- Add package-internal modules such as:
  - `src/api/client.ts`
  - `src/api/search.ts`
  - `src/mappers/*.ts`
  - `src/sync.ts`
- Add mocked Jira API fixtures in package tests rather than requiring live credentials.

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- the extracted Jira package files from STEP-21-01
- the Jira settings and credential contract from STEP-21-02

## Execution Prompt

1. Implement a Jira REST client inside the package using API-token auth and bounded pagination.
2. Default to issue-first rich extraction: issue fields, comments, labels, links, subtasks, sprint identifiers/names, worklog summaries, attachment metadata, and changelog summaries when available.
3. Honor the user-configurable scope and extraction toggles from Step 02.
4. Preserve raw provider metadata where the canonical task model is intentionally lossy.
5. Request credentials through the privileged host boundary defined in Step 02; do not assume token material is in plain config.
6. Fail closed on missing or invalid credentials, malformed Jira responses, unsupported settings combinations, or pagination explosions.
7. Keep attachment binaries and dashboard-specific transforms out of this step.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-21
- Next action: Start STEP-21-03 after STEP-21-01 and STEP-21-02.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

### Sync shape expectations

- The sync result should expose enough structured data for Step 04 to write markdown without re-fetching Jira.
- Keep a clear boundary between:
  - Jira HTTP fetch and pagination
  - Jira-to-srgnt mapping
  - markdown rendering and file writes
- Preserve both canonical task data and Jira-specific provider metadata needed for later markdown rendering.

### Suggested extraction groups

- Always-on core issue metadata:
  - issue id/key/url
  - summary/description/status/priority/type
  - assignee/reporter
  - created/updated timestamps
- Toggleable rich groups:
  - comments
  - issue links and subtasks
  - sprint data
  - worklog summaries
  - attachment metadata only
  - changelog summaries

### Validation commands

- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/connector-jira test`
- If shared contracts changed: `pnpm --filter @srgnt/contracts typecheck && pnpm --filter @srgnt/contracts test`
- If desktop host capability types changed: `pnpm --filter @srgnt/desktop typecheck`

### Manual checks

- With mocked fixtures, verify pagination requests stop at the configured bound.
- Verify toggles materially change the resulting sync payload.
- Verify missing credentials fail before network work proceeds.

### Edge cases and failure modes

- Unbounded pagination or broad JQL causing rate-limit blowups.
- Scope toggles that exist in config but are ignored by the client.
- Jira API field absence varying by project or permissions.
- Changelog/comments/worklogs not included because API expand parameters were omitted.
- Package code reaching for credential material directly instead of through the privileged host contract.

### Security considerations

- Token must never be logged, serialized into sync payloads, or persisted into markdown.
- Error messages should remain safe for crash and CLI redaction paths.
- Host capability boundaries must remain the only credential path.

### Performance considerations

- Keep pagination bounded and explicit.
- Avoid fetching heavy optional groups unless enabled.
- Do not fetch attachment bodies.

### Acceptance criteria mapping

- Phase criterion “Jira package fetches issue-first rich metadata from the live Jira API” is primarily satisfied here.
- This step should produce the source payload consumed by markdown persistence in Step 04.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and manual checks: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: none blocking.
- Junior readiness verdict: **pass**.

## Human Notes

- If Jira API quirks force a narrower first implementation, preserve the issue-first rich-metadata direction and document the exact gap rather than silently shrinking scope.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the package can fetch real Jira data with the agreed settings model and produce a structured sync payload ready for markdown persistence.
