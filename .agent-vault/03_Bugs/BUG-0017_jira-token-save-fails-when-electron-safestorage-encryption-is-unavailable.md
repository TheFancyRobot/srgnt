---
note_type: bug
template_version: 2
contract_version: 1
title: Jira token save fails when Electron safeStorage encryption is unavailable
bug_id: BUG-0017
status: fixed
severity: sev-3
category: logic
reported_on: '2026-04-24'
fixed_on: '2026-04-24'
owner: executor-1
created: '2026-04-24'
updated: '2026-04-24'
related_notes:
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|PHASE-21 Jira Connector Package Extraction and Markdown Sync]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]'
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]'
  - '[[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]'
  - '[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]'
  - '[[05_Sessions/2026-04-21-033801-define-jira-settings-schema-and-os-keychain-secret-boundary-executor-1|SESSION-2026-04-21-033801 executor-1 session for Define Jira settings schema and OS-keychain secret boundary]]'
tags:
  - agent-vault
  - bug
---

# BUG-0017 - Jira token save fails when Electron safeStorage encryption is unavailable

Use one note per bug in `03_Bugs/`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known.

## Summary

- Jira token save fails when Electron safeStorage encryption is unavailable.
- Related notes: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]].

## Observed Behavior

- User attempts to save Jira API token via Settings UI
- IPC call `connector:credential:set` fails with encryption unavailable error
- The error propagates from `safeStorage.encryptString()` indicating encryption is not available

## Expected Behavior

- If safeStorage is unavailable, the system should fall back to keytar/OS keychain, or surface a clear user-facing message

## Reproduction Steps

1. Set up environment where safeStorage encryption is unavailable
2. Attempt to save Jira API token via Settings UI
3. Observe IPC failure with encryption unavailable error

## Scope / Blast Radius

- Affects: `packages/desktop` Jira credential save flow
- Impact: User cannot save Jira API token on environments without safeStorage encryption
- Data-sensitive: API tokens involved but error prevents storage (no leak)

## Suspected Root Cause

- Electron `safeStorage` encryption may be unavailable on some Linux environments.
- Credential backend selection may not be falling back to keytar/OS keychain before surfacing the encryption failure.

## Confirmed Root Cause

- safeStorage encryption unavailable on certain Linux environments
- No fallback to keytar when safeStorage is unavailable
- Fix implemented: keytar fallback chain for safeStorage unavailability

## Workaround

- Use a machine where safeStorage encryption is available
- Use fixture/offline Jira workflows if available

## Permanent Fix Plan

- Add or restore a secure keytar/OS-keychain fallback path when `safeStorage` encryption is unavailable.
- Preserve main-process-only secret handling and avoid exposing raw encryption failures in renderer UX.

## Regression Coverage Needed

- Added credential adapter tests for mocked keytar set/get round-trip and `keychain` status
- Added runtime fallback test where keytar `setPassword` throws and safeStorage stores/decrypts the token
- Added unavailable-backend test where keytar import fails and safeStorage encryption is unavailable
- Same-instance fallback regression coverage added: after keytar throws and fallback writes to safeStorage, the original adapter reference reports `encrypted-local` and returns the stored token without consulting keytar again

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]
<!-- AGENT-END:bug-related-notes -->
<!-- AGENT-START:bug-related-notes-context -->
- Architecture: [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|ARCH-0009 Jira Connector Package and Markdown Persistence]]
- Decision: [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- Shared knowledge: [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- Downstream step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]
- Related session: [[05_Sessions/2026-04-21-033801-define-jira-settings-schema-and-os-keychain-secret-boundary-executor-1|SESSION-2026-04-21-033801 executor-1 session for Define Jira settings schema and OS-keychain secret boundary]]
<!-- AGENT-END:bug-related-notes-context -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-24 - Reported.
- 2026-04-24 - Fixed by executor-1. Root cause was missing keytar fallback when safeStorage unavailable; keytar fallback chain implemented.
<!-- AGENT-END:bug-timeline -->
