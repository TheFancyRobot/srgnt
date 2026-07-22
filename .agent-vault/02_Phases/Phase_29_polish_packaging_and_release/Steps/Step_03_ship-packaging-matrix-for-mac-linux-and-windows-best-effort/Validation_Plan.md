# Validation Plan

## Primary Acceptance Checks

1. **Packaged harness session (the anti-ERR_REQUIRE_ESM guard), scoped to what actually
   runs:** `release/linux-unpacked/srgnt` — the single binary `test:e2e:packaged:linux`
   launches — opens a mock-agent session and a prompt round-trips to a response.
   Build/typecheck success is NOT sufficient; this must run against the packaged
   binary's bundled Node. This check does **not** cover an extracted AppImage, an
   installed rpm, an installed dmg, or an installed NSIS build; those are item 5.
   Maps to the phase criterion "mac + linux packaged builds pass the packaged E2E
   smoke" with that scope made explicit.
2. **Bundled bus server:** launchable in the Linux unpacked build (spawned by the
   automated smoke), and *present* in every other artifact's packaged payload by a
   static listing check. Do not assert launchability where nothing launches it.
3. **Windows build produced** with caveats documented (not session-gated). Concretely:
   a `workflow_dispatch` (or tag) run of `desktop-release.yml` shows the Windows leg
   **executing its build command** — the job log contains the `dist:win` /
   `electron-builder --win` invocation and the step exits 0. A green-because-skipped or
   a shell parse error (`case` / `esac` reported as an unrecognized token by `pwsh`) is
   a failure of this check, not a Windows caveat. Verifiable before a run by inspecting
   the step: it either declares `shell: bash` or is a per-platform step with no POSIX
   syntax in a default-shell block.
4. **Linux leg uploads the rpm as well as the AppImage.** The same workflow run's
   `desktop-release-linux` artifact contains an `*.rpm` and an `*.AppImage`, with
   `rpmbuild` installed in the job and `dist:rpm:fedora` running after `dist:linux`.
   If the decision recorded in Implementation Notes is instead "rpm is built
   out-of-band", this check is dropped **and** STEP-29-05's artifact check is narrowed
   to match in the same change — the two must never disagree about what CI produces.
5. **Per-artifact manual smokes, recorded with results** (this is what keeps item 1's
   narrow scope honest instead of hand-waved): installed macOS dmg (**required** before
   release — mac is a shipping target with no automated artifact launch), extracted
   AppImage, and installed rpm each launched once, onboarding completed, one mock
   session round-tripped. Record pass/fail plus the artifact filename in Implementation
   Notes. Windows NSIS is best-effort and explicitly ungated. A missing record counts
   as not done — "the packaged app works" may only be claimed for artifacts with a
   result recorded here or covered by item 1.

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
  Use a `workflow_dispatch` run (no tag needed) to prove the Windows and Linux legs
  above before the STEP-29-05 tagged rehearsal — do not discover a broken matrix leg
  during the rehearsal.

## What The Packaged Session Smoke Must Assert (concrete)

Scope note: this is the **Linux unpacked** smoke and nothing else. It launches
`release/linux-unpacked/srgnt`; it does not extract an AppImage, install an rpm, mount a
dmg, or run an NSIS installer. The mac/AppImage/rpm equivalents are the recorded manual
checks (Primary Acceptance Check 5).

- Launch `release/linux-unpacked/srgnt` via `electron.launch({ executablePath })` as
  `packaged.spec.ts` already does (the spec self-skips off Linux).
- `completeOnboarding(page)` to reach the app.
- Open a mock-agent chat session, send a prompt, and assert an agent response appears
  (this is the line that exercises `Function('return import("@srgnt/harness")')()` in
  the packaged Node — the ONLY reliable catch for `ERR_REQUIRE_ESM`).
- Assert no `ERR_REQUIRE_ESM` / uncaught main-process error surfaced (check the
  Electron app logs / a renderer error boundary).
- Resolve the bus-server bin path and spawn it once (or assert a group session's broker
  starts) to prove the bundled executable is packaged and runnable **in this artifact**.
  For the other targets, assert only that the bin path exists in the packaged payload.

## Manual Checks

- macOS (**required, not optional** — it is the only coverage a mac artifact gets):
  install the dmg (both arches if possible), launch, run the mock session smoke
  manually. Record `isPackaged: true`, that a session round-trips, and the artifact
  filename.
- Linux AppImage and rpm: extract/install, launch, complete onboarding, round-trip one
  mock session. Record results — the automated smoke runs against `linux-unpacked`, so
  these two artifacts are otherwise unverified.
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
- rpm build fails in CI with `rpmbuild: command not found` — `ubuntu-latest` has no rpm
  toolchain; it must be installed in the Linux leg (`sudo apt-get install -y rpm`)
  before `dist:rpm:fedora`, and the script needs `release/linux-unpacked/` to already
  exist, so it runs *after* `dist:linux`, never instead of it.
- A shell fix that "works" because the step silently no-ops (e.g. an `if:` guard that
  never matches on Windows) — assert the build command appears in the job log, not just
  that the job is green.
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
