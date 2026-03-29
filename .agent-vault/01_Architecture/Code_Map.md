---
note_type: architecture
template_version: 2
contract_version: 1
title: Code Map
architecture_id: "ARCH-0002"
status: active
owner: ""
reviewed_on: "2026-03-20"
created: "2026-03-20"
updated: "2026-03-22"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
  - "[[01_Architecture/Code_Graph|Code Graph]]"
tags:
  - agent-vault
  - architecture
---

# Code Map

## Purpose

- Map the directory structure and key entry points so a new engineer can navigate the codebase quickly.

## Overview

- The top-level repository currently contains only `AGENTS.md` and `.agent-vault/`.
- There are no application packages, source directories, dependency manifests, test suites, or runtime entry points yet.
- Navigation today is note-centric rather than code-centric: engineers move through home notes, architecture notes, shared knowledge, and templates.
- The reserved future code layout is now part of the durable plan even though those paths do not exist yet: `packages/contracts/`, `packages/runtime/`, `packages/desktop/`, `packages/connectors/`, `packages/sync/`, `packages/entitlements/`, `packages/fred/`, and `examples/`.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- `AGENTS.md` - single root instruction file that points work into the vault.
- `.agent-vault/00_Home/` - dashboard and situational-awareness notes.
- `.agent-vault/01_Architecture/` - durable system description, including this code map.
- `.agent-vault/06_Shared_Knowledge/` - reusable workflow and standards notes.
- `.agent-vault/07_Templates/` - note templates that define the expected structure for future records.
- `.agent-vault/01_Architecture/Code_Graph.md` - generated symbol index, currently empty because no source files exist.
- `packages/desktop/` - planned Electron main/preload/renderer package.
- `packages/contracts/`, `packages/runtime/`, and `packages/connectors/` - planned shared product packages for contracts, local runtime, and integrations.
- `packages/sync/`, `packages/entitlements/`, and `packages/fred/` - planned later-phase packages reserved by the roadmap.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `AGENTS.md` - repository bootstrap instructions.
- `.agent-vault/00_Home/` - navigation layer with `Active_Context.md`, indexes, roadmap, and inbox.
- `.agent-vault/01_Architecture/` - canonical location for durable repo understanding.
- `.agent-vault/05_Sessions/` - chronological work logs for future implementation sessions.
- `.agent-vault/06_Shared_Knowledge/` - playbooks, coding standards, and prompts.
- `.agent-vault/07_Templates/` - canonical note contracts used when creating new records.
- `packages/` - planned monorepo root for product code.
- `examples/` - planned worked examples for skills, connectors, and fixtures.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- The repository has no executable entry points to map yet, so this note must stay structural rather than speculative.
- The code graph remains empty until supported source files are added to the repo.
- Directory-level descriptions should stay aligned with the README and note contracts rather than diverge into ad hoc conventions.

## Failure Modes

- New directories may be added without being represented here, making navigation harder for future agents.
- If generated or temporary files are mistaken for durable structure, this map will become noisy and less useful.
- Readers may assume missing code is a scan bug unless the current vault-only state is stated explicitly.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Graph|Code Graph]]
<!-- AGENT-END:architecture-related-notes -->
