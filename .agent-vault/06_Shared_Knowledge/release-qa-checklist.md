---
note_type: knowledge
title: Release QA Checklist
status: active
created: 2026-03-28
updated: 2026-03-28
tags:
  - release
  - qa
  - testing
---

# Release QA Checklist

Status key: `PASS` = verified in this repo, `FLAG` = verified with caveats called out, `FAIL` = verified broken, `BLOCKED` = not fully verified yet.

## 1. Packaging

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Clean install | BLOCKED | BLOCKED | BLOCKED |
| Upgrade from previous version | BLOCKED | BLOCKED | BLOCKED |
| Uninstall cleanly | BLOCKED | BLOCKED | BLOCKED |
| Packaged app launches | BLOCKED | BLOCKED | PASS |
| App icon displays correctly | BLOCKED | BLOCKED | BLOCKED |

## 2. Onboarding

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| First-run wizard appears | BLOCKED | BLOCKED | PASS |
| Workspace creation works | BLOCKED | BLOCKED | PASS |
| Can skip onboarding | BLOCKED | BLOCKED | PASS |
| Onboarding state persists | BLOCKED | BLOCKED | PASS |
| `Get Started` enters main UI | BLOCKED | BLOCKED | PASS |

## 3. Connectors

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Teams connector shows status | BLOCKED | BLOCKED | PASS |
| Jira connector shows status | BLOCKED | BLOCKED | PASS |
| Outlook connector shows status | BLOCKED | BLOCKED | PASS |
| Connector state persists in settings | BLOCKED | BLOCKED | PASS |
| Offline fixture mode works | BLOCKED | BLOCKED | PASS |

## 4. Flagship Workflow

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Today view loads | BLOCKED | BLOCKED | PASS |
| Calendar view loads | BLOCKED | BLOCKED | PASS |
| Terminal launches from workflow context | BLOCKED | BLOCKED | PASS |
| Can navigate between views | BLOCKED | BLOCKED | PASS |
| View state persists across restart | BLOCKED | BLOCKED | BLOCKED |

## 5. Terminal Integration

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Terminal surface renders | BLOCKED | BLOCKED | PASS |
| Workflow launch creates a PTY session | BLOCKED | BLOCKED | PASS |
| Resize path works | BLOCKED | BLOCKED | BLOCKED |
| Close terminal works | BLOCKED | BLOCKED | PASS |
| Multiple terminals work | BLOCKED | BLOCKED | BLOCKED |

## 6. Crash Handling

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Error boundary shows fallback | BLOCKED | BLOCKED | PASS |
| Crash log is written locally | BLOCKED | BLOCKED | PASS |
| Crash payload is redacted | BLOCKED | BLOCKED | PASS |
| App remains usable after non-fatal renderer error | BLOCKED | BLOCKED | BLOCKED |

## 7. Auto-Update

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Update check fires | BLOCKED | BLOCKED | PASS |
| Missing provider is reported safely | BLOCKED | BLOCKED | PASS |
| Update channel setting persists | BLOCKED | BLOCKED | PASS |

## Performance Baselines

| Metric | Status | Notes |
|--------|--------|-------|
| Cold start time | FLAG | Packaged Linux build reached the onboarding screen in 1.59s on 2026-03-29; single Fedora dev-host sample only, with no approved threshold yet. |
| Idle memory | FLAG | Packaged Linux build RSS measured 276 MB at onboarding ready and 275 MB after 10s idle on 2026-03-29; baseline captured, but no target threshold is approved yet. |
| Memory after 1hr use | FLAG | Packaged Linux soak on 2026-03-29 finished at 258 MB RSS after 60 minutes (`ready` 275 MB -> `15m` 257 MB -> `30m` 257 MB -> `45m` 258 MB -> `60m` 258 MB); single idle-navigation sample only, but no leak signal was observed. |

## Accessibility

| Check | Result |
|-------|--------|
| Keyboard nav through onboarding/settings | FLAG |
| Screen reader landmark check | FLAG |
| Contrast spot-check | FLAG |

Notes:

- Linux packaged keyboard pass on 2026-03-29: onboarding tabs through `Skip setup` and the current step action button, and Settings tabs through section buttons plus editable inputs/selects.
- Landmark spot-check on 2026-03-29: the app shell now exposes one `main` region plus labeled application/settings navigation regions; dedicated NVDA/VoiceOver verification is still pending.
- Contrast spot-check on 2026-03-29: primary text on light surfaces (18.58:1), secondary text on light surfaces (7.68:1), tertiary text on light surfaces (4.63:1), brand text on brand surfaces (5.58:1), and primary button text on the amber CTA gradient (>=5.08:1) pass; cross-platform visual QA is still pending.

## Evidence

- `pnpm test` passed on 2026-03-28.
- `pnpm --filter @srgnt/desktop test:e2e` passed on 2026-03-28.
- `pnpm --filter @srgnt/desktop test:e2e:packaged:linux` passed on 2026-03-28.
- `pnpm --filter @srgnt/desktop dist:linux` passed on 2026-03-28 and produced the Linux AppImage path.
- `pnpm --filter @srgnt/desktop dist:rpm:fedora` passed on 2026-03-28 and produced `packages/desktop/release/srgnt-0.1.0-fedora-x86_64.rpm`.
- `pnpm --filter @srgnt/desktop run pack` passed on 2026-03-29 and refreshed `packages/desktop/release/linux-unpacked/`.
- `pnpm run release:check:repo` passed on 2026-03-29 and now serves as the canonical repo-side release gate.
- `pnpm run release:artifacts:linux` passed on 2026-03-29 and rebuilt the Linux AppImage plus Fedora RPM from the root release shortcut.
- `pnpm run release:rc:linux` passed on 2026-03-29 and validated the full repo-side Linux release-candidate path end to end.
- Manual Linux packaged startup sample on 2026-03-29: onboarding ready in 1.59s; packaged RSS 276 MB on ready and 275 MB after 10s idle.
- Manual Linux packaged one-hour soak on 2026-03-29: RSS 257 MB at 15m, 257 MB at 30m, 258 MB at 45m, and 258 MB at 60m with no runaway growth observed.
- Manual Linux keyboard/landmark spot-check on 2026-03-29: onboarding and Settings remained keyboard-reachable; app shell exposed one `main` and two labeled `nav` regions.

## Sign-Off

- [x] Every row has an explicit status.
- [x] Blocked areas are called out instead of implied.
- [x] Performance baselines recorded.
- [x] Accessibility audit recorded.
- [x] Repo-side release-candidate commands documented and validated.
- [ ] Release ready: No

## Platform Runbooks

- Use [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]] for the real-machine Windows, macOS x86_64, macOS arm64, and Linux `.deb` passes.
- Copy summarized PASS/FLAG/FAIL/BLOCKED outcomes from those runs back into this matrix.

## Related Notes

- [[02_Phases/Phase_08_product_hardening/Phase|PHASE-08 Product Hardening]]
- [[02_Phases/Phase_08_product_hardening/Steps/Step_03_polish-onboarding-settings-and-release-qa|STEP-08-03 Polish Onboarding Settings And Release QA]]
- [[06_Shared_Knowledge/release-process|Release Process]]
- [[06_Shared_Knowledge/platform_validation_checklists|Platform Validation Checklists]]
