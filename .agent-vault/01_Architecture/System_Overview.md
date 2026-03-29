---
note_type: architecture
template_version: 2
contract_version: 1
title: System Overview
architecture_id: "ARCH-0001"
status: active
owner: ""
reviewed_on: "2026-03-20"
created: "2026-03-20"
updated: "2026-03-22"
related_notes:
  - "[[01_Architecture/Domain_Model|Domain Model]]"
  - "[[01_Architecture/Code_Map|Code Map]]"
  - "[[01_Architecture/Integration_Map|Integration Map]]"
  - "[[01_Architecture/Agent_Workflow|Agent Workflow]]"
tags:
  - agent-vault
  - architecture
---

# System Overview

## Purpose

- Explain the top-level shape of the repository and the boundaries that future changes should preserve.

## Overview

- `srgnt` is currently a vault-first repository: the only top-level artifacts are `AGENTS.md` and `.agent-vault/`.
- There is no application, library, build, test, or CI code checked in yet, so the system architecture is the documentation and workflow structure created by Agent Vault.
- The repository's main responsibility today is to preserve durable context for future implementation work without turning the vault into the source of truth for code.
- The planned product architecture is now stable enough to name explicitly in vault context: a desktop-first Electron app in `packages/desktop/`, shared contracts in `packages/contracts/`, shared runtime code in `packages/runtime/`, connector packages in `packages/connectors/`, and later premium/sync packages under `packages/fred/`, `packages/entitlements/`, and `packages/sync/`.
- The planned trust boundary is also explicit: the Electron main process owns secrets, OS integrations, PTY hosting, and file writes; the renderer consumes only narrow typed IPC through preload.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- `AGENTS.md` is the root entrypoint that tells agents to bootstrap from `00_Home/Active_Context.md` and use Agent Vault MCP tools.
- `00_Home/` contains navigation and operating context such as the dashboard, roadmap, inbox, and generated indexes.
- `01_Architecture/` holds the durable explanation of repository shape, workflows, domain vocabulary, and integrations.
- `06_Shared_Knowledge/` stores stable playbooks and standards that guide future work across sessions.
- `07_Templates/` defines the contracts for phase, step, bug, decision, session, and architecture notes.
- `packages/` is the reserved future code root for the desktop client, contracts, runtime, connectors, sync, and premium surfaces.
- `.command-center/` inside a user workspace is the reserved internal data root for connector state, logs, cache, approvals, and other framework-managed records, while user-facing content stays in normal workspace directories such as `Daily/`, `Projects/`, and `Meetings/`.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `AGENTS.md` - repository-level instructions for using the vault safely.
- `.agent-vault/README.md` - durable explanation of vault purpose, boundaries, and commands.
- `.agent-vault/00_Home/Active_Context.md` - primary bootstrap note for current focus and blockers.
- `.agent-vault/01_Architecture/` - canonical architecture layer for repo understanding.
- `.agent-vault/06_Shared_Knowledge/` - reusable process and standards references.
- `.agent-vault/07_Templates/` - note contracts and starter note shapes.
- `packages/desktop/` - planned Electron main, preload, and renderer package.
- `packages/contracts/` - planned Zod schema and type boundary shared across phases.
- `packages/runtime/` - planned local-first runtime, storage, approvals, and run-history package.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Durable knowledge belongs in the vault, but executable truth must live in code once source files are added.
- Notes should be patched conservatively with stable headings and generated blocks preserved.
- The repository should keep exactly one vault at `.agent-vault/` with no nested project-vault duplication.
- Until real source code exists, architecture notes must describe process and structure without inventing runtime components.
- Planned product notes must preserve the local-first rule: markdown files and workspace directories are authoritative, while indexes and caches are derived state.
- Planned implementation notes must preserve the desktop security rule: renderer code does not access secrets, process spawning, or unrestricted filesystem writes directly.

## Failure Modes

- New source code can land without corresponding architecture updates, leaving the vault misleading.
- Broad manual rewrites can damage generated blocks or note contracts that automation depends on.
- Durable facts can leak into home notes or session logs instead of being promoted into the owning architecture, bug, or decision note.
- Empty scan metadata may be mistaken for a tool failure when it currently reflects the repository's lack of source files.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Domain_Model|Domain Model]]
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
<!-- AGENT-END:architecture-related-notes -->
