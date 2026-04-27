---
note_type: step
template_version: 2
contract_version: 1
title: Add OS-aware More Info help for unavailable encrypted Jira token storage
step_id: STEP-21-07
phase: '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]'
status: planned
owner: ''
created: '2026-04-26'
updated: '2026-04-26'
depends_on:
  - STEP-21-06
related_sessions: []
related_bugs:
  - '[[03_Bugs/BUG-0019_failed-to-save-jira-token-when-no-non-plaintext-credential-backend-is-available|BUG-0019 Failed to save Jira token when no non-plaintext credential backend is available]]'
  - '[[03_Bugs/BUG-0020_safestorage-encryption-unavailable-causes-token-save-to-fail-on-linux-without-keytar|BUG-0020 safeStorage encryption unavailable causes token save to fail on Linux without keytar]]'
tags:
  - agent-vault
  - step
---

# Step 07 - Add OS-aware More Info help for unavailable encrypted Jira token storage

Use this note as a thin index for one executable step. Keep detail in companion notes so execution can load only the smallest note needed.

## Purpose

- Outcome: add an adjacent `More Info` affordance for secure-credential-storage-unavailable states in Jira settings so users understand why token storage is blocked, which platform libraries/services are usually missing, and what recovery path is available on their OS.
- Success condition: when `tokenStatus.backend === 'unavailable'`, the Token Storage card shows a clear primary warning plus an inline `More Info` disclosure that renders platform-relevant remediation copy without changing token-storage semantics or exposing secrets.
- Parent phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]].

## Required Reading

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]
- [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[03_Bugs/BUG-0019_failed-to-save-jira-token-when-no-non-plaintext-credential-backend-is-available|BUG-0019 Failed to save Jira token when no non-plaintext credential backend is available]]
- [[03_Bugs/BUG-0020_safestorage-encryption-unavailable-causes-token-save-to-fail-on-linux-without-keytar|BUG-0020 safeStorage encryption unavailable causes token save to fail on Linux without keytar]]

## Companion Notes

- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_07_add-os-aware-more-info-help-for-unavailable-encrypted-jira-token-storage/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_07_add-os-aware-more-info-help-for-unavailable-encrypted-jira-token-storage/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_07_add-os-aware-more-info-help-for-unavailable-encrypted-jira-token-storage/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_07_add-os-aware-more-info-help-for-unavailable-encrypted-jira-token-storage/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-04-26
- Next action: Confirm the current unavailable-state flow in `JiraConnectorSettings.tsx`, implement the inline `More Info` disclosure, curate OS-aware remediation copy, and prove the unavailable-state tests still pass.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Human Notes

- Chosen UX direction for execution: use an inline disclosure/accordion in the same Token Storage card, not a modal, unless implementation discovers a hard accessibility/layout constraint.
- Treat this as a renderer-first explanatory step. Do not change credential backend semantics unless research proves the UI cannot become OS-aware without a small non-secret IPC addition.
- Keep the guidance actionable and OS-aware: tell users which packages/services are relevant to their platform instead of dumping a generic cross-platform list.
- If `window.srgnt.platform` is sufficient, avoid adding new privileged APIs. Only introduce extra non-secret environment hints when the existing platform string is demonstrably inadequate.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Related Notes

- [[07_Templates/Note_Contracts|Note Contracts]]
- [[07_Templates/Phase_Template|Phase Template]]
