# Outcome

- Record the final result, validation performed, and explicit follow-up here.

## Result

Done. Settings gains a Harnesses section: every registry entry (pi, opencode, plus any `harnesses.json` customs) renders with its detection chip, an editable binary path / detect command / env, an "Overridden" badge with Reset (Delete for customs), and a per-project default-harness selector writing through `project:set-defaults`. Overrides are stored as a full canonicalized copy in `harnesses.json` (`0600`) and are what the NEXT session spawns - session creation now resolves definitions through the harnesses service instead of the hardcoded built-in, and a dangling project default blocks with an actionable error rather than silently spawning the mock.

## Validation performed

- `pnpm --filter @srgnt/contracts test` - 193 passed (7 files), incl. the new `harness configuration IPC (STEP-25-02)` suite.
- `pnpm --filter @srgnt/harness test` - 139 passed, 3 skipped (registry merge semantics untouched).
- `pnpm --filter @srgnt/runtime test` - 458 passed (24 files), incl. 3 new `writeJsonAtomic` mode tests.
- `pnpm --filter @srgnt/desktop test` - 1215 passed (68 files): 27 harnesses-service tests (temp workspace + injected probes, all at the service/IPC boundary), 10 `HarnessSettings` component tests, plus the extended chat target-resolution tests.
- `pnpm --filter @srgnt/desktop test:e2e` - 92 passed, 2 failed. Both failures are pre-existing environment issues unrelated to this diff: `app.spec.ts > exercises preload APIs...` (`posix_spawnp failed` from node-pty on this machine; reproduces with the sandbox disabled) and `bug-0013-visual.spec.ts` (needs `release/linux-unpacked/srgnt`). The new `e2e/harnesses.spec.ts` (4 tests) passes and is registered in every `test:e2e*` list.
- `pnpm lint` and `pnpm build` at repo root - both clean (contracts/runtime/harness rebuilt before the desktop suites, per the STEP-25-01 stale-`dist` trap).

Hardening covered by direct service-boundary tests: complete-but-tampered payload (`quirks` emptied, `capabilityOverrides.mcpServers` flipped, `source` switched, `name`/`docsUrl` rewritten) stores the base's values and still clamps `mcpServers` via `effectiveCapabilities`; id mismatch rejected with nothing written; save AND reset against an unreadable `harnesses.json` return the load error with the file byte-identical (hashed) and no tmp file left; secret literals on `TOKEN|SECRET|KEY|PASSWORD|...` keys rejected while `${env:NAME}` is stored literally and resolved only at spawn; `0600` on the published file (and therefore on the temp file it was renamed from); two concurrent saves to different harnesses both land.

## Follow-up

- **STEP-25-03:** the capability matrix owns `harness:capabilities`; `harness:list` deliberately carries no capabilities. The section id is `settings-section-harnesses` if the matrix wants to render beside it.
- **Phase 26 candidates recorded here rather than half-built:** custom-harness creation ("Add harness"), delta-patch overrides instead of wholesale shadowing, OS-keychain-backed secrets, per-entry tolerance for a schema-invalid `harnesses.json` (today one bad entry fails the whole file).
- **Deferred by decision:** per-harness permission-policy defaults (`SDesktopSettings` untouched).
- The in-chat harness picker still lists `mock`/`pi`; selecting opencode per session (rather than per project) is a small follow-on wherever the picker becomes capability-driven.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
