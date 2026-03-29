---
note_type: step
template_version: 2
contract_version: 1
title: Reconcile Product Boundary And Terminology
step_id: STEP-00-01
phase: '[[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on: []
related_sessions:
  - '[[05_Sessions/2026-03-22-021806-reconcile-product-boundary-and-terminology-opencode|SESSION-2026-03-22-021806 OpenCode session for Reconcile Product Boundary And Terminology]]'
  - '[[05_Sessions/2026-03-22-025816-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-025816 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 01 - Reconcile Product Boundary And Terminology

Align roadmap and planning language with the framework's desktop-first product boundary.

## Purpose

- Replace the lingering `vault maintenance` framing with the desktop-first `workspace` product framing where appropriate.
- Document which older Obsidian/vault terms remain historical context only.

## Why This Step Exists

- The framework contains both an early Obsidian-centered narrative and a later desktop-first product architecture.
- Later steps cannot safely choose package, UI, or security boundaries until the planning language is consistent.

## Prerequisites

- Read [[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]].
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].
- Read the current [[00_Home/Roadmap|Roadmap]].

## Relevant Code Paths

- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`
- `.agent-vault/00_Home/Roadmap.md`
- `.agent-vault/02_Phases/Phase_00_product_framing_lock/Phase.md`
- `.agent-vault/02_Phases/Phase_01_foundation_contracts/Phase.md`
- `.agent-vault/04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01.md`

## Required Reading

- [[02_Phases/Phase_00_product_framing_lock/Phase|Phase 00 product framing lock]]
- [[01_Architecture/System_Overview|System Overview]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Compare the framework's early framing, later desktop-first product architecture, and current vault roadmap language.
2. Identify every planning note that still frames `srgnt` as a vault-maintenance program or as an Obsidian-only shell.
3. Update those notes so the product is described as desktop-first, local-first, and workspace-centered while preserving historical references where they still explain context.
4. Record a short terminology rule set for when to use `workspace`, `artifact`, `connector`, `skill`, and `vault`.
5. Validate by checking that the roadmap and the first two phase notes no longer conflict on product boundary or user-facing language.
6. Update Implementation Notes and Outcome Summary with the exact terms that were normalized and any terms intentionally left unchanged.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Framework evidence: the later product architecture uses `workspace` as the user-facing model and desktop-first as the product boundary.
- The roadmap was previously about vault evolution rather than product delivery.
### Refinement (readiness checklist pass)

**Exact outcome**: A pull-request-style diff to the Roadmap, Phase 00, Phase 01, and DEC-0001 notes that replaces vault-maintenance language with desktop-first workspace language. Plus a new note `.agent-vault/06_Shared_Knowledge/terminology_rules.md` defining when to use `workspace`, `artifact`, `connector`, `skill`, `executor`, and `vault`.

**Output location**: Terminology rule set lives at `.agent-vault/06_Shared_Knowledge/terminology_rules.md`. All other changes are inline edits to existing notes.

**Constraints**:
- Do not remove historical Obsidian references where they explain the project's evolution.
- The framework document (`srgnt_framework.md`) is read-only; it is the source of truth, not an edit target.
- Language changes must be consistent with DEC-0001 (desktop-first boundary).

**Validation**:
- After edits, search the Roadmap and Phase 00-01 notes for the terms `vault maintenance`, `vault evolution`, `Obsidian-only`. Zero matches = pass.
- The terminology rules note exists and defines at least the 6 terms listed above.
- DEC-0001 is still accurately represented (no contradictions introduced).

**Edge cases**: The `.agent-vault/` directory itself is legitimately called a "vault" — the terminology rules must distinguish between the planning vault (agent-vault) and the user-facing workspace product.

**Junior-readiness verdict**: PASS with the above refinements. A junior developer can execute this step by following the 6-item execution prompt, producing edits to known files and one new terminology note.
**Security considerations**: N/A — this step only edits vault markdown notes. No code, auth, secrets, or user data involved.

**Performance considerations**: N/A — documentation-only step with no runtime behavior.

## Human Notes

- Preserve `vault` references only where they describe the repo's current planning apparatus or historical inspiration.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-021806-reconcile-product-boundary-and-terminology-opencode|SESSION-2026-03-22-021806 OpenCode session for Reconcile Product Boundary And Terminology]] - Session created.
- 2026-03-22 - [[05_Sessions/2026-03-22-025816-publish-one-pager-adr-backlog-and-roadmap-inputs-opencode|SESSION-2026-03-22-025816 OpenCode session for Publish One Pager ADR Backlog And Roadmap Inputs]] - Published [[06_Shared_Knowledge/terminology_rules|Terminology Rules]] and completed the durable output expected by this step.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means roadmap and framing notes use one consistent product boundary and terminology set.
- Validation target: no remaining contradiction between the roadmap, Phase 00, Phase 01, and DEC-0001.
- Current progress: [[06_Shared_Knowledge/terminology_rules|Terminology Rules]] now exists and downstream framing notes use the workspace-centered desktop-first language.
