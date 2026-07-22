# Execution Brief

## Why This Step Exists

The app cannot ship until it packages into installable artifacts that actually run the
new ACP/harness features — not just boot to onboarding. The existing electron-builder
setup was smoke-verified for the pre-pivot shell (Linux packaged E2E in
`packaged.spec.ts`; ad-hoc mac boot in STEP-21-03). It has NOT been verified to run a
harness-backed session inside a packaged build, and that is exactly where the highest
packaging risk lives (see the ESM constraint below). This step turns "it builds" into
"the packaged app runs a real session on mac + linux, with Windows produced
best-effort."

## The Critical Packaging Constraint (read first — do not skip)

`@srgnt/harness` is ESM-only (`"type": "module"`); desktop-main compiles to CommonJS.
A static `import` or a tsc `import()` (downleveled to `require()` under
`module: commonjs`) would `require()` an ESM package and throw `ERR_REQUIRE_ESM`. The
shipped workaround is a genuine dynamic import hidden from the CJS transform:
`Function('return import("@srgnt/harness")')()` in
`packages/desktop/src/main/dev-console/session-controller.ts` (lines ~14-30, memoized,
only on the flag-on path). Phases 23+ reuse this pattern to load the harness from main.

**Why this matters for packaging:** the packaged Electron ships its OWN bundled Node,
which can differ from your dev Node in how `require(ESM)` behaves. `tsc`/`build`/
`typecheck` success does NOT catch a `require(ESM)` crash — it only appears when the
packaged binary actually tries to load `@srgnt/harness` and open a session. Therefore
the packaged smoke MUST launch the packaged app and drive a REAL harness-backed session
(open a mock-agent session, send a prompt, see a response), not merely assert onboarding
renders. This is an explicit acceptance check, not optional.

The current `packaged.spec.ts` does NOT do this — it only asserts the onboarding heading
and that `isPackaged === true`. Extending it to open a session is the core work of this
step.

### Exactly what the automated smoke covers (and what it does not)

Be precise about coverage, because the honest scope is narrower than "the packaged app":

- **Automated, CI-gating: `release/linux-unpacked/srgnt` only.** That is the one binary
  `test:e2e:packaged:linux` launches. It proves the ESM load path and the bundled bus
  server inside the electron-builder *unpacked Linux output* — which is the same
  `app.asar` the AppImage and the rpm wrap, so it is a strong proxy, but it is a proxy.
- **Not automatically exercised, and no acceptance criterion may claim otherwise:** an
  extracted/mounted AppImage, an installed rpm, an installed macOS dmg (either arch),
  and an installed Windows NSIS build. None of these is launched by any test in this
  step.
- **Bridging the gap is manual and recorded, not assumed.** The mac dmg install +
  mock-session smoke is a **required manual check with a recorded result** before
  release (mac is a shipping target and its asar is built by a different job than the
  Linux one). AppImage and rpm each get a manual launch-and-open-a-session check
  recorded once per release. Windows stays best-effort and explicitly ungated.
- If a future session wants any of these gated, the work is adding a per-target smoke
  job — not widening the wording of the existing one.

## What "Done" Looks Like

- macOS: dmg for x64 + arm64 (already configured) builds, and the installed dmg runs a
  harness-backed mock session — verified by the **recorded manual check**, since no
  automated job launches a mac artifact.
- Linux: AppImage (configured) + Fedora rpm (`scripts/build-fedora-rpm.sh`) build, and
  the release workflow's Linux leg produces **both** (today it produces only the
  AppImage — see the workflow defects below); the Linux packaged E2E
  (`test:e2e:packaged:linux`) is extended to exercise a real harness session against
  `release/linux-unpacked/srgnt` and is green in CI. The AppImage and rpm are *built*
  and *manually* smoked, not covered by that automated run.
- Windows: NSIS x64 build produced best-effort — which requires the release workflow's
  Windows leg to actually reach `dist:win` (it does not today); stdio/ConPTY/path
  caveats documented in TESTING.md (or a packaging doc). It is NOT gated on a passing
  Windows session smoke (untested on the dev machine).
- The bundled bus MCP server executable (Phase 27 `packages/harness/src/groups/
  bus-server/bin.ts`, compiled) is verified **launchable** in the Linux unpacked build
  by the automated smoke, and verified **present in the packaged payload** for every
  other artifact by a static check (list the artifact's `app.asar`/resources and assert
  the bin path exists). Launchability elsewhere is covered by the recorded manual
  checks, not claimed by any test — see "Bundled bus server" below.

## Bundled bus server (do not miss)

The bus tier-1 design ships an app-bundled stdio executable that the GroupBroker spawns.
electron-builder's `files` currently packs only `dist/**/*` + `package.json` from the
desktop package. The compiled bus-server bin lives in `@srgnt/harness`'s dist, which is
a workspace dependency — confirm it is actually included in the asar (or unpacked via
`asarUnpack`/`extraResources` if it must be spawned as a child process; spawned Node
binaries generally must be OUTSIDE the asar). Add a packaged check that the bus server
path resolves and launches. This interacts with the ESM constraint (the bin is ESM too).

## Prerequisites

- Phases 23-28 feature-complete (chat, persistence, harness settings, groups, bus,
  pipelines) — packaging hardens them; it does not build them.
- STEP-29-02 merged (virtualization/settings must not regress packaged perf/behavior).
- Local toolchains: rpmbuild for the Fedora rpm (Linux); macOS host for dmg;
  Windows host/VM only if attempting the Windows session smoke (otherwise best-effort
  build via CI matrix).

## Relevant Code Paths

