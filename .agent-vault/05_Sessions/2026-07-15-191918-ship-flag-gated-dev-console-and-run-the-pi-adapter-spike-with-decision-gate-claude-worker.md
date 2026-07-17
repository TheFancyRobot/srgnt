---
note_type: session
template_version: 2
contract_version: 1
title: claude-worker session for Ship flag-gated dev console and run the Pi adapter spike with decision gate
session_id: SESSION-2026-07-15-191918
date: '2026-07-15'
status: completed
owner: claude-worker
branch: phase/22-step-05-spike-gate
phase: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]'
related_bugs: []
related_decisions:
  - '[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]]'
created: '2026-07-15'
updated: '2026-07-15'
tags:
  - agent-vault
  - session
context:
  context_id: SESSION-2026-07-15-191918
  status: completed
  updated_at: '2026-07-15T19:19:18.907Z'
  current_focus:
    summary: Advance [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]].
    target: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]'
  resume_target:
    type: step
    target: '[[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]'
    section: Context Handoff
  last_action:
    type: saved
---

# claude-worker session for Ship flag-gated dev console and run the Pi adapter spike with decision gate

Use one note per meaningful work session in \`05_Sessions/\`. This note records chronology, validation, and handoff state for a slice of work. The reader should be able to understand what was attempted, what changed, and what the next agent should do, but durable conclusions should still be promoted into phase, architecture, bug, or decision notes. Every session should stay anchored to its primary step; use [[07_Templates/Step_Template|Step Template]] as the companion contract.

## Objective

- Advance [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]].
- Leave a clean handoff if the work stops mid-step.

## Planned Scope

- Build the flag-gated (`SRGNT_DEV_CONSOLE=1`) dev console; run the 4 Pi spike probes; write the spike report + a `proposed` gate decision.

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 19:19 - Created session note; linked [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05]].
- Surveyed harness public API (`AcpAgentConnection`, `Supervisor`, `HarnessRegistry`, `piDefinition`) + desktop main/preload/renderer IPC patterns; confirmed main already crosses the ESM boundary (`effect`), so importing `@srgnt/harness` from CommonJS main is safe.
- Cost gate: verified pi authenticated (6 providers + local LAN llama-server model, reachable HTTP 200). Ran the spike on the **local free** `cathulu/gemma-4-31B` GGUF — zero cloud tokens.
- Wrote `pi-spike.integration.test.ts` (recording spawner tees all JSON-RPC frames) + a dependency-free stdio MCP echo server; ran all 4 probes live against `pi-acp@0.0.31` (171s). Curated redacted frames → `packages/harness/src/testing/fixtures/pi-spike/spike-frames.json`.
- Built the dev console: main `DevSessionController` (over Supervisor + wrapper) + flag-gated IPC (`dev:session:new/prompt/cancel/dispose`, always-on `dev:console:enabled`); preload surface; renderer `DevConsole` + `DevConsoleGate`; E2E absence assertion; contracts IPC channels/schemas.
- Wrote the spike report (`06_Shared_Knowledge/`) and gate decision [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (status `proposed` — human decides). Linked both from PHASE-22 and PHASE-23.
- Validated foreground (see Validation Run); set step status/context_status = completed.
<!-- AGENT-END:session-execution-log -->

## Findings

- **pi-acp@0.0.31 measured (protocol v1):** permissions do NOT round-trip (self-approves, 0 `request_permission`); injected `session/new.mcpServers` NOT forwarded (echo server never launched); `session/load` WORKS + exposes model/thinking config; `session/resume` unsupported (`-32601`); NO client fs/terminal delegation (pi executes tools in-process). Full evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]].
- Biggest cross-phase consequence: **Phase 27's bus MCP injection cannot work for Pi as-is** — recorded in DEC-0018's consequences + revisit trigger.
- ESM `@srgnt/harness` imports cleanly from CommonJS desktop-main (top-level `main`/`types` resolve under `moduleResolution: node`); the mock bin is spawned by resolved path (avoids the unsupported `testing` subpath export).

## Context Handoff

- STEP-22-05 is complete. The dev console ships behind `SRGNT_DEV_CONSOLE=1` (invisible + no operational IPC without the flag; E2E asserts absence). The Pi spike is done with committed evidence, and the gate decision [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] is **proposed** — the human makes the adopt/fork/contribute call.
- Next: (1) human ratifies DEC-0018; (2) run `/vault:refine` across phases 23–29 with the measured findings (PHASE-23 scope still assumes `session/request_permission` round-trips, which the spike disproves for Pi — refine to reflect self-approval); (3) orchestrator commits this branch.

## Changed Paths

<!-- AGENT-START:session-changed-paths -->
- `packages/harness/src/registry/pi-spike.integration.test.ts` — new: 4-probe live Pi spike (gated `SRGNT_IT_PI=1`).
- `packages/harness/src/testing/fixtures/mcp-echo-server.mjs` — new: minimal stdio MCP echo server (probe 2).
- `packages/harness/src/testing/fixtures/pi-spike/spike-frames.json` — new: curated redacted raw-frame evidence.
- `packages/desktop/src/main/dev-console/` — new: `session-controller.ts`, `index.ts`, `session-controller.test.ts`, `ipc.test.ts`.
- `packages/desktop/src/renderer/components/DevConsole.tsx` (+ `DevConsole.test.tsx`) — new: console view + flag gate.
- `packages/desktop/src/main/index.ts`, `src/preload/index.ts`, `src/renderer/main.tsx`, `src/renderer/env.d.ts` — wire dev console.
- `packages/desktop/e2e/app.spec.ts` — new test: console absent in flag-off runs.
- `packages/contracts/src/ipc/contracts.ts` — dev-console IPC channels + schemas.
- `packages/desktop/package.json` — add `@srgnt/harness` workspace dep; `pnpm-lock.yaml` relinked.
- Vault: `06_Shared_Knowledge/pi-acp-adapter-spike-report.md`, `04_Decisions/DEC-0018_*.md` (proposed), PHASE-22/PHASE-23 links, step frontmatter completed.
<!-- AGENT-END:session-changed-paths -->

## Validation Run

<!-- AGENT-START:session-validation-run -->
- Command: `SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test pi-spike` — Result: 1 passed (171s, live Pi, 4 probes, evidence written). Foreground.
- Command: `pnpm --filter @srgnt/harness test` — Result: 112 passed / 2 skipped (both Pi integration tests gated off). `lint` (boundary: no Electron) clean.
- Command: `pnpm --filter @srgnt/desktop typecheck` — Result: clean (main CJS + preload + renderer, incl. ESM harness import).
- Command: `pnpm --filter @srgnt/desktop test` — Result: 771 passed / 0 failed (43 files, incl. 13 new dev-console tests).
- Command: `pnpm --filter @srgnt/contracts test` — Result: 127 passed.
- Command: `pnpm --filter @srgnt/desktop build` — Result: clean (677 modules; console compiled into main/preload/renderer bundles).
- Command: real-spawn verify via built dist `defaultDevConnect` — Result: Supervisor spawned the mock bin, initialize + prompt turn (7 updates: thought/message/tool_call/update, end_turn), clean kill-tree dispose. `VERIFY_OK`.
- Notes: dev console E2E absence assertion added to `e2e/app.spec.ts` (not run here — Electron e2e is orchestrator/CI territory; gating is unit-covered by `ipc.test.ts` + `DevConsole.test.tsx`).
<!-- AGENT-END:session-validation-run -->

## Bugs Encountered

<!-- AGENT-START:session-bugs-encountered -->
- None.
<!-- AGENT-END:session-bugs-encountered -->

## Decisions Made or Updated

<!-- AGENT-START:session-decisions-made-or-updated -->
- Created [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] in status **proposed** (gate evidence + phased-hybrid recommendation; human ratifies adopt/fork/contribute).
<!-- AGENT-END:session-decisions-made-or-updated -->

## Follow-Up Work

<!-- AGENT-START:session-follow-up-work -->
- [ ] Human: ratify [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] (set `accepted`/`rejected`).
- [ ] Run `/vault:refine` across phases 23–29 with the measured pi-acp findings (esp. PHASE-23's permission-round-trip assumption vs. Pi self-approval).
- [ ] Full desktop Playwright e2e (`test:e2e`) in CI to exercise the new console-absence assertion.
<!-- AGENT-END:session-follow-up-work -->

## Completion Summary

- Done and validated: flag-gated dev console (mock + Pi targets over Supervisor + `@srgnt/harness`, invisible without the flag), 4 live Pi spike probes with committed frame evidence, spike report, and the gate decision DEC-0018 recorded as **proposed**. Clean handoff — the decision is intentionally left for the human to ratify; orchestrator owns the commit.
