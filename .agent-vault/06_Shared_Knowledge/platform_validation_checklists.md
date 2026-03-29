---
note_type: knowledge
title: Platform Validation Checklists
status: active
created: 2026-03-29
tags:
  - release
  - qa
  - validation
  - platforms
---

# Platform Validation Checklists

Use this note when a release candidate is ready for real-machine validation.

These checklists assume the repo-side release gate is already green:

- `pnpm run release:check:repo`
- `pnpm run release:rc:linux` when validating the Linux release candidate path

Record results as `PASS`, `FLAG`, `FAIL`, or `BLOCKED` and copy the outcome back into [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]].

## Common Prep

- Confirm the exact artifact filename, version, commit SHA, and validation date.
- Start from a clean VM or machine snapshot when possible.
- Keep one text log with screenshots for install, first launch, update checks, crash handling, and uninstall.
- Verify the packaged build is signed/notarized if credentials were available for the candidate.
- Test with the network available first, then repeat any offline-safe checks after disconnecting.

## Windows Validation Checklist

Target artifact: NSIS installer (`.exe`) built from `pnpm --filter @srgnt/desktop dist:win`.

### Install And Trust

- [ ] Downloaded installer filename matches the release candidate metadata.
- [ ] Installer launches without corruption or missing-DLL errors.
- [ ] SmartScreen / Defender / publisher prompt behavior is captured.
- [ ] Default install path is sensible and changing the install path works.
- [ ] Start menu and desktop shortcut behavior matches the installer options.

### First Launch

- [ ] App launches from the installer completion screen.
- [ ] App launches again from the Start menu shortcut.
- [ ] Window title, app icon, and taskbar icon render correctly.
- [ ] First-run onboarding appears on a clean profile.
- [ ] `Skip setup` and `Create Workspace` both work.

### Core Product

- [ ] Workspace creation succeeds and enters the main UI.
- [ ] Today, Calendar, Terminal, Connectors, and Settings all load.
- [ ] Settings changes persist after a full app restart.
- [ ] Connector status renders in offline/fixture mode.
- [ ] Terminal launch from the workflow surface succeeds.

### Reliability And Supportability

- [ ] Update check runs and reports either success, no update, or safe provider-missing state.
- [ ] Crash-log write path works if the release candidate exposes the QA utility.
- [ ] Renderer fallback still leaves the app in a recoverable state after a non-fatal test error.
- [ ] Local settings/crash files are written in the expected Windows paths.

### Upgrade And Removal

- [ ] Installing over the previous version preserves workspace settings as expected.
- [ ] Uninstall removes the app cleanly.
- [ ] Shortcuts are removed on uninstall.
- [ ] Residual data paths are documented if they intentionally remain.

## macOS x86_64 Validation Checklist

Target artifact: Intel DMG built from `pnpm --filter @srgnt/desktop dist:mac`.

### Install And Trust

- [ ] DMG opens without corruption warnings.
- [ ] DMG background, app icon, and drag/install affordance render correctly.
- [ ] Gatekeeper / notarization behavior is captured.
- [ ] App copy into `/Applications` works.
- [ ] First launch from Finder and Spotlight both work.

### First Launch

- [ ] Dock icon, menu bar app name, and app switcher label render correctly.
- [ ] First-run onboarding appears on a clean profile.
- [ ] `Skip setup` and `Create Workspace` both work.
- [ ] Closing and relaunching the app preserves onboarding completion state.

### Core Product

- [ ] Today, Calendar, Terminal, Connectors, and Settings all load.
- [ ] Workspace path selection works with native file dialogs.
- [ ] Settings changes persist after a full app restart.
- [ ] Connector fixture/offline mode renders correctly.
- [ ] Terminal launch from the workflow surface succeeds.

### macOS-Specific Checks

- [ ] App requests only the expected permissions.
- [ ] Keyboard shortcuts and focus behavior feel native.
- [ ] Menu bar actions behave correctly after minimize/restore.
- [ ] Update check runs and reports a safe state.

### Upgrade And Removal

- [ ] Replacing the prior app bundle preserves expected user data.
- [ ] Removing the app bundle works cleanly.
- [ ] Any residual files under `~/Library/Application Support` or logs are documented.

## macOS arm64 Validation Checklist

Target artifact: Apple Silicon DMG built from `pnpm --filter @srgnt/desktop dist:mac`.

Run the same checklist as macOS x86_64, plus these architecture-specific checks:

- [ ] App launches natively on Apple Silicon without Rosetta prompts unless explicitly intended.
- [ ] Startup feels normal relative to the Intel build and no architecture mismatch dialogs appear.
- [ ] Native file dialogs, window chrome, and icons render correctly on the Apple Silicon host.
- [ ] Any arm64-only notarization, signing, or quarantine issues are captured separately from Intel results.

## Linux `.deb` Validation Checklist

Target artifact: Debian package (`.deb`) for a future or externally produced Linux release candidate.

Use this checklist when a `.deb` exists; it is intentionally reusable even though the current repo-side artifact path is AppImage plus Fedora RPM.

### Install And Desktop Integration

- [ ] Package installs cleanly with `apt`, `dpkg`, or the intended GUI installer.
- [ ] Dependency errors are captured if they appear.
- [ ] Desktop entry is created and visible in the launcher.
- [ ] App icon renders correctly in the launcher and window chrome.
- [ ] Package metadata (name, version, maintainer) looks correct in the package manager UI.

### First Launch

- [ ] App launches from the desktop launcher.
- [ ] First-run onboarding appears on a clean profile.
- [ ] `Skip setup` and `Create Workspace` both work.
- [ ] Closing and relaunching the app preserves onboarding completion state.

### Core Product

- [ ] Today, Calendar, Terminal, Connectors, and Settings all load.
- [ ] Settings changes persist after a full app restart.
- [ ] Connector fixture/offline mode renders correctly.
- [ ] Terminal launch from the workflow surface succeeds.
- [ ] Update check runs and reports a safe state.

### Package Lifecycle

- [ ] Installing a newer `.deb` upgrades cleanly.
- [ ] Uninstall removes the package cleanly.
- [ ] Purge behavior is documented if config/log files remain.
- [ ] Desktop entry and icons are removed or intentionally retained as documented.

## Results Template

Use this compact template for each platform run:

```md
### <platform> validation - <date>

- Artifact: <filename>
- Machine: <host or VM details>
- Result: PASS | FLAG | FAIL | BLOCKED
- Notes:
  - <key observation>
  - <key observation>
- Evidence:
  - <screenshot path or short description>
```

## Related Notes

- [[06_Shared_Knowledge/release-qa-checklist|Release QA Checklist]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa|STEP-08-03 Polish Onboarding Settings And Release QA]]
