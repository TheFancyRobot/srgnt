---
note_type: decision
template_version: 2
contract_version: 1
title: Freeze renderer stack and routing contract for desktop v1
decision_id: DEC-0009
status: proposed
decided_on: '2026-03-22'
owner: ''
created: '2026-03-22'
updated: '2026-03-22'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]'
  - '[[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]'
  - '[[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]]'
  - '[[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]]'
  - '[[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04 Add Navigation Skeleton And Settings Surfaces]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
tags:
  - agent-vault
  - decision
---

# DEC-0009 - Freeze renderer stack and routing contract for desktop v1

Seed the renderer-shell contract before Phase 02 scaffolding turns its current assumptions into accidental architecture. Several downstream notes already assume React in `packages/desktop/renderer/` and in-renderer routing; this proposal makes that contract explicit and reviewable.

## Status

- Current status: proposed.
- Keep this section aligned with the `status` frontmatter value.

## Context

- Phase 00 calls out a missing ADR for the renderer stack and route contract because later desktop steps already depend on a shared UI-shell assumption.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01]] freezes `packages/desktop/renderer/` as React + TypeScript unless a decision note says otherwise.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04]] also resolves the canonical v1 surfaces to Today, Calendar, Connector Management, and Settings, with in-renderer routing.
- Without a dedicated ADR, the package layout, route list, and preload boundary could drift step by step instead of being treated as one intentional contract.

## Decision

- Proposed direction: the desktop renderer lives in `packages/desktop/renderer/` and uses React + TypeScript as the default UI stack for v1.
- The renderer owns presentation, client-side route composition, and UI-only state. Privileged capabilities, filesystem access, auth secrets, PTY hosting, and side-effectful integrations remain outside the renderer behind preload-mediated typed IPC.
- Use in-renderer routing, not multi-window navigation, as the default shell pattern for v1.
- The canonical v1 top-level routes are:
  - `today`
  - `calendar`
  - `connectors`
  - `settings`
- Future surfaces may be added later, but they should fit this shell without forcing a rewrite of the route model or privileged boundary.
- This proposal does not yet decide a state-management library, CSS system, component library, or SSR strategy.

## Alternatives Considered

- Use another renderer framework such as Vue or Svelte. Rejected for now because downstream notes already assume React and changing stacks would create avoidable churn before code exists.
- Avoid a router and switch views with local component state. Rejected because the app already has multiple durable top-level surfaces and later workflow deep links will benefit from explicit routes.
- Use multiple Electron windows for primary navigation. Rejected because v1 needs a single desktop shell with a coherent sidebar and preload boundary.
- Put more business logic in the renderer for convenience. Rejected because it weakens the main/preload trust boundary defined in Phase 02.

## Tradeoffs

- Pro: gives every Phase 02-06 UI step one stable shell and route vocabulary.
- Pro: keeps security boundaries crisp by treating the renderer as a consumer of narrow typed capabilities.
- Pro: React + client-side routing is a common Electron path and lowers onboarding cost for junior implementers.
- Con: freezing the stack early reduces flexibility if a later UI framework looks attractive.
- Con: route naming and shell IA must be maintained intentionally as future surfaces are added.
- Con: a React-first assumption may bias later design-system choices unless the contract boundary stays narrow.

## Consequences

- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01]] can treat the React renderer dependency as deliberate instead of incidental.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02]] should keep IPC contract types outside the renderer package and expose only narrow UI-facing capabilities.
- [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04]] should implement only the four canonical routes listed here.
- If future work needs a different framework, multi-window model, or radically different IA, create a superseding ADR before changing package structure or navigation assumptions.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
 - Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
 - Architecture: [[01_Architecture/System_Overview|System Overview]]
 - Downstream step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]]
 - Downstream step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_04_add-navigation-skeleton-and-settings-surfaces|STEP-02-04 Add Navigation Skeleton And Settings Surfaces]]
 - Session: [[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-22 - Created as `proposed`.
<!-- AGENT-END:decision-change-log -->
