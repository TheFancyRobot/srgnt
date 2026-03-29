---
note_type: step
template_version: 2
contract_version: 1
title: Define Skill Manifest Contract
step_id: STEP-01-03
phase: '[[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]'
status: completed
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-01-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Define Skill Manifest Contract

Define the skill package contract, manifest schema, and one worked example for the daily-briefing command-center wedge.

## Purpose

- Specify the required and optional fields for a skill package and its manifest.
- Produce a worked example skill package that exercises the contract without depending on live systems.

## Why This Step Exists

- Skills are the main user-facing unit of value and need a stable installable format before runtime, marketplace, or UX work begins.
- A worked example keeps the manifest contract honest and stops it from staying abstract or impossible to satisfy.

## Prerequisites

- Complete [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]].
- Read [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]], especially ADR-003 and the daily-briefing wedge.
- Read [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]].

## Relevant Code Paths

- The shared contracts package or directory frozen in Step 01.
- The example skill location frozen in Step 01, expected to include a daily-briefing package.
- `.agent-vault/06_Shared_Knowledge/srgnt_framework.md`

## Required Reading

- [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
- [[02_Phases/Phase_01_foundation_contracts/Steps/Step_02_define-canonical-entity-contracts|STEP-01-02 Define Canonical Entity Contracts]]
- [[01_Architecture/System_Overview|System Overview]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[04_Decisions/DEC-0001_use-desktop-first-product-boundary-for-phase-01|DEC-0001 Desktop-first product boundary]]

## Execution Prompt

1. Define the skill manifest fields, package layout, and contract files in the shared location chosen earlier in the phase.
2. Keep skills dependent on canonical entities, declared capabilities, and explicit outputs rather than provider-specific schemas or one executor backend.
3. Make approval behavior explicit; no silent write or side-effect assumptions should be hidden in prompt prose.
4. Create or update a worked example `daily-briefing` skill package with manifest, prompt/template references, and schema references that the runtime can validate later.
5. Ensure the example is fixture-friendly and can be exercised without live connectors.
6. Validate by checking the example manifest matches the contract and can be satisfied by a connector and executor without custom escape hatches.
7. Update notes with the final field set, example paths, and any unresolved versioning or packaging question.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: completed
- Current owner:
- Last touched: 2026-03-22
- Next action: No follow-up required; keep this step as the historical baseline.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- The framework doc already proposes `skill.yaml` plus prompts, templates, fixtures, tests, and README as the default package shape.
- The daily-briefing wedge is the safest worked example because it exercises entities, capabilities, approvals, and artifact outputs without requiring broad product scope.
### Refinement (readiness checklist pass)

**Exact outcome**: Zod schemas in `packages/contracts/src/skills/` for:
1. `SkillManifest` — name, version, description, author, requiredCapabilities[], producedArtifacts[], requiredEntities[], approvalMode, configSchema, promptRefs[]
2. `ApprovalMode` — enum: `auto` | `confirm-before-write` | `confirm-always` | `manual`
3. `SkillCapabilityRef` — capability string (e.g., `tasks.read`, `events.read`) that maps to connector capabilities

Plus a worked example at `examples/skills/daily-briefing/`:
- `skill.yaml` — manifest file with all required fields populated
- `prompts/briefing.md` — template prompt referencing entity types
- `fixtures/` — sample input entities and expected output artifacts
- `README.md` — explains what the skill does and how to validate it

**Key decisions to apply**:
- DEC-0002: Manifest schema is Zod. The `skill.yaml` file is validated by parsing it through the Zod schema at validation time.
- The approval model is **owned by this step**. Steps 04 and 05 reference it but do not redefine it. The approval vocabulary (`auto`, `confirm-before-write`, `confirm-always`, `manual`) is canonical.

**Constraints**:
- Skills must not name specific providers (no `jira` or `teams` in capability refs — only behavior-based strings like `tasks.read`).
- Skills must not assume a specific executor backend.

**Validation**:
- The `daily-briefing/skill.yaml` parses successfully through `SkillManifest.parse()`.
- The manifest's `requiredCapabilities` can be satisfied by the sample connector from Step 04.
- `pnpm -r run typecheck` passes.

**Junior-readiness verdict**: PASS. Manifest fields enumerated, approval model owned, worked example structure explicit.

## Human Notes

- Integrity risk: if prompt files become the only source of truth, host tooling will not be able to inspect, validate, or trust installed skills.
- Keep artifact targets, capability requirements, and approval modes explicit in the manifest contract.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means the repo has a skill manifest contract plus a worked `daily-briefing` example that exercises the contract end to end on paper.
- Validation target: the example manifest parses against the declared contract and references only canonical entities and declared capabilities.
