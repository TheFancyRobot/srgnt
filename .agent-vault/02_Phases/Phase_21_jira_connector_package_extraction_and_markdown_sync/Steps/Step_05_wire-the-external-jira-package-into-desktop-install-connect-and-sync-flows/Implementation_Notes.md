# Implementation Notes

### Current desktop constraints discovered during refinement

- `packages/desktop/src/main/index.ts` currently seeds connector definitions from `BUILTIN_CONNECTOR_MANIFESTS` imported from `@srgnt/connectors`.
- `connectorInstall`, `connectorConnect`, and `connectorDisconnect` currently manage mostly derived state and catalog metadata rather than a full live package-backed sync path.
- The host/registry infrastructure from Phase 20 exists, but Jira still needs to be routed through it end to end.

### Concrete integration targets

- Desktop main should treat Jira as package-backed for install, activation, connection, and sync.
- Renderer and preload should continue receiving only high-level connector state:
  - installed
  - available
  - connected/disconnected/error/refreshing
  - safe lastError and lastSyncAt
- Dev catalog fixtures should describe the external Jira package accurately enough that local install flow coverage remains possible.

### Validation commands

- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop cli:connectors -- --help`
- If package install fixtures changed, run the relevant connector host / CLI integration tests first, then the broader desktop suite.

### Manual checks

- Fresh workspace: Jira appears as available but not installed.
- After install: Jira appears installed and package-backed.
- After connect: Jira becomes connected without exposing token material.
- After sync: status and freshness data update truthfully.
- After uninstall: no stale package-backed Jira state remains registered.

### Edge cases and failure modes

- Legacy built-in state still shadows the external package.
- Connector ID mismatch between package install record and UX card.
- Package host assumptions only work for dummy fixtures and fail for a real package.
- Install succeeds but connect/sync still hit old stub logic instead of the package runtime.

### Security considerations

- Maintain DEC-0016 isolation: renderer/preload must never load package code directly.
- Token material must remain behind the main-process credential boundary even when connect/sync is triggered from the UI.
- High-level state and errors must remain safe for IPC and logs.

### Performance considerations

- Avoid reloading or reinstalling the package unnecessarily on every settings save or panel render.
- Preserve restart recovery semantics already defined by the package host.

### Acceptance criteria mapping

- Phase criterion “Desktop install/connect/sync flows work with the externalized Jira package without regressing safety invariants” is primarily satisfied here.
- This step integrates the outputs of Steps 01-04; it should not redesign their contracts.

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

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
