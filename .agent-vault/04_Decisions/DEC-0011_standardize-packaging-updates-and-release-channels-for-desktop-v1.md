---
note_type: decision
template_version: 2
contract_version: 1
title: Standardize packaging, updates, and release channels for desktop v1
decision_id: DEC-0011
status: accepted
decided_on: '2026-03-22'
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]'
  - '[[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]'
  - '[[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]]'
  - '[[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004 Target macOS + Windows + Linux for desktop v1]]'
  - '[[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005 Use pnpm as monorepo package manager]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
tags:
  - agent-vault
  - decision
---

# DEC-0011 - Standardize packaging, updates, and release channels for desktop v1

Seed the Phase 08 release-tooling choice now so packaging and update work starts from an explicit default instead of step-local assumptions. Later hardening notes already point strongly toward the Electron-builder path; this proposal captures that as a proposed ADR.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- The Phase 00 backlog names packaging and update tooling as a decision seed because Phase 08 needs a stable release path rather than an open-ended tooling debate.
- [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01]] already assumes `electron-builder` and `electron-updater` as the default v1 choice unless another decision note says otherwise.
- [[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004]] fixes the three-platform support matrix and [[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005]] fixes the workspace tooling, so release tooling needs to fit both constraints.
- Without a dedicated ADR, CI, packaging config, release channels, and updater provider assumptions could spread across scripts and notes without one canonical explanation.

## Decision

- Accepted direction: use `electron-builder` for packaging/signing configuration and `electron-updater` for update delivery in desktop v1.
- Default release channels are `stable` and `beta`, with local development builds remaining outside the managed updater flow.
- Default update providers should stay simple and auditable: GitHub Releases or an S3-compatible artifact bucket, not a custom updater service.
- Release automation should run through pnpm workspace scripts and CI, with signing and notarization enabled via environment variables rather than hardcoded secrets.
- All three supported desktop platforms from [[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004]] remain first-class targets.
- This proposal does not yet lock a specific CI vendor, signing certificate procurement process, or commercial distribution channel.

## Alternatives Considered

- Use Electron Forge end to end. Rejected for now because the downstream step notes already assume the `electron-builder` ecosystem and updater pairing.
- Build a custom updater service. Rejected because it adds operational complexity before v1 needs it.
- Ship installers only and defer auto-updates entirely. Rejected because Phase 08 explicitly includes update behavior in the hardening goal.
- Target one platform first for packaging. Rejected because [[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004]] already commits to macOS, Windows, and Linux together.

## Tradeoffs

- Pro: aligns with common Electron release tooling and reduces decision churn for Phase 08.
- Pro: keeps updater infrastructure boring and auditable by preferring standard providers.
- Pro: preserves the three-platform target as a first-class release requirement.
- Con: code signing and cross-platform packaging remain operationally heavy even with standard tools.
- Con: `electron-builder` configuration can become dense and platform-specific if not kept disciplined.
- Con: changing release-provider strategy later may require a superseding ADR and migration work.

## Consequences

- [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01]] should treat `electron-builder` plus `electron-updater` as the starting point, not an open comparison exercise.
- Release documentation should describe the stable/beta channel model and the default provider assumptions.
- CI and packaging configs should preserve pnpm workspace commands and keep signing optional for local development.
- If product distribution later requires a different packaging or update stack, create a superseding ADR before changing the hardening docs and build scripts.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
 - Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
 - Architecture: [[01_Architecture/System_Overview|System Overview]]
 - Downstream step: [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]]
 - Related decision: [[04_Decisions/DEC-0004_target-macos-windows-linux-for-desktop-v1|DEC-0004 Target macOS + Windows + Linux for desktop v1]]
 - Related decision: [[04_Decisions/DEC-0005_use-pnpm-as-monorepo-package-manager|DEC-0005 Use pnpm as monorepo package manager]]
 - Session: [[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-22 - Created as `proposed`.
- 2026-03-29 - Accepted after Phase 08 shipped the `electron-builder`/`electron-updater` path, generated release icon assets, and documented the near-term manual GitHub Release publication flow.
<!-- AGENT-END:decision-change-log -->
