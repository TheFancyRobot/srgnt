# Outcome

- Result: `packages/harness/src/registry/` — `HarnessRegistry` (built-in + workspace `harnesses.json` merge, workspace-wins precedence), built-in `piDefinition` (`npx pi-acp@0.0.31`; quirks `adapter-mediated`/`permission-routing-gaps`/`mcp-passthrough-gaps`; override `mcpServers:false`), Pi detection (`detectPi`/`detectCommand`) with three typed outcomes + no-orphan probe timeout, and `effectiveCapabilities` reusing the acp merge. Exported via `src/index.ts`.
- Validation: harness suite 73 pass / 1 skipped (new registry.test.ts 15 + detect.test.ts 9); `SRGNT_IT_PI=1` integration test passed and captured the live pi-acp `initialize` payload for the STEP-22-05 baseline; root typecheck + harness boundary lint clean. No mutating git run — orchestrator owns commits.
- Follow-up: STEP-22-05 validates the three declared Pi quirks against the captured payload; a decision note is warranted only if a hard clamp on non-negotiated capability enabling is later required (current merge intentionally follows contracts force-semantics).

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
