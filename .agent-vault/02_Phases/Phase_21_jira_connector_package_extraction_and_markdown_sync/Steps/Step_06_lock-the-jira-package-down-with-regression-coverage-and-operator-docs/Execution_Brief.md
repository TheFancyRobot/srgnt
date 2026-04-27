# Execution Brief

## Why This Step Exists

- Jira touches packaging, secrets, network sync, workspace writes, and UI state; without tight coverage this phase will drift or regress quickly.
- Operators need explicit setup and troubleshooting guidance for the first live external connector package.

## Prerequisites

- Complete [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_05_wire-the-external-jira-package-into-desktop-install-connect-and-sync-flows|STEP-21-05 Wire the external Jira package into desktop install connect and sync flows]].

## Relevant Code Paths

- all touched Jira package tests
- desktop settings/connectors tests
- CLI/package-host tests
- package README or operator documentation paths
- `README.md` and `TESTING.md` if phase-level docs need cross-links

## Execution Prompt

1. Add regression tests covering package extraction, settings persistence, token non-persistence, live-sync mapping, markdown output, and stale/archive behavior.
2. Run the narrowest useful tests first, then the broader suite needed to make the phase credible.
3. Update operator docs with setup steps, required Jira inputs, sync behavior, file locations, archive/stale semantics, and token rotation guidance.
4. Document the credential adapter behavior honestly: OS keychain preferred, encrypted fallback only where supported by the implementation.
5. Record any deliberately deferred work, for example Atlassian OAuth or dashboards, explicitly instead of letting it hide inside TODOs.
6. Do not mark the phase ready unless the docs and tests reflect the final connector shape.

## Related Notes

- Step: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Steps/Step_06_lock-the-jira-package-down-with-regression-coverage-and-operator-docs|STEP-21-06 Lock the Jira package down with regression coverage and operator docs]]
- Phase: [[02_Phases/Phase_21_jira_connector_package_extraction_and_markdown_sync/Phase|Phase 21 jira connector package extraction and markdown sync]]
