---
note_type: shared_knowledge
title: srgnt Terminology Rules
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - agent-vault
  - shared-knowledge
  - terminology
---

# srgnt Terminology Rules

Use these terms consistently so product planning, roadmap work, and later implementation notes describe the same desktop-first product boundary.

## Core Terms

- `workspace`: The user-owned local working environment for notes, artifacts, connector outputs, and settings. This is the default user-facing term.
- `artifact`: A durable output produced by a workflow, connector, or skill run, such as a daily briefing note, meeting prep note, action list, or run log.
- `connector`: An integration that authenticates to an external system and maps remote data into canonical local entities or artifacts.
- `skill`: A reusable workflow definition with declared inputs, capabilities, outputs, and guardrails.
- `executor`: The runtime surface that carries out a skill step or tool invocation and returns structured results, logs, and status.
- `vault`: Use only for the planning system at `.agent-vault/` or when describing the product's historical Obsidian-inspired origins. Do not use it as the default product term.

## Usage Rules

- In user-facing product copy, prefer `workspace` over `vault`.
- Use `artifact` for inspectable generated outputs, not for transient chat responses.
- Use `connector` for provider integrations such as Jira, Outlook Calendar, and Teams, not for generic plugins.
- Use `skill` for reusable operational procedures, not for one-off prompts.
- Use `executor` when describing the execution layer, especially run contracts, approvals, and logs.
- Keep `.agent-vault/` language clearly separated from the end-user workspace so planning infrastructure is not mistaken for the product itself.

## Historical Note

- The framework started from an Obsidian-centered concept, so older notes may still mention `vault` when explaining the origin story.
- That historical context is valid, but current implementation planning should treat `srgnt` as a desktop-first, local-first workspace product.

## Related Notes

- [[02_Phases/Phase_00_product_framing_lock/Steps/Step_01_reconcile-product-boundary-and-terminology|STEP-00-01 Reconcile Product Boundary And Terminology]]
- [[02_Phases/Phase_00_product_framing_lock/Steps/Step_03_publish-one-pager-adr-backlog-and-roadmap-inputs|STEP-00-03 Publish One Pager ADR Backlog And Roadmap Inputs]]
- [[06_Shared_Knowledge/v1_wedge_definition|V1 Wedge Definition]]
- [[06_Shared_Knowledge/srgnt_one_pager|srgnt One Pager]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
