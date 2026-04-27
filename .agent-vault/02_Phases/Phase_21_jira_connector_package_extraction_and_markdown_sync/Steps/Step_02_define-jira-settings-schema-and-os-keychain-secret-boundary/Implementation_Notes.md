# Implementation Notes

### Recommended settings shape

- Model Jira under connector-scoped settings, not top-level one-off fields.
- Minimum non-secret fields:
  - `siteUrl`
  - `accountEmail` or `accountLabel`
  - `scopeMode` (`projects` or `jql`)
  - `projectKeys` and/or `jql`
  - extraction toggles for comments, links/subtasks, sprints, worklog summaries, attachment metadata, changelog summaries
- Token handling should use separate commands such as set/update/clear/status rather than treating the token as part of `settingsSave`.

### Credential backend assumption

- The refined plan assumes a **credential adapter** rather than hard-coding a single library at note time.
- Adapter priority:
  1. OS keychain backend when available
  2. encrypted local fallback under Electron main when keychain access is unavailable
- If the implementation cannot provide a trustworthy encrypted fallback on a target platform, fail closed and surface that limitation instead of silently storing plaintext.

### Validation commands

- `pnpm --filter @srgnt/contracts test`
- `pnpm --filter @srgnt/contracts typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop typecheck`
- Optional narrow target if test names are added: run settings-related and preload-related tests first before full desktop suite.

### Manual checks

- Save Jira non-secret config, then inspect `.command-center/config/desktop-settings.json` and confirm no token material exists.
- Restart the app and confirm non-secret settings persist while token presence is only represented as a safe boolean/status, not raw secret text.
- Verify reconnect/clear-token flow works without hand-editing JSON.

### Edge cases and failure modes

- Existing settings migration drops unknown connector config or rewrites it incorrectly.
- Renderer keeps token state around after submission.
- Credential backend unavailable on a platform and implementation falls back to insecure plaintext.
- Scope mode permits invalid combinations such as both empty `projectKeys` and empty `jql`.

### Security considerations

- This is the most security-sensitive step in the phase.
- The renderer may submit a token but must not retain or rehydrate it.
- Logs, errors, crash reports, and persisted settings must all avoid token leakage.
- Any “credential status” surface sent back to renderer must be boolean/summary only.

### Performance considerations

- Not throughput-sensitive, but settings reads and credential lookups must remain fast enough for app startup and connect actions.
- Avoid repeated blocking credential lookups on every render.

### Acceptance criteria mapping

- Phase criterion “Desktop settings support Jira non-secret configuration” is primarily satisfied here.
- Phase criterion “Jira API token handling uses OS keychain / main-process secret storage only” is defined here and partially implemented here.
- Later steps consume this contract; they should not redesign it.

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
- Blockers or unresolved decisions: resolved enough for execution via adapter assumption.
- Junior readiness verdict: **pass**.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_02_define-jira-settings-schema-and-os-keychain-secret-boundary|STEP-21-02 Define Jira settings schema and OS-keychain secret boundary]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
