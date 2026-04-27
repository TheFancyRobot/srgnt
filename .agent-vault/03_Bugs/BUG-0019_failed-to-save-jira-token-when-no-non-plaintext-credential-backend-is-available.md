---
note_type: bug
template_version: 2
contract_version: 1
title: Failed to save Jira token when no non-plaintext credential backend is available
bug_id: BUG-0019
status: fixed
severity: sev-3
category: logic
reported_on: '2026-04-26'
fixed_on: '2026-04-26'
owner: coordinator
created: '2026-04-26'
updated: '2026-04-26'
related_notes:
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 Jira connector package extraction and markdown sync]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]'
  - '[[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]'
  - '[[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|Jira Connector Package and Markdown Persistence]]'
  - '[[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]'
  - '[[03_Bugs/BUG-0017_jira-token-save-fails-when-electron-safestorage-encryption-is-unavailable|BUG-0017 Jira token save fails when Electron safeStorage encryption is unavailable]]'
  - '[[05_Sessions/2026-04-25-001028-implement-live-jira-api-sync-with-configurable-issue-extraction-coordinator|SESSION-2026-04-25-001028 coordinator session for Implement live Jira API sync with configurable issue extraction]]'
tags:
  - agent-vault
  - bug
---

# BUG-0019 - Failed to save Jira token when no non-plaintext credential backend is available

Use one note per bug in \`03_Bugs/\`. This note is the source of truth for one defect's reproduction, impact, root cause, workaround, and verification. It should let a new engineer reproduce the issue, understand its impact, and safely continue the investigation. Link the bug back to the relevant phase or step when known; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Step_Template|Step Template]] as the relationship reference points.

## Summary

- Failed to save Jira token when no non-plaintext credential backend is available.
- Related notes: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]], [[05_Sessions/2026-04-25-001028-implement-live-jira-api-sync-with-configurable-issue-extraction-coordinator|SESSION-2026-04-25-001028 coordinator session for Implement live Jira API sync with configurable issue extraction]].

## Observed Behavior

- When the Jira token backend is unavailable, the renderer previously still allowed the user to attempt a save and surfaced a generic IPC failure:
  `Failed to save Jira token: Error invoking remote method 'connector:credential:set': Error: [credentials] Failed to store token: [credentials] No non-plaintext credential backend is available: keytar failed and safeStorage encryption is unavailable.`
- The failure path was technically safe, but it was not user-friendly and made the unavailable-backend state look like a broken save action.

## Expected Behavior

- The UI should make it obvious when Jira token storage cannot work on the current machine.
- Save-token actions should be disabled or short-circuited with a clear local message before IPC is invoked.
- No token material should be written to disk or logged.

## Reproduction Steps

1. Run the desktop app on a machine where neither keytar nor Electron safeStorage encryption is available.
2. Open **Settings → Jira** and enter a non-empty Jira API token.
3. Click **Save Token** or blur the field.
4. Observe the generic remote-method failure reported back to the renderer.

## Scope / Blast Radius

- Affects `packages/desktop` Jira credential save UX and the `connector:credential:set` IPC flow.
- Primarily impacts environments without an OS keychain backend and without safeStorage encryption support.
- Data-sensitive because the path handles API tokens, but the failure remains non-persistent and non-leaking.

## Suspected Root Cause

- The backend-selection code correctly failed closed, but the renderer had no early guard for `backend === 'unavailable'`.
- The user could still initiate a save attempt even though the app already knew no non-plaintext backend was present.

## Confirmed Root Cause

- `packages/desktop/src/main/credentials.ts` throws a clear unavailable-backend error when both keytar and safeStorage are unavailable.
- `packages/desktop/src/renderer/main.tsx` previously always invoked `window.srgnt.setJiraToken(...)` for non-empty drafts, so the user only discovered the problem after IPC failure.

## Workaround

- Use a machine with a supported credential backend (keytar or safeStorage encryption) before attempting to save Jira tokens.
- If live Jira auth is not possible, continue using fixture/offline workflows until a supported backend is available.

## Permanent Fix Plan

- Detect the unavailable backend in the renderer and short-circuit the save action with a clear local status message.
- Disable the Save Token button while the backend is unavailable.
- Keep the main-process error as a final safety net.

## Regression Coverage Needed

- Add UI coverage for the unavailable-backend path so the save control is disabled and a notice appears.
- Keep the credential-adapter test that asserts the main process throws the unavailable-backend error.
- Verify the happy path still saves and round-trips through keychain or encrypted-local storage.

## Related Notes

<!-- AGENT-START:bug-related-notes -->
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 Jira connector package extraction and markdown sync]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]
- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_03_implement-live-jira-api-sync-with-configurable-issue-extraction|STEP-21-03 Implement live Jira API sync with configurable issue extraction]]
- Architecture: [[01_Architecture/Jira_Connector_Package_and_Markdown_Persistence|Jira Connector Package and Markdown Persistence]]
- Decision: [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017 Keep Jira API tokens in the OS keychain behind the main-process settings boundary]]
- Related bug: [[03_Bugs/BUG-0017_jira-token-save-fails-when-electron-safestorage-encryption-is-unavailable|BUG-0017 Jira token save fails when Electron safeStorage encryption is unavailable]]
- Session: [[05_Sessions/2026-04-25-001028-implement-live-jira-api-sync-with-configurable-issue-extraction-coordinator|SESSION-2026-04-25-001028 coordinator session for Implement live Jira API sync with configurable issue extraction]]
<!-- AGENT-END:bug-related-notes -->

## Timeline

<!-- AGENT-START:bug-timeline -->
- 2026-04-26 - Reported.
- 2026-04-26 - Fixed in renderer with an unavailable-backend guard and disabled save control.
<!-- AGENT-END:bug-timeline -->
- 2026-04-26 - Final resolution: Settings control (not modal) — BUG-0019 superseded by revised requirement for Token Storage selector in Settings with OS keychain preference + encrypted in-app fallback + disabled keychain option with explanatory copy. Implementation complete across 3 chunks (contracts, main/credentials/IPC, UI/tests). 1026 desktop tests passing.
