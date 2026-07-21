# Validation Plan

## Primary Acceptance Checks

1. **Packaged harness session (the anti-ERR_REQUIRE_ESM guard):** the packaged app,
   launched from the built artifact, opens a mock-agent session and a prompt
   round-trips to a response. Build/typecheck success is NOT sufficient — this must run
   against the packaged binary's bundled Node. Maps to phase criterion "mac + linux
   packaged builds pass the packaged E2E smoke."
2. **Bundled bus server present + launchable** inside every packaged artifact.
3. **Windows build produced** with caveats documented (not session-gated).

## Commands

- Linux packaged E2E (CI-gating): `pnpm test:e2e:packaged:linux`
  (= `pnpm --filter @srgnt/desktop run pack && playwright test e2e/packaged.spec.ts`).
  Self-skips off Linux (`test.skip(process.platform !== 'linux')`).
- Build artifacts locally:
  - mac: `pnpm --filter @srgnt/desktop dist:mac` (dmg x64 + arm64) — run on macOS.
  - linux: `pnpm --filter @srgnt/desktop dist:linux` (AppImage) +
    `pnpm --filter @srgnt/desktop dist:rpm:fedora` (needs rpmbuild).
  - win: `pnpm --filter @srgnt/desktop dist:win` (NSIS x64) — best-effort.
- CI: `.github/workflows/desktop-release.yml` on a `v*` tag or `workflow_dispatch`
  runs `verify-linux-rc` (`release:check:repo` under xvfb) then the build matrix.

## What The Packaged Session Smoke Must Assert (concrete)

- Launch `release/linux-unpacked/srgnt` (Linux) / the mac app via
  `electron.launch({ executablePath })` as `packaged.spec.ts` already does.
- `completeOnboarding(page)` to reach the app.
- Open a mock-agent chat session, send a prompt, and assert an agent response appears
  (this is the line that exercises `Function('return import("@srgnt/harness")')()` in
  the packaged Node — the ONLY reliable catch for `ERR_REQUIRE_ESM`).
- Assert no `ERR_REQUIRE_ESM` / uncaught main-process error surfaced (check the
  Electron app logs / a renderer error boundary).
- Resolve the bus-server bin path and spawn it once (or assert a group session's broker
  starts) to prove the bundled executable is packaged and runnable.

## Manual Checks

- macOS: install the dmg (both arches if possible), launch, run the mock session smoke
  manually. Record `isPackaged: true` and that a session round-trips.
- Windows (if a host is available): install the NSIS build, note whether stdio agent
  spawning / node-pty / ConPTY works; record findings verbatim into the caveats doc.
  A failure here is expected/allowed — it must be documented, not fixed.

## Edge Cases / Failure Modes

- `ERR_REQUIRE_ESM` at session open in the packaged app while dev works fine — the
  headline failure mode this step exists to catch. If it appears, the fix is preserving
  the `Function('return import(...)')` dynamic-import escape hatch through the packaged
  build (bundlers/minifiers can rewrite it — verify it survives).
- Bus-server bin present in `dist` but not spawnable because it is inside the asar —
  needs `asarUnpack`/`extraResources`. Symptom: ENOENT/EACCES on spawn from the
  packaged app only.
- rpm build fails "Missing generated icons" — run `build:icons` first (the script does
  this, but confirm in a clean checkout).
- Windows path handling in HarnessDefinitions (backslashes, spaces) breaking agent
  spawn — document, do not block.

## Regression Expectations

- Existing `packaged.spec.ts` assertions (onboarding heading, `isPackaged`,
  `hasApi`/`hasProcess`/`hasRequire` renderer isolation) stay green after extension.
- BUG-0014 packaged arrow-key test stays green.
- Release workflow triggers remain `v*` + `workflow_dispatch` ONLY — verify no
  `pull_request`/push-to-main trigger was reintroduced.
- The three baseline E2E failures unchanged (re-audited in STEP-29-05).

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort|STEP-29-03 Ship packaging matrix for mac linux and windows best-effort]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
