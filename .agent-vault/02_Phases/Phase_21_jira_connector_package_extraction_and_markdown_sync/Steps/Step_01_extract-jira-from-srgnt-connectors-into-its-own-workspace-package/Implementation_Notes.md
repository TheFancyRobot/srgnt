# Implementation Notes

### Concrete file and package expectations

- `pnpm-workspace.yaml` already includes `packages/*`, so a new `packages/connector-jira/` package should be picked up automatically.
- The new package should mirror the minimal structure already expected by the Phase 20 package runtime:
  - manifest export
  - runtime metadata export
  - factory export
- The extracted package should initially preserve the current fixture-backed behavior so Step 03 can add live API behavior without mixing concerns.
- The old built-in Jira path should either be deleted or reduced to zero Jira exports; do not leave a shadow registration path behind.

### Validation commands

- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/connector-jira test`
- `pnpm --filter @srgnt/connectors typecheck`
- `pnpm --filter @srgnt/connectors test`
- `pnpm --filter @srgnt/example-connectors-jira test`
- If desktop imports break after removal: `pnpm --filter @srgnt/desktop typecheck`

### Edge cases and failure modes

- Dual registration: Jira accidentally remains in the built-in registry and the external package.
- Example drift: `examples/connectors/jira` still imports from `@srgnt/connectors` instead of the new package.
- Package-shape drift: the new package exports fixtures and manifest but not the required `{ manifest, runtime, factory }` entrypoint.
- Test drift: registry tests still assert `jira` is bundled alongside Outlook and Teams.

### Security considerations

- No new secrets should be introduced in this step.
- Preserve the Phase 20 package boundary and do not reintroduce a privileged built-in-only Jira load path.

### Performance considerations

- Not performance-sensitive yet beyond keeping the extraction as a structural move.
- Do not pull live network or markdown-write behavior into this step.

### Acceptance criteria mapping

- Phase criterion “Jira no longer ships as a built-in implementation” is primarily satisfied here.
- This step does **not** satisfy settings, auth, live API, markdown persistence, or desktop integration criteria.

### Junior-developer readiness checklist

- Exact outcome and success condition: pass.
- Why the step matters: pass.
- Prerequisites and dependencies: pass.
- Concrete starting files/packages/tests: pass.
- Required reading completeness: pass.
- Constraints and non-goals: pass.
- Validation commands and acceptance mapping: pass.
- Edge cases and recovery expectations: pass.
- Security considerations: pass.
- Performance considerations: pass.
- Integration touchpoints and downstream effects: pass.
- Blockers or unresolved decisions: none blocking.
- Junior readiness verdict: **pass**.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_01_extract-jira-from-srgnt-connectors-into-its-own-workspace-package|STEP-21-01 Extract Jira from @srgnt/connectors into its own workspace package]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
