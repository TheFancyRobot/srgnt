---
note_type: architecture
template_version: 2
contract_version: 1
title: Integration Map
architecture_id: "ARCH-0005"
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

# Integration Map

## Purpose

- Document external dependencies, APIs, services, and integration boundaries.

## Overview

- The repository has no runtime service integrations, external APIs, or package dependencies yet.
- The main integration surface is operational: agents and humans interact with the local filesystem through Agent Vault conventions and MCP tools.
- Obsidian compatibility is a secondary integration target, but raw Markdown readability remains the primary contract.
- The planned product integration map is now explicit in the vault: Jira, Outlook Calendar, and Microsoft Teams are the first connector set; Electron main/preload is the privileged local boundary; terminal execution is a bounded local integration; sync and Fred remain later additive layers.
- Planned secret-bearing integrations must stay out of the renderer. OAuth flows, token storage, PTY hosting, update checks, and future remote calls belong in main-process or dedicated service packages.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Agent Vault MCP tools provide initialization, scanning, traversal, mutation, refresh, and validation operations.
- `AGENTS.md` and `.agent-vault/README.md` define how repository work should flow into those tools.
- `.agent-vault/.obsidian/` provides optional editor configuration for graph navigation and note ergonomics.
- The filesystem itself is an integration boundary because note paths and wiki links encode relationships between records.
- `packages/desktop/main/` is the planned privileged integration host for OS APIs, secure storage, PTY processes, updater checks, and connector auth callbacks.
- `packages/connectors/` is the planned home for Jira, Outlook Calendar, Teams, and shared auth/session scaffolds.
- `packages/runtime/` is the planned boundary for canonical entities, artifacts, approvals, run logs, and launch context contracts that other integrations must honor.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `AGENTS.md` - root operating contract for agents entering the repo.
- `.agent-vault/README.md` - command and workflow reference for the vault.
- `.agent-vault/.obsidian/` - optional Obsidian workspace settings.
- `.agent-vault/01_Architecture/Agent_Workflow.md` - durable description of the expected operating loop.
- `.agent-vault/07_Templates/Note_Contracts.md` - mutation and structure contract shared across note types.
- `packages/desktop/` - planned Electron main, preload, and renderer integration boundary.
- `packages/connectors/` - planned provider integration packages and shared auth helpers.
- `packages/runtime/` - planned local-first runtime boundary consumed by connectors, workflows, and terminal actions.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Integrations should remain local-first and conservative until the repository contains real application code.
- Any automation must preserve manual edits and operate through bounded mutations.
- Obsidian-specific affordances cannot be required for understanding the vault because raw Markdown remains the baseline interface.
- Planned connector integrations must retain provider raw metadata locally while exposing only canonical entities upward.
- Planned remote or premium integrations must default to minimized, approval-aware access rather than broad workspace access.

## Failure Modes

- If MCP tools are unavailable or bypassed carelessly, note structure can drift from the intended contracts.
- If wiki links and filesystem paths diverge, traversal and human navigation both degrade.
- Future external integrations may be undocumented if this note is not updated as the repository grows beyond vault-only usage.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:architecture-related-notes -->
