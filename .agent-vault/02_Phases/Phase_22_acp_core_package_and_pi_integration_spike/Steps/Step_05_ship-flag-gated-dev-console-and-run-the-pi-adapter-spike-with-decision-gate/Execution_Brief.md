# Execution Brief

## Why

- This is the phase's payoff: proof that srgnt drives a real coding agent over ACP, plus *measured* answers to the pi-acp questions (permissions, MCP passthrough, loadSession) that decide the Pi strategy. The decision gate exists so Phase 23+ builds on evidence, not hope.

## Prerequisites

- STEP-22-02 (supervisor), STEP-22-03 (Pi definition), STEP-22-04 (mock agent for the console's safe default target).
- pi installed and authenticated with a working model provider (a real prompt turn costs tokens — use a cheap model in pi's config for the spike).

## Likely Code Paths

- Renderer: minimal dev-console view behind `SRGNT_DEV_CONSOLE=1` (or a hidden settings toggle) — target picker (mock scenario / Pi), prompt textarea, raw update-stream log (JSON, scrollback), cancel button, connection state line.
- Main: thin IPC (`dev:session:new/prompt/cancel/dispose`) bridging renderer ↔ supervisor+wrapper; ephemeral only (no persistence).
- Spike probes (scripted where possible, manual where not):
  1. **Permissions**: prompt Pi to edit a file; observe whether `session/request_permission` arrives over ACP or pi self-approves. Record frames.
  2. **MCP passthrough**: pass a trivial stdio MCP echo server in `session/new.mcpServers`; ask Pi to call its tool; observe behavior.
  3. **loadSession/resume**: inspect `initialize` capabilities; attempt `session/load` with a prior sessionId.
  4. **fs/terminal delegation**: advertise client fs/terminal capabilities; observe whether the adapter ever calls them.
- Vault outputs: spike report note in `06_Shared_Knowledge/` (raw findings + frame excerpts) and a new decision note (gate outcome: adopt pinned adapter / fork into `packages/shims/pi-acp` / contribute native `--mode acp` upstream) via `vault_create`.

## Execution Checklist

1. Build the console against the mock agent first (safe, deterministic); add the Pi target once stable.
2. Run the four probes; save raw frame logs as fixtures where they're interesting.
3. Write the spike report; convene the gate (one sitting): choose the Pi path with evidence, record the decision note, link it from PHASE-22 and PHASE-23.
4. Update PHASE-23/25 phase notes via `vault_mutate` if findings change their assumptions (e.g., permission trust badge copy).

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_05_ship-flag-gated-dev-console-and-run-the-pi-adapter-spike-with-decision-gate|STEP-22-05 Ship flag-gated dev console and run the Pi adapter spike with decision gate]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
