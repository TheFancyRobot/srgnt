# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — IPC schema changes decode/reject correctly.
- `pnpm --filter @srgnt/harness test` — registry/detect suites stay green (this step *consumes* merge semantics; if `registry.ts` needed changes, stop and re-read the brief — only a REQ-26-xx entry justifies touching merge behavior).
- `pnpm --filter @srgnt/desktop test` — harnesses service create/delete + editor component tests.
- `pnpm --filter @srgnt/desktop test:e2e` — custom-harness session spec (remember the STEP-23-05 gotcha: e2e specs must be added to the explicit `test:e2e*` file lists in `package.json`).
- Manual: `pnpm --filter @srgnt/desktop dev` → Settings → Harnesses → Add custom harness.

## Acceptance Checks

- Create a custom definition pointing at the stdio mock agent (`launch.command: node`, args = built mock-agent bin + a scenario file — copy the spawn shape from `mock-agent.subprocess.test.ts`); run a **full session** with it through the normal chat flow: prompt round-trip, updates render, teardown clean. This is the phase's "custom harnesses behave identically to built-ins" criterion at mock scope.
- Restart the app: the custom harness still lists, still runs (persistence = `harnesses.json` round-trip through `SHarnessesFile`).
- Invalid specs produce actionable, field-anchored errors at save time (empty id, non-slug id, empty command, command containing spaces, malformed env key) — the save is rejected before any file write; `harnesses.json` on disk never becomes schema-invalid via the UI.
- Id collision with a built-in: warning copy shown pre-save, entry saves as a wholesale shadow, card gains the overridden badge, Reset restores the built-in (existing 25-02 behavior unchanged).
- Delete removes a custom entry from file + registry + list; delete is not offered for built-ins.
- Test-launch: against the mock agent reports agent name/version + protocol; against a nonexistent binary reports the spawn failure distinctly from an initialize timeout.
- Capability override tri-state round-trips: "trust negotiation" writes *no* field (absent, not `false`) — verify the serialized JSON, not just the UI state.

## Edge Cases

- Hand-edited schema-invalid `harnesses.json` still surfaces 25-02's readable load error; the Add flow is disabled (or warns) rather than silently overwriting the broken file. Fixing the file recovers without restart.
- Two custom entries with the same id: last-write-wins per registry semantics — the UI should prevent creating the duplicate but must tolerate rendering a hand-edited one.
- Deleting a harness whose session ran earlier this app-run: running/finished sessions are untouched; a *new* session attempt against the deleted id surfaces a readable "harness no longer configured" notice (`UnknownHarness` caught at the service boundary, the 25-02 expectation).
- Quirk flags on a custom definition drive the existing quirk-driven UI (TrustBadge, matrix behavioral columns) with zero code keyed on the new id — spot-check with `permission-routing-gaps` set on the mock definition.

## Regression Expectations

- All STEP-25-02 acceptance behavior intact (override/reset/badges/detection chips) — run its suites.
- Phase-23 chat + Phase-24 project/session e2e green (session creation path resolves definitions through the same service).
- `pnpm build` at repo root green.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides|STEP-26-01 Build custom harness editor with launch specs and capability overrides]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
