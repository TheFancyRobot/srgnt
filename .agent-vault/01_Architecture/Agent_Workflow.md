---
note_type: architecture
template_version: 2
contract_version: 1
title: Agent Workflow
architecture_id: "ARCH-0003"
status: active
owner: ""
reviewed_on: "2026-03-20"
created: "2026-03-20"
updated: "2026-03-20"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# Agent Workflow

## Purpose

- Document how agents interact with the vault and codebase during work sessions.

## Overview

- Agent workflow is defined by `AGENTS.md`, `.agent-vault/README.md`, and the shared playbooks in `06_Shared_Knowledge/`.
- The expected loop is: read active context, follow linked canonical notes, make bounded note or code changes, then refresh and validate the vault.
- Because the repository has no product code yet, current agent work is primarily documentation and structural stewardship rather than implementation.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Bootstrap: start from `.agent-vault/00_Home/Active_Context.md` and only fan out to the notes needed for the task.
- Durable note types: update architecture, bug, decision, phase, and step notes when facts need a long-lived home.
- Shared playbooks: use `.agent-vault/06_Shared_Knowledge/Agent_Workflow_Playbooks.md` for feature, bugfix, refactor, and docs work patterns.
- Validation cycle: refresh home notes after meaningful structural updates and run validation to catch broken links or malformed notes.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `AGENTS.md` - first-touch repository instructions.
- `.agent-vault/00_Home/Active_Context.md` - workflow bootstrap and current scope.
- `.agent-vault/06_Shared_Knowledge/Agent_Workflow_Playbooks.md` - task-specific playbooks.
- `.agent-vault/07_Templates/` - note structures that agents should preserve.
- `.agent-vault/00_Home/Bugs_Index.md` and `.agent-vault/00_Home/Decisions_Index.md` - generated discovery surfaces refreshed after metadata changes.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Agents should prefer the smallest relevant context cluster instead of loading the whole vault.
- Edits must preserve frontmatter, stable headings, and generated block boundaries.
- The root `AGENTS.md` explicitly prefers MCP-managed workflows over ad hoc note rewrites.

## Failure Modes

- Skipping `Active_Context.md` can lead to duplicated work or missing blockers.
- Failing to refresh or validate after structural edits can leave indexes and health signals stale.
- Recording durable facts only in a session log makes the next handoff brittle and easy to miss.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/Agent_Workflow_Playbooks|Agent Workflow Playbooks]]
<!-- AGENT-END:architecture-related-notes -->
