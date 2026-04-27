# Execution Brief

## Why This Step Exists

- The current unavailable-state copy explains that secure storage cannot be used, but it does not help the user recover.
- BUG-0019 and BUG-0020 already established the correct backend behavior: fail closed, keep secrets out of renderer/workspace state, and surface a clear unavailable message.
- This step is a focused UX follow-up: keep the secure behavior, but add a compact, actionable recovery explanation next to the warning.

## Exact Outcome and Success Condition

- Add a visible `More Info` trigger directly associated with the existing unavailable warning in the **Token Storage** card.
- Opening the disclosure shows OS-aware remediation guidance:
  - **Linux**: mention `libsecret` plus a running Secret Service provider such as `gnome-keyring`/desktop keyring support; note that WSL, containers, and headless sessions may still block encrypted storage.
  - **macOS**: mention login Keychain access / running inside a normal user session.
  - **Windows**: mention normal desktop session / OS credential storage availability.
- The UI remains anchored in the same card; do **not** switch to a modal unless inline disclosure proves inaccessible or unworkable.
- The save path remains unchanged: when `backend === 'unavailable'`, the Save Token button stays disabled and the secret boundary remains intact.

## Why It Matters To Phase 21

- Phase 21 is the first live Jira connector path. If token storage is blocked, users need immediate recovery guidance or they will experience the feature as broken.
- The phase already established preferred keychain storage with encrypted local fallback. This step closes the user-facing clarity gap without weakening that security model.

## Prerequisites and Dependencies

- Depends on [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_06_lock-the-jira-package-down-with-regression-coverage-and-operator-docs|STEP-21-06 Lock the Jira package down with regression coverage and operator docs]].
- Read BUG-0019 and BUG-0020 before making any UI changes; they define the current intended unavailable-state behavior.
- Use [[04_Decisions/DEC-0017_keep-jira-api-tokens-in-the-os-keychain-behind-the-main-process-settings-boundary|DEC-0017]] and [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]] as non-negotiable secret-handling constraints.

## Concrete Starting Surface

Start here, in this order:

1. `packages/desktop/src/renderer/components/JiraConnectorSettings.tsx`
   - Existing Token Storage card already renders:
     - normal storage preference copy,
     - keychain-unavailable copy,
     - full unavailable-state warning,
     - disabled selector/save behavior.
   - This is the primary implementation surface for the `More Info` disclosure.

2. `packages/desktop/src/renderer/components/JiraConnectorSettings.test.tsx`
   - Existing tests already cover keychain-available, keychain-unavailable, and both-backends-unavailable states.
   - Extend these tests rather than creating a separate test file unless a new helper warrants direct unit tests.

3. `packages/desktop/src/preload/index.ts` and `packages/desktop/src/renderer/env.d.ts`
   - `window.srgnt.platform` already exists.
   - Only touch these files if the current platform string is not enough and a new non-secret hint must be exposed.

4. `packages/desktop/src/renderer/main.tsx`
   - Only touch if the component needs additional non-secret props or a refreshed status flow.
   - Do not move token logic into renderer state beyond the existing draft/status model.

5. Read-only validation surfaces:
   - `packages/desktop/src/main/credentials.ts`
   - `packages/desktop/src/main/index.ts`
   - `packages/contracts/src/connectors/jira-settings.ts`
   These files define the current backend semantics; avoid changing them unless a real gap is proven.

## Recommended Implementation Shape

1. Keep the current warning paragraph for `storageUnavailable`.
2. Add an inline disclosure button/link immediately after or below that warning, for example:
   - collapsed label: `More Info`
   - expanded label: `Hide Details`
3. Render a small structured help block when expanded:
   - why SRGNT cannot save the token,
   - which system capability is missing on the current platform,
   - what the user can install/start,
   - when the fix may still not work (WSL/container/headless).
4. Derive the copy from `window.srgnt.platform` if possible:
   - `linux`
   - `darwin`
   - `win32`
   - fallback generic copy for any unknown value.
5. Keep the copy honest:
   - do not promise auto-install,
   - do not claim success is guaranteed after installation,
   - do not suggest plaintext/manual file storage.

## Constraints and Non-Goals

### Constraints
- No raw token may be written to workspace files, settings JSON, logs, or renderer persistence.
- The unavailable-state save disablement must remain intact.
- Do not expose Electron internal error text or privileged implementation details directly in the UI.
- Keep the disclosure keyboard-accessible and screen-reader-friendly.

### Non-Goals
- Do not redesign the whole Jira settings panel.
- Do not change the backend selection algorithm in `credentials.ts`.
- Do not add distro/package-manager auto-detection unless existing platform-only guidance proves insufficient.
- Do not introduce a modal-first experience.

## Edge Cases, Failure Modes, and Recovery Expectations

- **Linux desktop without libsecret/keyring**: explain likely missing libraries/services.
- **WSL / container / headless Linux**: explicitly note that desktop keychain/encryption services may be unavailable even after packages are installed.
- **macOS/Windows unavailable state**: keep guidance higher-level; do not fabricate package names that are not under SRGNT control.
- **Unknown platform string**: show safe generic guidance instead of blank content.
- **Repeated expansion/collapse**: should not reset other Jira settings state.
- **No token draft present**: disclosure still works; it is independent of token input.

## Security and Performance

- **Security**: high relevance. This step is UI-only, but it touches secret-adjacent messaging. Preserve the main-process credential boundary and avoid encouraging unsafe workarounds.
- **Performance**: low risk. The disclosure should be static, local UI content. Avoid async lookups unless they are strictly necessary.

## Integration Touchpoints and Downstream Effects

- The Token Storage card now needs to stay consistent with BUG-0019 / BUG-0020 semantics and tests.
- Any new helper for platform-specific copy should remain renderer-safe and free of secret/backend logic.
- If you add a shared helper, document it in `Implementation_Notes.md` so later connector settings work can reuse the pattern.

## Validation Commands

Run the narrowest useful checks first:

- `pnpm --filter @srgnt/desktop test -- src/renderer/components/JiraConnectorSettings.test.tsx`
- `pnpm --filter @srgnt/desktop test -- src/main/credentials.test.ts`
- `pnpm --filter @srgnt/desktop test -- src/main/connector-credential-ipc.test.ts`
- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/desktop lint`

If the implementation touches preload or renderer wiring beyond the component, run:

- `pnpm --filter @srgnt/desktop test`

## Handoff Expectations

- If implementation requires new non-secret environment hints beyond `window.srgnt.platform`, record the exact reason in `Implementation_Notes.md` before changing IPC.
- If product/UX forces a modal instead of inline disclosure, document the failed inline constraint explicitly and get review attention on accessibility.
- Reviewer should specifically verify that the final UX change does not weaken the disabled-unavailable guard or add misleading cross-platform guidance.

## Junior-Developer Readiness Verdict

- Ready to execute.
- There are no blocking product ambiguities left for a first pass because the UX choice is now fixed to inline disclosure by default, the starting files are named, and the security/non-goal boundaries are explicit.
