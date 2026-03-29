---
note_type: decision
template_version: 2
contract_version: 1
title: Default crash reporting to local-only redacted logs
decision_id: DEC-0012
status: accepted
decided_on: '2026-03-22'
owner: ''
created: '2026-03-22'
updated: '2026-03-28'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]'
  - '[[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]'
  - '[[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]'
  - '[[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]'
  - '[[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules|STEP-10-02 Specify Fred Integration Boundary And Minimization Rules]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
tags:
  - agent-vault
  - decision
---

# DEC-0012 - Default crash reporting to local-only redacted logs

Seed the crash-reporting posture before hardening, sync, and premium-boundary notes each invent their own privacy assumptions. Step 07 already points strongly toward local-only crash handling; this ADR seed captures that policy as a durable proposed default.

## Status

- Current status: accepted.
- Keep this section aligned with the `status` frontmatter value.

## Context

- The Phase 00 backlog identifies crash-reporting posture as a missing ADR because observability choices affect privacy, sync classification, and future premium AI boundaries.
- [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02]] already scopes v1 to local-only crash logging with mandatory redaction and explicitly defers remote reporting to a future decision note.
- [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01]] and [[02_Phases/Phase_10_premium_fred_preparation/Steps/Step_02_specify-fred-integration-boundary-and-minimization-rules|STEP-10-02]] both need one durable privacy baseline so crash data is classified consistently.
- Without a dedicated ADR, later teams could treat crash reporting as a tooling detail instead of a trust boundary.

## Decision

- Accepted direction: default crash reporting for desktop v1 to local-only, redacted structured logs stored on-device.
- The app may capture enough structured crash metadata to debug failures locally, but it must not transmit crash payloads remotely in v1.
- Redaction is mandatory before persistence: crash payloads must exclude workspace content, raw markdown, user-entered prompt text, connector tokens, OAuth callback parameters, environment variables, and absolute file paths.
- Renderer failures should degrade gracefully through local error boundaries and privileged crash handling, but the resulting evidence remains local unless a future ADR explicitly broadens the policy.
- Any future remote crash or telemetry provider requires a superseding decision that defines opt-in behavior, redaction guarantees, and allowed data classes.
- This proposal does not yet define general product analytics or support-upload workflows beyond crash evidence.

## Alternatives Considered

- Send crash reports to a hosted provider in v1. Rejected because it conflicts with the current local-first and privacy-first posture.
- Capture full raw payloads locally without redaction. Rejected because local-only storage still carries privacy and support risk if sensitive data is written to disk.
- Avoid crash logging entirely. Rejected because Phase 08 needs observable failures and recovery behavior.
- Allow remote reporting as an opt-out default. Rejected because any remote path should require an explicit future decision and user-trust review first.

## Tradeoffs

- Pro: aligns observability with the product's local-first trust posture.
- Pro: gives sync-prep and premium-boundary work a clear rule that crash evidence is local-only unless re-decided.
- Pro: reduces compliance and secret-exposure risk early.
- Con: local-only crash handling gives less immediate operational visibility than hosted tooling.
- Con: redaction utilities must be well-designed or logs may become too sparse to debug.
- Con: a future shift to remote reporting will require explicit policy work rather than a quick tooling swap.

## Consequences

- [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02]] should treat local-only crash logs as the default implementation target.
- [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01]] should classify crash logs as local-only unless a later superseding ADR changes the rule.
- Premium/Fred boundary work should inherit the same redaction and never-capture categories instead of inventing a separate telemetry policy.
- If product needs remote crash collection later, create a superseding ADR that lists allowed event classes, consent model, and redaction guarantees before code is changed.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
 - Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
 - Architecture: [[01_Architecture/Integration_Map|Integration Map]]
 - Downstream step: [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
 - Downstream step: [[02_Phases/Phase_09_sync_preparation/Steps/Step_01_define-data-classification-and-sync-safe-boundaries|STEP-09-01 Define Data Classification And Sync Safe Boundaries]]
 - Session: [[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-22 - Created as `proposed`.
- 2026-03-28 - Accepted after Phase 08 implemented redacted local crash logs and a renderer fallback screen.
<!-- AGENT-END:decision-change-log -->
