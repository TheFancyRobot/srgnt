# Outcome

- **Done (2026-07-15).** Flag-gated (`SRGNT_DEV_CONSOLE=1`) dev console shipped: main `DevSessionController` drives ephemeral raw ACP sessions over the harness Supervisor + `AcpAgentConnection` (mock + Pi targets); thin IPC (`dev:session:new/prompt/cancel/dispose`, always-on `dev:console:enabled`); preload surface; renderer `DevConsole` + `DevConsoleGate`. Invisible without the flag (no operational IPC registered; renderer mounts nothing) with an E2E absence assertion in `e2e/app.spec.ts`.
- **Pi spike complete** against live `pi-acp@0.0.31` (local free model, zero cloud spend). All 4 probes recorded with committed frame evidence (`packages/harness/src/testing/fixtures/pi-spike/spike-frames.json`): permissions do NOT round-trip (self-approve); MCP `session/new` injection NOT forwarded; `session/load` works, `session/resume` unsupported; NO client fs/terminal delegation.
- **Gate decision:** [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]] recorded as **proposed** (phased-hybrid recommendation) — the human ratifies adopt/fork/contribute.
- **Evidence:** [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]].
- **Validation:** harness 112 pass / 2 skipped (Pi ITs gated) + boundary lint clean; spike IT 1 pass (live); desktop typecheck + 771 tests + full build clean; real-spawn `defaultDevConnect` verified end-to-end (kill-tree confirmed).
- **Follow-up:** human ratifies DEC-0018; `/vault:refine` phases 23–29 with measured findings (PHASE-23 still assumes permission round-trips — untrue for Pi); CI Playwright e2e.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