- `packages/desktop/package.json` — the `build` block (electron-builder): `appId`
  `app.srgnt`, `artifactName` `srgnt-${version}-${os}-${arch}.${ext}`, `files:
  ["dist/**/*","package.json"]`, mac dmg x64+arm64, linux AppImage x64, win nsis x64,
  nsis opts. Also the `dist:mac|linux|win`, `pack`, `dist:rpm:fedora` scripts.
- `packages/desktop/scripts/build-fedora-rpm.sh` — stages `release/linux-unpacked`
  into an rpm. NOTE its spec declares `License: UNLICENSED` (line 73) — flag to
  STEP-29-04, which owns the LICENSE decision (LICENSE.md is BSL 1.1).
- `packages/desktop/e2e/packaged.spec.ts` — Linux-only (`test.skip` off Linux);
  extend to drive a harness session. `e2e/fixtures.ts` provides
  `getElectronLaunchArgs/Env`, `waitForDesktopReady`, `completeOnboarding`.
- `.github/workflows/desktop-release.yml` — triggers ONLY on `v*` tags +
  `workflow_dispatch` (a deliberate change this session). It runs a `verify-linux-rc`
  gate (`release:check:repo` under xvfb) then a mac/linux/win build matrix.
  **Do NOT re-add `pull_request` or push-to-`main` triggers.** Note the matrix still
  has `if: github.event_name != 'pull_request'` guards left over from the old trigger
  set — harmless but can be simplified since PR no longer triggers this workflow.
  Two **real defects** in the "Build release artifacts" step are this step's work to
  fix (see the checklist):
  - **The Windows leg cannot run today.** That step dispatches with a POSIX
    `case ${{ matrix.platform }} in … esac` block and no `shell:` key. GitHub's default
    shell on `windows-latest` is `pwsh`, which cannot parse `case … esac`, so the
    Windows job fails *before* it ever invokes `dist:win`. The "CI produces the Windows
    build" assumption below is false until this is fixed.
  - **The Linux leg never builds the rpm.** It runs only
    `pnpm --filter @srgnt/desktop dist:linux` (= `electron-builder --linux` → AppImage).
    `dist:rpm:fedora` (`scripts/build-fedora-rpm.sh`) is invoked only by the local
    `release:artifacts:linux` script, so nothing under `packages/desktop/release` that
    CI uploads is ever an rpm. STEP-29-05's artifact check expects one.
- `packages/harness/src/groups/bus-server/bin.ts` (Phase 27) — the bundled executable.

## Smallest Execution Checklist

1. Extend `packaged.spec.ts`: after `completeOnboarding`, open a mock-agent session and
   assert a prompt round-trips (proves `import("@srgnt/harness")` works in the packaged
   Node). This is the anti-`ERR_REQUIRE_ESM` guard.
2. Verify the compiled bus-server bin **launches** in the Linux unpacked build (in the
   automated smoke) and is **present** in every other artifact's packaged payload (a
   static listing assertion); add `asarUnpack`/`extraResources` config if it is not
   spawnable from inside the asar.
3. Build each target locally where possible: `pnpm --filter @srgnt/desktop dist:mac`
   (mac host), `dist:linux` + `dist:rpm:fedora` (Linux host), `dist:win` (best-effort).
4. **Fix the Windows dispatch in `.github/workflows/desktop-release.yml`.** The
   "Build release artifacts" step's `case … esac` block is POSIX shell running under
   `pwsh` on `windows-latest`. Either add `shell: bash` to that step (Git Bash ships on
   the Windows runner — the one-line fix) or replace the block with three
   `if: matrix.platform == '…'` steps each running its own `dist:*` script (the more
   readable fix, and it removes the shell question entirely). Prefer the per-platform
   steps. Until this lands, "CI produces the Windows build" is aspirational.
5. **Add the rpm to the Linux leg of the same workflow**, so the artifact set CI
   uploads matches what STEP-29-05 checks: install the toolchain the script needs
   (`sudo apt-get install -y rpm` alongside the existing Linux desktop deps — the
   runner has no `rpmbuild` by default) and run `dist:rpm:fedora` after `dist:linux`
   on the Linux platform only. Order matters: `build-fedora-rpm.sh` stages
   `release/linux-unpacked/`, which `dist:linux` produces. If the rpm build proves
   unreliable on `ubuntu-latest`, do not leave it half-wired — make it non-blocking
   (`continue-on-error`) **and** say so in the release checklist so STEP-29-05 can
   scope its artifact check to "rpm built out-of-band on a Fedora host" instead.
   Record whichever way it goes in Implementation Notes; STEP-29-05 must agree.
6. Document Windows caveats (stdio agent spawning, ConPTY/node-pty behavior, path
   handling in HarnessDefinitions) in TESTING.md; do not gate release on Windows.
7. Do NOT touch the release-workflow triggers except optional cleanup of the now-dead
   `!= 'pull_request'` guards. Steps 4-5 change the *job body*, never the trigger set.

## Assumptions / Decision-Needed

- ASSUMPTION: the packaged session smoke uses the mock agent (deterministic, no spend,
  no external binary) — that is sufficient to prove the ESM load path in the packaged
  Node. A real Pi/opencode packaged session is a manual, non-gating check.
- ASSUMPTION: Windows stays best-effort/untested on the dev machine (darwin); its
  build is produced by the CI matrix but not session-smoked. This holds only after
  checklist item 4 — the Windows leg's `case … esac` dispatch currently fails under
  `pwsh` before `dist:win` runs, so "CI produces it" is something this step must make
  true, not something it may assume.
- DECISION-NEEDED: whether the bus-server bin ships via `asarUnpack` (kept in asar but
  unpacked for spawn) or `extraResources`. Default: `asarUnpack` for the harness bin
  path, verified by the packaged launch check. Record the outcome.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort|STEP-29-03 Ship packaging matrix for mac linux and windows best-effort]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]] (bus tier-1 / bundled server)
