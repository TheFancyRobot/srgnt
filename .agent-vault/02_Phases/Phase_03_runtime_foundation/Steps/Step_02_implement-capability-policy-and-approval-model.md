---
note_type: step
template_version: 2
contract_version: 1
title: Implement Capability Policy And Approval Model
step_id: STEP-03-02
phase: '[[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]'
status: complete
owner: ''
created: '2026-03-21'
updated: '2026-03-22'
depends_on:
  - STEP-03-01
related_sessions: '[[05_Sessions/2026-03-22-170211-implement-capability-policy-and-approval-model-opencode|SESSION-2026-03-22-170211]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 02 - Implement Capability Policy And Approval Model

Translate manifest-declared capabilities and approvals into reusable runtime enforcement.

## Purpose

- Give skills, connectors, and later terminal launches one policy engine for capability checks and approval requirements.
- Make trust boundaries inspectable instead of hiding them in prompts or UI copy.

## Why This Step Exists

- The framework calls out silent changes and weak trust as major risks.
- Approval and capability rules must exist before connector write flows, artifact updates, or terminal launches become real.

## Prerequisites

- Complete [[02_Phases/Phase_03_runtime_foundation/Steps/Step_01_implement-canonical-store-and-manifest-loaders|STEP-03-01 Implement Canonical Store And Manifest Loaders]].

## Relevant Code Paths

- `packages/runtime/`
- `packages/contracts/`
- skill and connector manifests from Phase 01
- approval UI hooks to be used later by desktop and workflow phases

## Required Reading

- [[02_Phases/Phase_03_runtime_foundation/Phase|Phase 03 runtime foundation]]
- [[01_Architecture/Integration_Map|Integration Map]]
- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]

## Execution Prompt

1. Implement capability resolution and approval requirements from the manifest contracts.
2. Distinguish read-only flows from write or side-effect flows in a way later UI can display clearly.
3. Keep policy enforcement runtime-centric rather than renderer-centric.
4. Add tests or fixtures that show a denied capability path and an approval-required path.
5. Validate with targeted policy tests and loader integration checks.
6. Update notes with the resolved capability taxonomy and any ambiguity that requires a new decision note.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: complete
- Current owner:
- Last touched: 2026-03-22
- Next action: None — step is complete.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Read/write separation must remain explicit for trust and approval UX.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/runtime/src/policy/capability.ts` — capability resolution engine: given a manifest's declared capabilities and the workspace's policy config, returns allowed/denied/approval-required for each operation
- `packages/runtime/src/policy/approval.ts` — approval model: tracks pending approvals, approval grants, and approval persistence (stored as workspace state files, not in-memory only)
- `packages/contracts/src/policy.ts` — Zod schemas for capability declarations, policy rules, and approval records
- `packages/runtime/src/policy/index.ts` — barrel export for the policy subsystem
- Test suite covering: (a) read-only operation → auto-allowed, (b) write operation → approval-required, (c) denied capability → blocked, (d) previously-approved operation → allowed without re-prompt
- Integration test: load a connector manifest via STEP-03-01 loaders, run its capabilities through the policy engine, verify correct allow/deny/approval results

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — capability and approval schemas must be Zod-validated
- DEC-0003 (Teams first, Slack second) — the connector capability model should not assume Slack-specific permission shapes; Teams is the primary connector target
- DEC-0007 (markdown files as data) — approval records should be stored as workspace files under `.command-center/state/approvals/`, not in an ephemeral store

**Starting files:**
- Completed STEP-03-01: working manifest loaders that produce typed manifest objects with capability declarations
- Phase 01 contracts defining what capabilities connectors and skills can declare

**Constraints:**
- Do NOT build approval UI in this step — the policy engine returns decisions, the UI is built later
- Do NOT hard-code connector-specific policy rules — policy must be manifest-driven and generic
- Do NOT make the policy engine async-dependent on network calls — it operates on local state only
- Do NOT store approvals in Electron-specific storage (e.g., safeStorage) — use workspace files

**Validation:**
1. `pnpm test --filter runtime` passes with policy tests covering all four paths (allowed, denied, approval-required, previously-approved)
2. `pnpm typecheck` passes across contracts + runtime
3. A denied capability cannot be bypassed by omitting the policy check (the loader -> policy path is mandatory)
4. Integration test: manifest load -> policy evaluation -> correct result, end-to-end
5. Read vs. write operations produce visibly different policy outcomes in test output

**Junior-readiness verdict:** PASS — well-scoped policy engine step. The four test paths (allow/deny/approval-required/previously-approved) give clear acceptance criteria. The implementer needs to understand the manifest capability schema from Phase 01.

## Human Notes

- If a policy cannot be expressed in manifest metadata, the contract probably needs tightening before more runtime code lands.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-22 - [[05_Sessions/2026-03-22-170211-implement-capability-policy-and-approval-model-opencode|SESSION-2026-03-22-170211 opencode session for Implement Capability Policy And Approval Model]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Completion means runtime can answer whether an operation is allowed, denied, or approval-gated.
- Validation target: policy tests prove both allowed and blocked paths.
