---
note_type: step
template_version: 2
contract_version: 1
title: Extract Jira from @srgnt/connectors into its own workspace package
step_id: STEP-21-01
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: completed
owner: team-lead
created: '2026-04-21'
updated: '2026-04-21'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-04-21-031128-extract-jira-from-srgnt-connectors-into-its-own-workspace-package-team-lead|SESSION-2026-04-21-031128 team-lead session for Extract Jira from @srgnt/connectors into its own workspace package]]'
  - '[[05_Sessions/2026-04-21-032058-extract-jira-from-srgnt-connectors-into-its-own-workspace-package-executor-1|SESSION-2026-04-21-032058 executor-1 session for Extract Jira from @srgnt/connectors into its own workspace package]]'
related_bugs: []
tags:
  - agent-vault
  - step
context_id: SESSION-2026-04-21-032058
active_session_id: 05_Sessions/2026-04-21-032058-extract-jira-from-srgnt-connectors-into-its-own-workspace-package-executor-1
context_status: active
context_summary: Advance [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]].
last_touched: '2026-04-21'
---

# Step 01 - Extract Jira from @srgnt/connectors into its own workspace package

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: move Jira out of `packages/connectors/src/jira/` into a dedicated workspace package, recommended as `packages/connector-jira/`, that exports a Phase 20-compatible connector package shape.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Required Reading

- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- `packages/connectors/src/jira/index.ts`
- `packages/connectors/src/jira/connector.ts`
- `packages/connectors/src/sdk/factory.ts`
- `packages/connectors/src/sdk/registry.ts`

## Companion Notes

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Owner: team-lead
- Last touched: 2026-04-21
- Next action: None.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Prefer extracting the existing fixture-backed behavior first, then layering live API work in later steps.
- Do not combine settings/auth or markdown-writing work into this extraction step.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-04-21 - [[05_Sessions/2026-04-21-031128-extract-jira-from-srgnt-connectors-into-its-own-workspace-package-team-lead|SESSION-2026-04-21-031128 team-lead session for Extract Jira from @srgnt/connectors into its own workspace package]] - Session created.
- 2026-04-21 - [[05_Sessions/2026-04-21-032058-extract-jira-from-srgnt-connectors-into-its-own-workspace-package-executor-1|SESSION-2026-04-21-032058 executor-1 session for Extract Jira from @srgnt/connectors into its own workspace package]] - Session created.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
