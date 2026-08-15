---
note_type: step
template_version: 2
contract_version: 1
title: Add capability matrix view and auth error surfacing
step_id: STEP-25-03
phase: '[[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]'
status: done
owner: claude-opus-5
created: '2026-07-10'
updated: '2026-08-15'
depends_on:
  - STEP-25-01
related_sessions:
  - '[[05_Sessions/2026-08-15-130000-add-capability-matrix-view-and-auth-error-surfacing-claude-opus-5|SESSION-2026-08-15-130000 claude-opus-5 session for Add capability matrix view and auth error surfacing]]'
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Add capability matrix view and auth error surfacing

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Add capability matrix view and auth error surfacing.
- Parent phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]].
- Exact outcome: Settings shows a capability matrix (rows: configured harnesses; columns: loadSession/resume, modes, slash commands, images, MCP transports, terminal/fs delegation) sourced from persisted last-negotiated capabilities; harness auth failures surface as actionable panels with docs links, and `authenticate` flows are plumbed where a harness requires them.
- Starting files: capability persistence from STEP-25-01; `Settings.tsx`; error-surface components in `chat/`.
- Validate: matrix content matches recorded `initialize` fixtures for mock, Pi, and opencode; simulated auth-failure scenario renders guidance instead of a raw error.

## Why This Step Exists

- Makes the capability-driven-degradation invariant human-legible: the matrix explains *why* a feature is off per harness — yes / no / clamped-by-override (Pi's `mcpServers`) / forced / **not yet measured** — from persisted last-negotiated data plus quirks, never harness-id switches.
- Pi's row is known ground truth (spike: loadSession true, resume false, mcpServers clamped, self-approving permissions, no fs/terminal delegation); opencode's row comes from its STEP-25-01 capture — rendering both from the same data path proves nothing is hardcoded.
- Auth becomes real this phase (opencode needs a configured provider; pi-acp advertises `pi_terminal_login`): auth failures must render actionable guidance panels with docs links, not raw JSON-RPC errors.

## Prerequisites

- STEP-25-01 merged (capability cache + `authMethods` on the model + opencode fixtures). Can run in parallel with STEP-25-02; if 02 is unmerged, land the matrix as its own settings section.
- Executor must verify the exact auth-required error shape in `@agentclientprotocol/sdk` 1.2.1 before wiring detection (record in Implementation Notes; STEP-25-04 input).

## Relevant Code Paths

- `packages/contracts/src/ipc/contracts.ts` — **`harness:capabilities`**, the one capability channel (decided in the brief; `harness:list` stays the settings/editor channel and is NOT extended for this). Single response shape: per-harness `{harnessId, state, negotiated, effective, quirks, authMethods, provenance, agentVersion?, capturedAt?, definitionFingerprint?}`.
- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx` (new) — rows from registry, cells from the `harness:capabilities` payload (STEP-25-01 cache fields passed through unchanged, carrying per-field provenance so not-yet-measured is distinct from measured-absent); `modes`/`slashCommands` captioned "discovered per session"; a fingerprint-mismatched row renders as stale/not-yet-measured, not as current.
- `packages/contracts/src/harness.ts` — **the generic auth-method payload, defined before any UI consumes it**: a normalized `SAuthMethod` (`{id, name, description?, kind: 'external-command' | 'rpc-authenticate' | 'docs-only', command?: {command, args, env}, instructions?}`) derived by a pure function from the raw SDK method metadata that STEP-25-01 preserves, carried in both the cached and live capability data. `kind` is what the panel branches on — never the harness id, never a string match on the method name.
- `packages/desktop/src/renderer/components/chat/AuthPanel.tsx` (new) + chat-controller auth-required detection and Retry; the panel is a pure renderer of `SAuthMethod`: `external-command` → copyable command + retry, `rpc-authenticate` → call `authenticate(methodId)`, `docs-only` → instructions + `docsUrl`.
- `packages/harness/src/testing/mock-agent/{scenario,runner}.ts` — new `authRequired` scenario directive (today `authenticate` unconditionally returns `{}`) to E2E the flow.
- Matrix tests assert fixture → rendered-row equivalence against `fixtures/pi/`, `fixtures/opencode/`, and the mock scenario initialize — including a fixture carrying a post-initialize session-discovered update (not just an initialize payload) to prove the baseline-vs-discovered provenance renders correctly.

## Required Reading

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (capability-driven degradation invariant)
- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (expected Pi row; `pi_terminal_login`)
- [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03]] (quirk-driven TrustBadge pattern this step extends)

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

- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: done
- Current owner: claude-opus-5
- Last touched: 2026-08-15
- Next action: STEP-25-04 — the cross-harness lessons note. Its inputs from this step are listed in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Implementation_Notes|Implementation Notes]] (auth metadata is not reliably machine-actionable; `configOptions` is a missing generic surface; `session/close`/`session/fork` unmodelled).
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Full detail in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Implementation_Notes|Implementation Notes]].
- **Verified, not assumed:** ACP auth-required is JSON-RPC `-32000` (`RequestError.authRequired`, `@agentclientprotocol/sdk` 1.2.1); `Effect.runPromise` rejects with a `FiberFailure` that drops the code, so the typed failure is captured with `Effect.tapError` and detection never matches on message text.
- **Measured, per the corrected brief:** pi's `pi_terminal_login` → `external-command` (command rebuilt from its own `args` + the definition's binary); opencode's → `docs-only`, because it advertises no `type` and no `args`. Both asserted against the committed fixtures.
- Capabilities live on exactly one channel (`harness:capabilities`); `harness:list` is unchanged and a test asserts it.
- Pi gained a fourth quirk, `no-client-delegation` (STEP-22-05 probe 4), so the delegation column has data; its fingerprint change makes any pre-existing cached pi row read stale until the next connect.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- [[05_Sessions/2026-08-15-130000-add-capability-matrix-view-and-auth-error-surfacing-claude-opus-5|SESSION-2026-08-15-130000]] — claude-opus-5, branch `phase/25-step-03-capability-matrix`: shipped the matrix, the normalized auth-method payload, and the auth panel.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Done by automated checks (contracts 207, harness 148 +3 skipped, runtime 458, desktop 1260, e2e auth 1 + chat/harnesses/sessions 14, `pnpm -r lint` and `pnpm -r build` clean). Full result and its evidence scope in [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing/Outcome|Outcome]].
- Shipped: Settings → Capabilities (six honest cell states + two quirk-driven behavioral columns, all from registry/cache/quirk data), the `harness:capabilities` channel, `SAuthMethod` + its normalizer in contracts, `AuthPanel` fed by a `chat:session:new` that answers the auth wall as data, and an `authRequired` mock-agent gate.
- **Narrower than "done" implies, stated where it is claimed:** fixture → rendered row is asserted at two seams rather than end to end; auth detection covers session creation only (not a mid-conversation expiry); and there was **no manual run against a real unauthenticated harness**, so "the guidance is followable end-to-end" is unproven against a real agent.
