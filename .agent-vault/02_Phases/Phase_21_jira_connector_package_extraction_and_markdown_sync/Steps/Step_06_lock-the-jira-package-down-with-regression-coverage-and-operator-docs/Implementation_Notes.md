# Implementation Notes

### Minimum validation map

- extracted Jira package tests and typecheck
- desktop settings tests for Jira config and secret non-persistence
- package-host / integration tests for install-load-connect state
- markdown persistence tests including stale/archive cases
- renderer tests for any Jira-specific settings surface added in Step 02

### Broader validation expected before handoff

- `pnpm --filter @srgnt/connector-jira test`
- `pnpm --filter @srgnt/connector-jira typecheck`
- `pnpm --filter @srgnt/desktop test`
- `pnpm --filter @srgnt/desktop typecheck`
- `pnpm --filter @srgnt/contracts test`
- `pnpm test` before phase completion unless a still-open blocker makes full-suite execution impossible

### Documentation must answer

- how to install and connect Jira
- what non-secret fields are configurable
- how token entry and rotation work
- where Jira markdown lands
- what “archived/stale” means
- which Jira metadata groups are included by default
- what is explicitly deferred to later phases

### Edge cases and failure modes

- tests cover happy path but miss no-token and invalid-config flows
- docs describe a keychain-only story while code actually uses an adapter with fallback
- package integration works in unit tests but not through desktop install/connect flows
- stale/archive semantics are implemented but undocumented, causing operator confusion

### Security considerations

- Regression coverage must assert non-persistence of token material, not just absence in nominal UI.
- Documentation must avoid encouraging manual secret edits in JSON files.
- Error and inspect outputs must stay redacted.

### Performance considerations

- Include at least one regression check that sync scope and markdown generation stay bounded for moderate fixture sizes.
- Avoid requiring full e2e for every small iteration, but make sure final phase handoff includes enough breadth to be trustworthy.

### Acceptance criteria mapping

- This step closes the remaining phase criterion for automated validation and operator documentation.
- It also verifies the earlier criteria remain true under regression coverage.

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

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_06_lock-the-jira-package-down-with-regression-coverage-and-operator-docs|STEP-21-06 Lock the Jira package down with regression coverage and operator docs]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
