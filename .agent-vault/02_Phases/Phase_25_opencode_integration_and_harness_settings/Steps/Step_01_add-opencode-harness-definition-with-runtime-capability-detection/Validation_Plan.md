# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `detectCommand` field + capability-cache file schema decode/reject.
- `pnpm --filter @srgnt/harness test` — WITHOUT env vars: registry/detect/capabilities unit suites green and both integration suites (`SRGNT_IT_PI`, `SRGNT_IT_OPENCODE`) skip cleanly (this is the CI reality — no opencode there).
- `SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode` — the live capture run; the logged negotiated-capabilities JSON is the evidence artifact.
- `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test pi` — regression: the Pi definition (now carrying `detectCommand: 'pi'`) still connects and clamps `mcpServers` off.
- `pnpm --filter @srgnt/runtime test` — capability-cache suite.
- `pnpm build` at repo root.

## Acceptance Checks

- `HarnessRegistry.create().list()` contains `pi` and `opencode`; `effectiveCapabilities('opencode', negotiated)` is a pure passthrough (no overrides), while Pi's still clamps `mcpServers` to false.
- `detectHarness(opencodeDefinition)` returns `ok` + a parsed version with opencode installed; `not-installed` when it is absent (test via injected probe returning ENOENT — do not depend on machine state in unit tests); `probe-failed`/timeout via the hang-probe fixture. `detectHarness(piDefinition)` probes `pi`, not `npx`.
- With opencode installed and configured: the gated IT completes `initialize` and one trivial prompt round-trip to `end_turn`; raw initialize payload committed under `packages/harness/src/testing/fixtures/opencode/` (redacted); `06_Shared_Knowledge/opencode-acp-capture.md` exists with the measured row (auth methods, loadSession/resumeSession, permission round-trip observation).
- `NegotiatedCapabilities` now carries `authMethods` and `sessionList`; decoding the committed **pi** initialize fixture yields `authMethods: [pi_terminal_login…]` **with the full method metadata preserved** (`type: "terminal"`, `args: ["--terminal-login"]` — not a lossy id/name projection) and `sessionList: true` (regression-proves the extension against known data).
- After a successful desktop chat connect, `harness-capabilities.json` exists at the workspace root and its entry for the connected harness matches the live negotiation and carries a `definitionFingerprint` equal to the hash of the current effective definition (manual check: run the app, start a mock session, inspect the file).

## Edge Cases

- opencode installed but unauthenticated/unconfigured provider → IT records the failure shape (error code/message) instead of green-washing; finding goes to the capture note (STEP-25-03 consumes it). The test must still tear the process down (no orphans).
- `opencode --version` measured 2026-08-13: prints a bare `1.18.18` (no prefix, no banner), so the existing `parseVersion` first-semver-ish-token rule handles it unchanged. Re-confirm at capture time; if a future output defeats it, fix `parseVersion` with a unit test, don't special-case opencode.
- Packaged/GUI-launched Electron on macOS gets a login-shell-less PATH — detection may report `not-installed` for a binary the terminal sees. Must degrade to guidance, never crash; note this in the capture note (STEP-25-02's binary-path override is the remedy).
- Corrupt or version-bumped `harness-capabilities.json` → tolerant decode to empty cache + rewrite on next connect; never a startup failure.
- Two rapid connects for the same harness → **last write wins, file never torn** (spec simplified 2026-08-13; see the Execution Brief). Assert exactly two things: both concurrent writes complete without error, and the resulting file decodes cleanly with the last-completing writer's negotiation in the entry. Out-of-order completion leaving the older negotiation stored is **accepted behavior, not a bug** — the cache is display-only and a live session never reads it. Do not add a `capturedAt` comparison to "fix" ordering: wall-clock ties at ms resolution and can move backwards, so it is worse than no ordering. If a real user-visible stale row ever shows up here, the upgrade path is a monotonic per-harness generation reserved inside the same write queue.
- Definition or override changed after a capture (e.g. `pi` shadowed with a new launch spec) → the cache entry's `definitionFingerprint` no longer matches the effective definition and the store reports the entry as stale/not-yet-measured; it never presents the old negotiation as current.

## Regression Expectations

- Pi IT and pi-spike suites untouched and green (gated); mock-agent suites green; detect timeout kill-tree tests green (no orphan regression).
- Normal `pnpm --filter @srgnt/harness test` runtime does not grow materially (new ITs are skipped by default).
- No new Electron imports in `@srgnt/harness` (build/lint boundary check stays green).

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_01_add-opencode-harness-definition-with-runtime-capability-detection|STEP-25-01 Add opencode harness definition with runtime capability detection]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
