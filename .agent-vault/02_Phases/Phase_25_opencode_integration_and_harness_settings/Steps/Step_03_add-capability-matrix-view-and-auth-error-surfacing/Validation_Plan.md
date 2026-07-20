# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `harness:capabilities` (or extended `harness:list`) schema.
- `pnpm --filter @srgnt/harness test` — mock-agent `authRequired` directive suite.
- `pnpm --filter @srgnt/desktop test` — `CapabilityMatrix` + `AuthPanel` component tests; chat controller auth-required handling.
- `pnpm --filter @srgnt/desktop test:e2e` — auth-flow spec (added to the explicit `test:e2e*` file lists — STEP-23-05 gotcha).
- Manual: `pnpm --filter @srgnt/desktop dev` with opencode present-but-unauthenticated, and with a Pi session for the known row.

## Acceptance Checks

- Matrix content equals the committed fixtures, cell for cell:
  - Pi row: loadSession **yes**, resumeSession **no**, images **yes**, audio **no**, mcpServers **clamped** (advertised true → effective false, copy names the definition override), permission gating **self-approving** (quirk-driven), fs/terminal delegation **none**, modes/slashCommands captioned "discovered per session".
  - opencode row: exactly what `fixtures/opencode/` initialize says — no more, no less (test written against the fixture, not against expectations).
  - Mock row from its scenario initialize; a registered-but-never-connected harness renders **not yet measured** on every negotiated column.
  - Provenance split asserted separately: initialize-fixture columns (e.g. `loadSession`, `images`) prove baseline negotiation, while `modes`/`slashCommands` are driven from a **post-initialize session-discovered** fixture and must render as "discovered per session" (or measured-present once discovered) — never as a hard **no** inferred from the negotiated default `false`. A capability absent from both the baseline and any session update reads as **not yet measured**, distinct from measured-and-genuinely-absent.
  - A row whose cached `definitionFingerprint` no longer matches the current effective definition renders stale/not-yet-measured with the "re-connect to refresh" hint, not as a current row.
- Rows come from registry + cache data only — adding a fake definition in `harnesses.json` (test workspace) produces a new row with zero component changes (test proves the no-hardcoding constraint).
- `capturedAt` + agent version render per measured row.
- Auth: with the mock `authRequired` scenario, starting a session renders the AuthPanel (methods listed with name/description, docsUrl link, copyable command for terminal-type) instead of a raw error toast; Retry after the scenario's auth gate opens yields a working session; the event log contains the auth failure + retry audit events.
- No credential input fields exist anywhere in the panel (constraint check).

## Edge Cases

- Cache file absent (fresh workspace) → all rows not-yet-measured; no crash, no spinner-forever.
- Cache entry exists for a harness id no longer in the registry (definition deleted) → entry ignored/dropped, no ghost row.
- Older cache `version` or unknown fields → tolerant decode (matrix renders what it understands; STEP-25-01's cache contract).
- Harness with **zero** `authMethods` advertised that still fails auth-required → panel degrades to docsUrl + generic guidance (don't assume methods exist).
- Auth failure mid-conversation (token expired after successful start) → same panel path from the prompt-failure surface, session not corrupted; Retry re-attaches (or forks per PHASE-24 rules if the session is gone — record observed behavior).
- User cancels/leaves the AuthPanel → session stays in a visible failed-setup state; no orphaned agent process (supervisor teardown assertion).
- Turn-cancel while AuthPanel is up → panel dismisses cleanly (mirror STEP-23-03's cancel-pending-prompt wiring).

## Regression Expectations

- Non-auth error surfaces from STEP-23-04 unchanged (spawn failure, turn error, cancel) — auth detection must be narrow (the verified SDK auth-required shape only), not a catch-all rewrite of error handling.
- TrustBadge behavior from STEP-23-03 unchanged; matrix and badge derive from the same quirk data without duplication drift (shared helper or shared fixture test).
- Phase-23/24 chat + persistence e2e suites green; `pnpm build` green.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
