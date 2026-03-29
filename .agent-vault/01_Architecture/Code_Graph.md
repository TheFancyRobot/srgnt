---
note_type: architecture
template_version: 2
contract_version: 1
title: Code Graph
architecture_id: "ARCH-0006"
status: active
owner: ""
reviewed_on: "2026-03-21"
created: "2026-03-21"
updated: "2026-03-21"
related_notes:
  - "[[01_Architecture/Code_Map|Code Map]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# Code Graph

## Purpose

- Map exported symbols (functions, classes, types, interfaces) to their source files.
- Enable agents and engineers to locate relevant code by symbol name without searching.
- Auto-generated during vault initialization; refresh by re-running `vault init`.

## Overview

- Repository: srgnt
- Files indexed: 0
- Symbols found: 0

## Key Components

- See **Exports by File** below for the full symbol index grouped by directory.

## Important Paths

- All indexed source files are listed in the Exports by File section with line-level symbol locations.

## Constraints

- Auto-generated during vault initialization; do not hand-edit.
- Refresh by re-running `vault init`.
- Files larger than 500 KB and common generated/test files are excluded.

## Failure Modes

- If source files are added outside the supported language set, they will not appear in this graph.
- Deeply nested files (beyond 8 levels) are skipped.

## Exports by File

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:architecture-related-notes -->
