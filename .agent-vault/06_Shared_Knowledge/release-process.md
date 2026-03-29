---
note_type: knowledge
title: Release Process
status: active
created: 2026-03-28
updated: 2026-03-28
tags:
  - release
  - distribution
  - electron
---

# Release Process

This document captures the current Phase 08 desktop release path as it exists in code today.

## What Works Now

- `pnpm --filter @srgnt/desktop build` builds main, preload, and renderer bundles.
- `pnpm --filter @srgnt/desktop pack` produces an unpacked Linux bundle used by the packaged smoke test.
- `pnpm --filter @srgnt/desktop test:e2e` validates first-run onboarding, connector flows, settings persistence, crash-log writing, and privileged IPC.
- `pnpm --filter @srgnt/desktop test:e2e:packaged:linux` validates the packaged Linux launch path.
- `.github/workflows/desktop-release.yml` builds macOS, Windows, and Linux artifacts and forwards signing/update environment variables when they are present.
- `.github/workflows/desktop-release.yml` now runs a dedicated Ubuntu `verify-linux-rc` gate before the cross-platform artifact matrix so release packaging only begins after the canonical repo-side Linux check passes.
- `.github/workflows/desktop-e2e.yml` regenerates release icon assets on clean Linux runners before packaging/test work begins.

## Current Artifact Targets

- Linux AppImage: `pnpm --filter @srgnt/desktop dist:linux`
- Fedora local RPM: `pnpm --filter @srgnt/desktop dist:rpm:fedora`
- macOS: DMG via `pnpm --filter @srgnt/desktop dist:mac`
- Windows: NSIS installer via `pnpm --filter @srgnt/desktop dist:win`

Release-specific icon assets are now generated from `packages/desktop/build/icon.svg` and wired into the Electron builder outputs. Visual icon verification on macOS and Windows is still a manual QA follow-up.

## Packaging Commands

```bash
pnpm install
pnpm --filter @srgnt/desktop build:icons
pnpm --filter @srgnt/contracts build
pnpm --filter @srgnt/desktop build
pnpm --filter @srgnt/desktop test
pnpm --filter @srgnt/desktop test:e2e
pnpm --filter @srgnt/desktop test:e2e:packaged:linux

# Artifact builds
pnpm --filter @srgnt/desktop dist:linux
pnpm --filter @srgnt/desktop dist:rpm:fedora
pnpm --filter @srgnt/desktop dist:mac
pnpm --filter @srgnt/desktop dist:win
```

Repo-side release-candidate shortcuts:

```bash
pnpm run release:check:repo
pnpm run release:artifacts:linux
pnpm run release:rc:linux
```

- `release:check:repo` is the canonical repo-only gate before external platform sign-off.
- `release:artifacts:linux` builds the Linux artifacts without re-running the whole test matrix.
- `release:rc:linux` combines both so the repo can reach a release-candidate state pending macOS/Windows validation.
- `release:rc:linux` was validated end to end on 2026-03-29.

## Icon Assets

- Source wordmark: `packages/desktop/build/logo-full.svg`
- Source app icon: `packages/desktop/build/icon.svg`
- Generated packaging assets: `packages/desktop/build/icon.icns`, `packages/desktop/build/icon.ico`, `packages/desktop/build/icon.png`, and `packages/desktop/build/icons/*.png`
- Regenerate with: `pnpm --filter @srgnt/desktop build:icons`

## Fedora Local RPM Prerequisites

For local RPM builds on Fedora, install the host tools/libraries once:

```bash
sudo dnf install libxcrypt-compat rpm-build
```

`dist:rpm:fedora` uses `electron-builder --dir` to create `release/linux-unpacked/`, then packages that unpacked app through a Fedora-native `rpmbuild` spec. This avoids the current `electron-builder` + `fpm` RPM failure path on Fedora.

## Update Checks

The app now exposes a manual and background update check path through the main process.

- Development builds always report `skipped`.
- Packaged builds check for updates only when one of these configurations exists:
  - `SRGNT_UPDATE_URL` for a generic provider
  - `SRGNT_UPDATE_OWNER` and `SRGNT_UPDATE_REPO` for GitHub Releases
- The selected channel comes from the persisted desktop settings (`stable`, `beta`, or `nightly`).
- `electron-updater` is present, but production release publishing is still an explicit follow-up task; the current repo validates the check path and channel plumbing, not a live hosted feed.

## Signing And Release Environment

These environment variables are wired through the release workflow when available:

- macOS: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- Windows: `CSC_LINK`, `CSC_KEY_PASSWORD`
- Updates: `SRGNT_UPDATE_OWNER`, `SRGNT_UPDATE_REPO`, or `SRGNT_UPDATE_URL`

Local development builds do not require signing credentials.

The desktop package metadata now uses:

- homepage: `https://srgnt.app`
- maintainer/vendor email: `hello@srgnt.app`

## Near-Term Publication Flow

- CI builds and uploads platform artifacts, but human release approval remains the near-term source of truth.
- After a candidate passes the go/no-go checks, the operator should create a draft GitHub Release, attach the validated artifacts, and publish it manually.
- Update-feed publishing should stay coupled to that manual release step until notarization, Windows signing, and cross-platform installer validation are all routinely exercised.
- Real-machine validation should follow [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]] so Windows, macOS x86_64, macOS arm64, and Linux `.deb` runs are recorded consistently.

## Known Gaps

- GitHub Actions currently uploads built artifacts; publishing a GitHub Release is intentionally still manual in the near term.
- `electron-builder`'s built-in RPM path still fails on Fedora, so the repo now uses a dedicated Fedora RPM script instead of the bundled `fpm` route.
- Notarization validation and Windows SmartScreen validation still need real release credentials and operator review.

## Go/No-Go Checks

- [ ] `pnpm test` passes at the workspace level
- [ ] Desktop E2E passes
- [ ] Packaged Linux smoke passes
- [ ] Artifact build command for the target platform completes
- [ ] Signing/env gaps are documented for the candidate build
- [ ] `release-qa-checklist.md` is updated with current PASS/FLAG/BLOCKED statuses

For Linux release-candidate prep, `pnpm run release:rc:linux` is now the canonical combined command.

## Related Notes

- [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]]
- [[04_Decisions/DEC-0011_standardize-packaging-updates-and-release-channels-for-desktop-v1|DEC-0011 Packaging, updates, and release channels for desktop v1]]
- [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]
