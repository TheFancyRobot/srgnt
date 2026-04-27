# Validation Plan

Linked context: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_07_add-os-aware-more-info-help-for-unavailable-encrypted-jira-token-storage|STEP-21-07]] · [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017]] · [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]

## Acceptance Checks

- The unavailable credential-storage state still renders the primary warning when `tokenStatus.backend === 'unavailable'`.
- A `More Info` disclosure is visible adjacent to that warning and is closed by default.
- Expanding the disclosure shows platform-relevant recovery guidance for the current platform.
- The disclosure does not remove or weaken the disabled state of:
  - the Token Storage selector,
  - the Save Token button.
- Existing BUG-0019 / BUG-0020 semantics remain true:
  - no token save attempt when storage is unavailable,
  - no secret leaks,
  - no raw Electron error copy appears in renderer UX.

## Suggested Commands

Run in this order unless the touched files require broader coverage sooner:

1. `pnpm --filter @srgnt/desktop test -- src/renderer/components/JiraConnectorSettings.test.tsx`
2. `pnpm --filter @srgnt/desktop test -- src/main/credentials.test.ts`
3. `pnpm --filter @srgnt/desktop test -- src/main/connector-credential-ipc.test.ts`
4. `pnpm --filter @srgnt/desktop typecheck`
5. `pnpm --filter @srgnt/desktop lint`

Escalate to:

6. `pnpm --filter @srgnt/desktop test`

if you touched renderer wiring outside the component, added preload fields, or changed shared helpers used in more than one test surface.

## Minimum Test Additions

- Add a UI test for the unavailable state proving the `More Info` trigger exists.
- Add a UI test that expands the disclosure and asserts Linux-specific guidance when platform is `linux`.
- Add at least one non-Linux platform assertion (`darwin` or `win32`) if the content branches by platform.
- Add a fallback/unknown-platform test if you implement a generic fallback branch.
- Keep the existing disabled-selector and disabled-save assertions in the unavailable-state test.

## Manual Checks

1. Trigger the unavailable state in the Jira settings panel.
2. Confirm the warning appears before interacting with the token field.
3. Toggle the `More Info` disclosure with mouse.
4. Toggle the same disclosure with keyboard only.
5. Confirm focus order remains sensible and no focus trap is introduced.
6. Verify the expanded guidance matches the detected platform.
7. Confirm the Token Storage selector and Save Token button remain disabled while the disclosure is open and after it closes.

## Edge Cases

- `window.srgnt.platform === 'linux'` but the user is actually in WSL or a container.
- `window.srgnt.platform` returns an unexpected string.
- The user expands and collapses the disclosure repeatedly while editing other Jira settings.
- A token already exists, but the environment currently reports `backend === 'unavailable'`.
- Reduced-motion / keyboard-only interaction.

## Failure Modes To Watch For

- The implementation accidentally enables the Save Token button while storage remains unavailable.
- The disclosure content claims the app will automatically recover without restart/retry.
- Renderer copy mentions raw backend internals (`safeStorage.encryptString`, stack traces, etc.).
- Tests only verify copy text but stop checking the unavailable-state safety guard.

## Security Judgment

- Security-sensitive UI change.
- Validation must explicitly confirm that no new path stores secrets outside the main-process boundary and that unavailable-state messaging never suggests insecure workarounds.

## Performance Judgment

- Performance impact should be negligible.
- If the implementation adds async environment probing, that is a smell; prefer static platform-based copy unless there is a proven need.

## Completion Bar

This step is not done until a new engineer can read the tests and see all of the following in one place:
- which state triggers the help,
- what help is shown,
- which controls remain disabled,
- and which platform branches are intentionally supported.
