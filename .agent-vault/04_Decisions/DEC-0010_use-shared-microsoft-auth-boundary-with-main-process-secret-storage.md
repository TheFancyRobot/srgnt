---
note_type: decision
template_version: 2
contract_version: 1
title: Use shared Microsoft auth boundary with main-process secret storage
decision_id: DEC-0010
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
  - '[[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]'
  - '[[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]]'
  - '[[01_Architecture/Integration_Map|Integration Map]]'
  - '[[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
tags:
  - agent-vault
  - decision
---

# DEC-0010 - Use shared Microsoft auth boundary with main-process secret storage

Seed the shared Microsoft auth boundary before Outlook Calendar and Teams work duplicate token handling or leak secrets across process boundaries. The architecture notes already point toward main-process secret ownership; this proposal turns that direction into a durable ADR candidate.

## Status

- Current status: proposed.
- Keep this section aligned with the `status` frontmatter value.

## Context

- The Phase 00 backlog names Microsoft auth and secret storage as an unresolved cross-phase boundary because both Outlook Calendar and Teams depend on the same Microsoft identity surface.
- [[01_Architecture/Integration_Map|Integration Map]] and Phase 02 notes already state that planned secret-bearing integrations must stay out of the renderer.
- [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01]] explicitly reserves `packages/connectors/shared/microsoft-auth/` for the shared Azure AD path, but there is no dedicated ADR recording the rule.
- Without an explicit decision, per-connector packages could each invent their own OAuth callback handling, token refresh logic, and workspace persistence behavior.

## Decision

- Proposed direction: Outlook Calendar and Teams share one Microsoft auth boundary that runs behind the privileged desktop boundary and stores secrets only in OS secure storage.
- The Electron main process owns OAuth callback handling, token exchange, token refresh, secure-storage reads/writes, and revocation.
- The renderer may request connect, disconnect, or status operations only through preload-mediated typed IPC. It may see non-secret session status such as account label, consent status, scope summary, and last-sync health, but never raw tokens or callback parameters.
- Non-secret connector state may be persisted in workspace files under `.command-center/` when useful for status, recovery, or sync cursors. Secret material must stay outside the workspace.
- Use one shared Microsoft auth module for the common Azure AD flow so Outlook Calendar and Teams reuse token storage, refresh rules, and account selection behavior.
- This proposal does not yet freeze exact OAuth scopes, tenant restrictions, or enterprise admin-consent variants; those remain connector-implementation details unless they change the boundary itself.

## Alternatives Considered

- Build separate auth flows inside each Microsoft connector. Rejected because it duplicates sensitive logic and makes token handling inconsistent.
- Let the renderer hold access tokens for convenience. Rejected because it breaks the trust boundary and increases secret-exposure risk.
- Persist raw tokens in workspace files or app config for portability. Rejected because secrets must stay out of user-visible local data.
- Split token refresh into a background service outside the desktop main process. Rejected for now because the repo does not yet have a second privileged runtime that would justify the extra complexity.

## Tradeoffs

- Pro: one hardened auth path reduces duplication across Outlook and Teams.
- Pro: aligns with the local-first trust boundary that keeps secrets out of the renderer and out of workspace files.
- Pro: simplifies support and revocation because there is one place to inspect account/session state.
- Con: shared Microsoft auth becomes a critical dependency for two connectors and must be designed for reuse instead of speed.
- Con: account-linking and multi-tenant edge cases may surface earlier because one module serves multiple product areas.
- Con: exact UX for connect/reconnect/account switching still needs later implementation detail.

## Consequences

- [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01]] should implement the shared module instead of provider-specific secret flows.
- Workspace persistence notes should explicitly allow non-secret Microsoft session summaries while forbidding tokens in files.
- Connector UI surfaces should expose only safe status fields and actions through preload.
- If a future provider requirement forces a second privileged auth host or different storage backend, create a superseding ADR rather than branching the rule informally.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
 - Phase: [[02_Phases/Phase_00_product_framing_lock/Phase|PHASE-00 Product Framing Lock]]
 - Step: [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
 - Architecture: [[01_Architecture/Integration_Map|Integration Map]]
 - Downstream step: [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]]
 - Downstream step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_03_define-local-workspace-layout-and-persistence-contracts|STEP-02-03 Define Local Workspace Layout And Persistence Contracts]]
 - Session: [[05_Sessions/2026-03-22-024540-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-024540 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-03-22 - Created as `proposed`.
<!-- AGENT-END:decision-change-log -->
