# Execution Brief

## Why This Step Exists

- The repo currently has base connector classes but no public factory abstraction a third-party package could target safely.
- If runtime/package decisions are invented piecemeal during implementation, built-ins and external packages will drift immediately.
- Every later step depends on this note defining one exact answer to: “What does a connector package export, what host APIs exist, and which lifecycle states are real?”

## Prerequisites

- Read the Phase 20 note and [[01_Architecture/Connector_Package_Runtime|Connector Package Runtime]].
- Read [[04_Decisions/DEC-0016_isolate-third-party-connector-packages-outside-electron-main-process|DEC-0016 Isolate third-party connector packages outside Electron main process]] and assume third-party packages run outside Electron main.
- Inspect `packages/connectors/src/sdk/connector.ts`, `packages/contracts/src/connectors/manifest.ts`, and `packages/desktop/src/main/index.ts` before editing.
- Confirm no code is written for Step 02, Step 03, or Step 04 until this contract is stable enough to reference directly.

## Relevant Code Paths

- `packages/connectors/src/sdk/connector.ts`
- `packages/connectors/src/sdk/index.ts`
- `packages/connectors/src/index.ts`
- `packages/contracts/src/connectors/manifest.ts`
- `packages/contracts/src/connectors/manifest.test.ts`
- `packages/connectors/src/sdk/connector.test.ts`
- `packages/desktop/src/main/index.ts`
- `.agent-vault/01_Architecture/Connector_Package_Runtime.md`
- `.agent-vault/06_Shared_Knowledge/srgnt_framework_adr004_connector_contract.md`

## Execution Prompt

1. Define a public connector factory interface that creates a connector instance from validated package metadata plus a narrow host-provided runtime context.
2. Define the package entrypoint shape for v1. It must expose manifest + factory + compatibility/version metadata, not arbitrary initialization hooks.
3. Define explicit lifecycle states shared by the host and package contract: installed, verified, activated, loaded, connected, errored.
4. Define which host capabilities can be requested or injected. Do **not** pass raw Electron, Node, filesystem, or secret-store access.
5. Extend contracts only as far as needed for runtime compatibility, lifecycle, and minimal package metadata needed by later steps.
6. Update ADR-004 or link a companion note if the current architecture language is too vague for implementation.
7. Add focused contract/SDK tests before moving on.

## Related Notes

- Step: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Steps/Step_01_define-the-public-connector-factory-contract-and-package-runtime-shape|STEP-20-01 Define the public connector factory contract and package runtime shape]]
- Phase: [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|Phase 20 connector factory and remote package installation]]
