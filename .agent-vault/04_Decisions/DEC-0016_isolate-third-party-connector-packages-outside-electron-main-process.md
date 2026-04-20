---
note_type: decision
template_version: 2
contract_version: 1
title: Isolate third-party connector packages outside Electron main process
decision_id: DEC-0016
status: accepted
decided_on: '2026-04-19'
owner: team-lead
created: '2026-04-19'
updated: '2026-04-19'
supersedes: []
superseded_by: []
related_notes:
  - '[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]'
tags:
  - agent-vault
  - decision
---

# DEC-0016 - Isolate third-party connector packages outside Electron main process

Use one note per durable choice in \`04_Decisions/\`. This note is the source of truth for one decision and its supersession history. A good decision note explains not only what was chosen, but why other reasonable options were not chosen. Link each decision to the phase, bug, or architecture note that made the choice necessary; use [[07_Templates/Phase_Template|Phase Template]], [[07_Templates/Bug_Template|Bug Template]], and [[07_Templates/Architecture_Template|Architecture Template]] as the companion records.

## Status

- Current status: accepted.
- This decision fixes the default v1 execution model for remote third-party connector packages.

## Context

- Phase 20 adds remote CLI installation and executable connector package loading for third-party developers.
- The current app only fetches and validates remote manifest/package JSON in desktop main; it does **not** yet execute third-party connector code.
- If remote packages are loaded directly into the Electron main process, remote install becomes a privileged code-trust event with a much larger blast radius.
- The [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]] already recommends least privilege, explicit capability disclosure, and avoiding unrestricted arbitrary plugin trust.
- [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]] also means token storage, callback handling, and secure-store access must remain host-owned.

## Decision

- Remote **third-party** connector packages must run outside the Electron main process by default in a constrained worker or subprocess boundary.
- The Electron main process remains the privileged host for:
  - package install/remove/verification state;
  - OS secure storage and secrets;
  - auth/session orchestration;
  - typed IPC exposure to preload/renderer;
  - narrow capability-based host APIs exposed to the isolated connector runtime.
- Built-in first-party connectors may continue to use existing main-process-hosted behavior temporarily during migration, but the public third-party contract must target the isolated boundary, not privileged main-process execution.
- Renderer and preload must never execute remote connector package code.

## Alternatives Considered

- **Load remote packages directly in Electron main.** Rejected because it turns remote install into privileged code execution and weakens the secret and OS boundary.
- **Keep all connectors in main for v1, add isolation later.** Rejected because the public factory contract would be designed around the wrong trust model and would be expensive to retrofit safely.
- **Support both isolated and in-main execution for third parties.** Rejected for v1 because dual trust models would complicate the package contract, tests, and user-facing safety guarantees.

## Tradeoffs

- **Pros**
  - Better blast-radius control for third-party package crashes or misuse.
  - Cleaner separation between package logic and privileged host services.
  - Stronger alignment with future signed/curated package distribution and least-privilege permission disclosure.
- **Cons**
  - More implementation work in Phase 20 because loader, lifecycle, and diagnostics must cross a process boundary.
  - Slightly higher complexity for debugging and test orchestration.
  - Some built-in connector conveniences may need adapters rather than direct reuse.

## Consequences

- Phase 20 step notes must treat subprocess/worker isolation as the default third-party execution target.
- Package contracts must be explicit about runtime API version, declared capabilities, and host-provided services.
- Install, verified, activated, loaded, connected, and errored must remain separate inspectable states.
- Tests must cover isolation-specific failure modes such as worker/subprocess startup failure, handshake/version mismatch, crash recovery, and uninstall cleanup.
- Any future decision to allow privileged in-main execution for third-party packages would require a new superseding decision.

## Related Notes

<!-- AGENT-START:decision-related-notes -->
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- Architecture: [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]]
- Security: [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- Decision: [[04_Decisions/DEC-0010_use-shared-microsoft-auth-boundary-with-main-process-secret-storage|DEC-0010 Shared Microsoft auth boundary with main-process secret storage]]
<!-- AGENT-END:decision-related-notes -->

## Change Log

<!-- AGENT-START:decision-change-log -->
- 2026-04-19 - Created as `proposed`.
- 2026-04-19 - Accepted: remote third-party connector packages must run in a constrained worker/subprocess boundary rather than Electron main.
<!-- AGENT-END:decision-change-log -->
