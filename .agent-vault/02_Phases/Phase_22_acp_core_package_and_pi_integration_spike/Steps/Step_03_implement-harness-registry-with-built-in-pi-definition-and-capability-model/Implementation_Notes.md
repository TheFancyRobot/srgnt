# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

## 2026-07-14 — registry shipped (claude-worker)

- Files: `packages/harness/src/registry/{builtins,detect,registry,index}.ts` + tests `registry.test.ts`, `detect.test.ts`, `pi.integration.test.ts`, fixture `__fixtures__/hang-probe.mjs`. Exported from `src/index.ts`.
- Contracts gotcha: `SHarnessDefinition` has no `installHint` field (the Brief's example implied one) — put install guidance in `description`, kept to the shipped schema.
- Merge precedence: built-ins → workspace `harnesses.json`; same-`id` replaces wholesale (delete-then-set → stable `list()`, last-write-wins). `loadWorkspaceHarnesses` validates via `Schema.decodeUnknownEither(SHarnessesFile)` and returns a typed `{ok,...}` result.
- Detection: 3 typed states (`ok` / `probe-failed{timeout|nonzero-exit|no-version-output}` / `not-installed`); default `nodeVersionProbe` SIGKILLs on timeout (verified no-orphan via pid-file fixture assertion).
- Capability merge reuses acp `applyCapabilityOverrides` (force on/off per contracts, so `modes`/`slashCommands` remain assertable). "Cannot enable non-negotiated" held by authoring convention; flagged as a possible future decision note.
- Captured pi-acp@0.0.31 `initialize` payload (STEP-22-05 baseline): protocolVersion 1, loadSession true, resumeSession false, images true, mcpServers true (effective false via override), audio/embeddedContext/mcpHttp/mcpSse false, modes/slashCommands false. `pi --version` 0.80.6, node v24.15.0.
- Tallies: harness 73 pass / 1 skipped; +1 with `SRGNT_IT_PI=1`; root typecheck + boundary lint clean.

## Related Notes

- Step: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Steps/Step_03_implement-harness-registry-with-built-in-pi-definition-and-capability-model|STEP-22-03 Implement harness registry with built-in Pi definition and capability model]]
- Phase: [[02_Phases/Phase_22_acp_core_package_and_pi_integration_spike/Phase|Phase 22 acp core package and pi integration spike]]
