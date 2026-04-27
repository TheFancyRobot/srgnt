# Implementation Notes

- Freshness state is part of user trust, not just internal diagnostics.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Connector management UI surface in `packages/desktop/renderer/` — a settings/status panel showing all installed connectors with: name, auth state (connected / disconnected / expired), freshness status (fresh / stale / unknown), last sync timestamp, and error summary
- Normalized connector status model in `packages/runtime/` or `packages/connectors/sdk/` — a single `ConnectorStatus` Zod schema that all connectors emit, consumed by the UI without connector-specific view logic
- IPC channels in `packages/desktop/preload/` for querying connector status (read-only from renderer)
- Manual smoke test documentation covering three states: healthy (all connectors fresh), stale (one connector behind), and disconnected (auth expired or network failure)
- UI tests or component tests for the status panel if the testing infrastructure from PHASE-02 supports it

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): `ConnectorStatus` schema must be Zod-defined; UI consumes typed status, not raw objects
- DEC-0004 (macOS + Windows + Linux): UI must render correctly on all three platforms
- DEC-0005 (pnpm monorepo): UI components in the desktop app package, status model in SDK or runtime
- DEC-0007 (Dataview/markdown local data): Status is derived from sync state in local files, not a separate status database

**Starting files (must exist before this step runs):**
- All three connectors complete: STEP-04-02 (Jira), STEP-04-03 (Outlook), STEP-04-04 (Teams)
- Connector SDK with auth/session lifecycle from STEP-04-01
- Desktop shell and renderer from PHASE-02
- Freshness model established in STEP-04-03

**Constraints:**
- Do NOT add connector-specific rendering logic — the UI must consume the normalized `ConnectorStatus` model only
- Do NOT expose connector secrets or tokens in the status UI
- Do NOT implement connector configuration/setup flows in this step (that is a separate concern) — this is read-only status display
- Prefer explicit stale/disconnected states over silent fallback (per Human Notes)

**Validation:**
A junior dev verifies completeness by:
1. Opening the desktop app and navigating to the connector status panel
2. Seeing all three connectors (Jira, Outlook Calendar, Teams) listed with auth state and freshness
3. Simulating a stale connector (e.g., expired fixture timestamp) and confirming the UI shows "stale" not "healthy"
4. Simulating a disconnected connector (e.g., revoked auth fixture) and confirming the UI shows "disconnected" with error context
5. Confirming the renderer code has zero direct imports from connector packages — only from the status model

**Junior-readiness verdict:** PASS — This is a well-bounded UI step with clear inputs (three working connectors, a status model) and clear outputs (a status panel with three testable states). The main risk is connector-specific view logic creeping in, which the constraints guard against.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_05_add-connector-status-and-freshness-ui|STEP-04-05 Add Connector Status And Freshness UI]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
