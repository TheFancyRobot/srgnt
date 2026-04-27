# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- The main connector surfaces visibly communicate the three-state model.
- No component copy or default toggle implies that connectors arrive preinstalled.
- The presentational contract is ready for Step 05 to wire with real preload calls.

**Key decisions to apply:**
- [[01_Architecture/Integration_Map|Integration Map]] is the architecture anchor: the renderer shows safe summary state only and never becomes the source of truth for installation.
- “Install” is the first action for discoverable connectors; “Connect” is not shown before installation.
- Settings and connector views should agree on naming and counts.
- Preserve accessibility and testability: every action must have clear button text and ARIA labels.

**Starting files and likely touch points:**
- `packages/desktop/src/renderer/components/ConnectorStatus.tsx` and tests.
- `packages/desktop/src/renderer/components/Settings.tsx` and tests.
- `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx` and tests.
- `packages/desktop/src/renderer/components/sidepanels/SettingsSidePanel.tsx` if category labels or navigation hints change.

**Constraints and non-goals:**
- Do not call preload or mutate global state directly from deeply nested presentational components unless there is an established pattern already in use.
- Do not reintroduce boolean connector toggle copy.
- Do not fake installation in UI-only state just to make tests pass.
- Do not expose secret/auth details in component props.

**Edge cases and failure modes:**
- Installed-but-error connectors still need clear action affordances.
- Unavailable future connectors should degrade safely if catalog support later expands.
- Empty states should remain useful when zero connectors are installed and when zero connectors are available.

**Security:**
- Renderer components should operate on safe summary state only.
- No token/account details belong in these props.

**Performance:**
- Keep grouping logic straightforward and memoizable.
- Avoid unnecessary prop reshaping that causes broad rerenders in lists.

**Validation:**
1. `pnpm -C packages/desktop test -- --filter ConnectorStatus`
2. `pnpm -C packages/desktop test -- --filter Settings`
3. `pnpm -C packages/desktop test -- --filter ConnectorsSidePanel`
4. Manual smoke in the renderer shell with mocked state or live app: verify buttons and section headings for available, installed, connected, and error cases.

**Junior-readiness verdict:** PASS — the UI matrix is explicit enough to implement without guessing if the action matrix above is followed.

### Readiness packet (handoff)

- **Starting files:** `packages/desktop/src/renderer/components/ConnectorStatus.tsx`, `packages/desktop/src/renderer/components/Settings.tsx`, `packages/desktop/src/renderer/components/sidepanels/ConnectorsSidePanel.tsx`, and corresponding tests under `packages/desktop/src/renderer/components/**`.
- **Success condition:** renderer surfaces must show explicit Available/Installed/Connected states and no longer imply pre-installed connectors before Step 05.
- **Blockers:** none technical inside this step; execution is blocked only by stale Step 03 runtime semantics if incomplete (Step 05 assumes `onInstall`, `onConnect`, etc. callbacks are available).
- **Edge/failure cases to validate:** install state mismatch between discoverability and render; empty workspace state; error-state connectors; unavailable catalog entries.
- **Validation expectations:** targeted component tests and renderer smoke checks complete with manual verification of labels/state grouping and action affordances.
- **Downstream effect:** creates stable UI action contract consumed by Step 05 without additional prop-shape churn.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_04_update-settings-and-connector-ui-to-show-installable-connectors-installed-indicators|STEP-19-04 Update Settings and connector UI to show installable connectors + installed indicators]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
