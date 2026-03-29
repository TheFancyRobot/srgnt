---
note_type: architecture
template_version: 2
contract_version: 1
title: Domain Model
architecture_id: "ARCH-0004"
status: active
owner: ""
reviewed_on: "2026-03-20"
created: "2026-03-20"
updated: "2026-03-22"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# Domain Model

## Purpose

- Describe the core domain concepts, their relationships, and the vocabulary used across the codebase.

## Overview

- The current domain is not an application domain yet; it is the operating model for repository memory and agent collaboration.
- Core concepts are note types and their ownership boundaries: architecture notes explain systems, phase and step notes plan work, bug and decision notes preserve durable history, and session notes capture chronology.
- The domain vocabulary is defined primarily by `AGENTS.md`, `.agent-vault/README.md`, and `.agent-vault/07_Templates/Note_Contracts.md`.
- The planned product domain is now explicit enough to guide later phases: `Workspace`, `Artifact`, `Connector`, `CanonicalEntity`, `Skill`, `SkillRun`, `Approval`, `LaunchContext`, `SyncPayload`, and `Entitlement` are the core cross-phase concepts.
- `Fred` is a premium orchestration surface layered on top of the base product domain, not a replacement for the base workflow model.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- `home_context` notes summarize current focus and route readers to the next canonical note.
- `architecture` notes hold durable explanations of structure, constraints, workflows, and boundaries.
- `phase` and `step` notes describe bounded work and executable tasks once project implementation begins.
- `bug` and `decision` notes preserve durable defect forensics and architectural choices.
- `session` notes provide chronological logs that should promote lasting findings into the owning durable note.
- `workspace` is the authoritative local data boundary for product content and framework-managed records.
- `canonical_entity`, `connector`, `artifact`, and `skill_run` are the planned shared runtime concepts that later code packages must agree on.
- `approval`, `launch_context`, `sync_payload`, and `entitlement` are planned control-plane concepts that protect security, auditability, continuity, and premium separation.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `.agent-vault/00_Home/Active_Context.md` - current operating state for the repo.
- `.agent-vault/01_Architecture/` - durable descriptions of structure and behavior.
- `.agent-vault/02_Phases/` - bounded work planning space for future milestones.
- `.agent-vault/03_Bugs/` - defect records.
- `.agent-vault/04_Decisions/` - ADR-style decision history.
- `.agent-vault/05_Sessions/` - per-run execution logs and handoff state.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Each fact should live in one canonical note type; indexes and home notes should point to truth instead of duplicating it.
- Session notes are chronological, not canonical: durable findings must be promoted into architecture, bug, or decision notes.
- Until business code exists, the domain model should stay focused on repository knowledge flows rather than invent future product entities.
- Planned product entities should stay aligned with the framework note and Phase 01 contracts rather than drift into provider-specific vocabulary.
- Premium, sync, and telemetry concepts must remain additive layers on top of the base workspace model, not alternate sources of truth.

## Failure Modes

- Facts can become fragmented when the same information is copied into dashboards, sessions, and architecture notes.
- Orphaned notes weaken the graph and make the domain harder to traverse safely.
- Future product concepts may get mixed with vault process concepts if ownership boundaries are not kept explicit.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:architecture-related-notes -->
