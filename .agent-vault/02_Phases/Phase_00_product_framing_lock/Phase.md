---
note_type: phase
template_version: 2
contract_version: 1
title: Product Framing Lock
phase_id: PHASE-00
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on: []
related_architecture:
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
related_decisions:
  - '[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]'
  - '[[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]'
related_bugs: []
tags:
  - agent-vault
  - phase
---

# Phase 00 Product Framing Lock

Freeze the product framing so every later phase targets the same desktop-first `srgnt` product boundary, user language, and v1 command-center wedge.

## Objective

- Align the repo roadmap, planning notes, and durable product language around the source-of-truth framework: desktop-first, workspace-first in user language, local-first, useful without Fred, and focused on the daily command-center wedge.

## Why This Phase Exists

- The framework contains both an early Obsidian-centered framing and a later desktop-first product architecture, while the current home roadmap still describes vault evolution instead of product delivery.
- If framing stays ambiguous, every later contract, package, security boundary, and UX decision will drift.

## Scope

- Reconcile product boundary and terminology across roadmap and phase notes.
- Lock the v1 wedge, target users, non-goals, and measurable success criteria.
- Produce the durable framing outputs the framework calls out: one-pager, ADR backlog, and roadmap inputs.
- Make unresolved questions explicit instead of hiding them in chat history.

## Non-Goals

- Implementing the repo skeleton, Electron shell, runtime packages, or connectors.
- Settling detailed package-manager, index-engine, or sync-backend choices before the framing outputs exist.

## Dependencies

- `[[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]` is the planning source of truth.
- `[[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]` already resolves the biggest framing ambiguity for implementation planning.
- `[[01_Architecture/System_Overview|System Overview]]` and `[[01_Architecture/Code_Map|Code Map]]` still document the original pre-implementation context, but this phase remains documentation-first even now that later code exists.

## Acceptance Criteria

- [x] Roadmap and phase notes describe the product as a desktop-first, local-first workspace product rather than a vault-maintenance program.
- [x] The v1 wedge, target users, non-goals, and success criteria are explicit and reusable by later phases.
- [x] Open questions that materially affect later implementation are recorded as assumptions or blockers.
- [x] Phase 01 and later milestones have a stable framing input instead of inheriting conflicting terminology.
- [x] Durable framing artifacts exist: terminology rules, wedge definition, one-pager, and the seeded ADR backlog for remaining implementation decisions.

## Linear Context

<!-- AGENT-START:phase-linear-context -->
- Previous phase: none.
- Current phase status: completed
- Next phase: [[02_Phases/Phase_01_foundation_contracts/Phase|PHASE-01 Foundation Contracts]]
<!-- AGENT-END:phase-linear-context -->

## Related Architecture

<!-- AGENT-START:phase-related-architecture -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
<!-- AGENT-END:phase-related-architecture -->

## Related Decisions

<!-- AGENT-START:phase-related-decisions -->
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[04_Decisions/DEC-0003_teams-first-slack-second-for-messaging-connector|DEC-0003 Teams first, Slack second for messaging connector]]
<!-- AGENT-END:phase-related-decisions -->

## Related Bugs

<!-- AGENT-START:phase-related-bugs -->
- No linked bug notes yet.
<!-- AGENT-END:phase-related-bugs -->

## Steps

<!-- AGENT-START:phase-steps -->
- [x] [[02_Phases/Phase_00_product_framing_lock/Steps/Step_01_reconcile-product-boundary-and-terminology|STEP-00-01 Reconcile Product Boundary And Terminology]] - Completed; roadmap and planning language now align with the desktop-first workspace boundary.
- [x] [[02_Phases/Phase_00_product_framing_lock/Steps/Step_02_lock-v1-wedge-users-and-success-criteria|STEP-00-02 Lock V1 Wedge Users And Success Criteria]] - Completed; the v1 command-center wedge is frozen in durable notes.
- [x] [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]] - Completed; the framing package and ADR backlog now feed downstream phases.
<!-- AGENT-END:phase-steps -->

## Notes

- The framing package is complete: the one-pager, terminology rules, wedge definition, and roadmap inputs all point at the desktop-first local-first product boundary.
- Downstream implementation now consistently uses the command-center language frozen here, including the Teams-first connector choice and Fred-optional product posture.
- This phase stays documentation-first by design; no linked bug notes are needed until framing contradictions reappear in code or roadmap artifacts.
