---
note_type: step
template_version: 2
contract_version: 1
title: Integrate ACP Registry catalog with bundled snapshot fallback
step_id: STEP-26-03
phase: '[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-18'
depends_on:
  - STEP-26-01
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Integrate ACP Registry catalog with bundled snapshot fallback

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Integrate ACP Registry catalog with bundled snapshot fallback.
- Parent phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]].
- Exact outcome: srgnt can browse the official ACP Registry catalog and add a listed agent as a HarnessDefinition in one click (install hints shown, srgnt does not install binaries); when the registry is unreachable, a bundled static snapshot serves the same flow — the aggregator-era catalog-fallback lesson applied.
- Starting files: `packages/harness/src/registry/` (catalog client + snapshot data); Settings add-harness flow from STEP-26-01.
- Validate: offline test path exercises the snapshot; online path adds a real registry agent (e.g., Gemini CLI) whose definition then passes the conformance runner.

## Why This Step Exists

- Removes the launch-incantation barrier: pick a known agent from the catalog, get a prefilled `SHarnessDefinition` draft the user reviews in the STEP-26-01 editor and confirms — never auto-trusted, never auto-installed (install hints + docsUrl only).
- The failure architecture is pre-decided (ARCH-0009: remote catalog unreachable → bundled static snapshot; the aggregator-era `builtinConnectorDefinitions` lesson). The committed, hand-reviewed snapshot is the *primary* path; the network fetch is optional, explicit, and failure-tolerant (DEC-0017 local-first — no fetch at startup, ever).
- Whether agentclientprotocol.com exposes a machine-readable feed is UNVERIFIED — executor verifies first; if none exists, the snapshot IS the catalog and refresh stays a documented maintainer procedure. Entry metadata expected to be confirmed by REQ-26-xx.

## Prerequisites

- STEP-26-01 merged (the add/confirm flow reuses its editor + create path wholesale).
- Verify the live feed situation and record it in Implementation Notes before writing fetch code.
- Read PHASE-20 (the catalog-fallback lesson), DEC-0017, and the lessons note's catalog REQs.

## Relevant Code Paths

- `packages/contracts/src/` — `SCatalogEntry`/`SCatalog` (entries map 1:1 onto `SHarnessDefinition` drafts).
- `packages/harness/src/registry/catalog/` (new): `snapshot.json` (committed, hand-verified fixture — seed: Gemini CLI, claude-acp, codex-acp, opencode, pi), `README.md` (documented refresh procedure with mandatory human diff review), `catalog.ts` (`loadCatalog` with injected fetcher; any failure → snapshot with typed detail).
- Desktop: `harness:catalog` IPC (fetch in main only, gated on explicit `refresh: true`); renderer "Add from catalog" view feeding the STEP-26-01 editor.

## Required Reading

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]]
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20]] (the catalog-fallback lesson from the aggregator era)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
