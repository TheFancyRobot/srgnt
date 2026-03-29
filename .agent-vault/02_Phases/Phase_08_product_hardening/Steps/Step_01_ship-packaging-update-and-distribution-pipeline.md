---
note_type: step
template_version: 2
contract_version: 1
title: Ship Packaging Update And Distribution Pipeline
step_id: STEP-08-01
phase: '[[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]'
status: partial
owner: ''
created: '2026-03-21'
updated: '2026-03-28'
depends_on:
  - PHASE-07
related_sessions:
  - '[[05_Sessions/2026-03-28-220219-ship-packaging-update-and-distribution-pipeline|SESSION-2026-03-28-220219 Session for Ship Packaging Update And Distribution Pipeline]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Ship Packaging Update And Distribution Pipeline

Define and implement how the desktop product is built, packaged, updated, and distributed.

## Purpose

- Make release creation and installation reproducible.
- Give later QA and support work a real delivery channel to validate.

## Why This Step Exists

- A working local build is not the same as a shippable product.
- Updater and packaging choices can affect security posture and platform behavior.

## Prerequisites

- Complete [[02_Phases/Phase_07_terminal_integration_hardening/Phase|PHASE-07 Terminal Integration Hardening]].

## Relevant Code Paths

- root workspace build scripts
- `packages/desktop/`
- packaging and release config files chosen in this step
- release QA notes and scripts

## Required Reading

- [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Choose the packaging and update pipeline that fits the Electron shell and the repo tooling chosen earlier.
2. Implement the minimum reproducible build and install path for target desktop platforms.
3. Document release assumptions, signing gaps, and environment-specific limitations explicitly.
4. Validate with a local packaged build and one install/update smoke path if feasible.
5. Update notes with the exact commands, config files, and unresolved distribution risks.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: partial
- Current owner:
- Last touched: 2026-03-28
- Next action: Finish live release publication and installer validation across macOS and Windows.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- This step should freeze release commands the rest of the hardening phase can rely on.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/desktop/electron-builder.config.ts` (or equivalent `electron-builder` config) with targets for macOS (.dmg), Windows (NSIS .exe), and Linux (.AppImage), plus a Fedora-local `.rpm` path
- CI/CD pipeline config (GitHub Actions or equivalent) that builds all three platform artifacts
- Code-signing placeholder configs: macOS Apple notarization env vars, Windows Authenticode env vars, Linux GPG signing config
- Auto-update configuration using `electron-updater` (update server URL, channel config)
- `docs/release-process.md` or equivalent in `.agent-vault/06_Shared_Knowledge/` documenting the exact build commands, signing requirements, and known environment-specific limitations
- Smoke-test script or checklist validating: build succeeds → installer launches → app starts → auto-update check fires

**Key decisions to apply:**
- DEC-0004 (macOS + Windows + Linux, all three first-class) — all three platforms must have working build targets, not just macOS
- DEC-0005 (pnpm monorepo) — build scripts must use pnpm workspace commands, not npm/yarn

**Starting files:**
- `packages/desktop/` must exist with a working Electron main + renderer setup
- `package.json` at root with pnpm workspace config
- PHASE-07 terminal integration must be complete (prerequisite per step note)

**Constraints:**
- `electron-builder` + `electron-updater` are the default v1 packaging choices in this step. If implementation needs to deviate, record a decision note and update the hardening notes before shipping.
- Do NOT implement a custom update server — use electron-updater's built-in GitHub Releases or S3 provider
- Do NOT require real code-signing certificates for local dev builds — signing must be optional via env vars
- Do NOT break the existing dev workflow (`pnpm dev` must still work unchanged)
- Do NOT add platform-specific runtime code to the renderer — all platform branching belongs in main process or build config

**Validation:**
1. Run `pnpm build` — verify it produces packaging jobs or artifacts for macOS, Windows, and Linux from the repo root
2. Install the packaged artifact on the current development platform and confirm the app launches and shows the main window
3. Confirm CI or release automation is configured to build the two non-local target platforms and records PASS/BLOCKED status when that hardware is unavailable locally
5. Verify auto-update config exists (update server URL is set, even if pointing to a placeholder)
6. Verify signing config files exist with env-var placeholders (not hardcoded secrets)
7. Verify release process doc exists and contains exact build commands

**Junior-readiness verdict:** PASS — the execution prompt is clear, electron-builder has extensive documentation, and the deliverables are concrete file artifacts. A junior dev can follow electron-builder setup guides and produce the config. The main risk is platform-specific signing setup, which is mitigated by allowing placeholder configs.

## Human Notes

- Prefer a release path that is easy to audit and automate over one with the fanciest installer experience.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-28 - [[05_Sessions/2026-03-28-220219-ship-packaging-update-and-distribution-pipeline|SESSION-2026-03-28-220219 Session for Ship Packaging Update And Distribution Pipeline]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the app has a reproducible build and distribution path.
- Validation target: packaged build succeeds and install/update behavior is documented.
- Current state: build, pack, AppImage release, packaged smoke coverage, generated platform icon assets, and cross-platform CI artifact builds are working; local Fedora `.rpm` generation now passes through `dist:rpm:fedora`, which uses a dedicated `rpmbuild` script after `electron-builder --dir`. Hosted release publication and live updater feeds remain open.
