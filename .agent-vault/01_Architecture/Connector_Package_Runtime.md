---
note_type: architecture
template_version: 2
contract_version: 1
title: Connector Package Runtime
architecture_id: "ARCH-0008"
status: active
owner: ""
reviewed_on: "2026-04-19"
created: "2026-04-19"
updated: "2026-04-19"
related_notes:
  - "[[01_Architecture/Integration_Map|Integration Map]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
  - "[[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]"
  - "[[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]"
  - "[[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]"
  - "[[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]"
  - "[[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]"

tags:
  - agent-vault
  - architecture
  - connectors
  - plugins
---

# Connector Package Runtime

## Purpose

- Explain how pluggable connector packages should be described, installed, loaded, and instantiated.
- Define the boundary between connector metadata discovery, installation state, executable package loading, and live connection/auth state.

## Overview

- Phase 19 established a truthful **catalog + install + connect** model for bundled connectors.
- The next subsystem extends that model so the same host can support **first-party and third-party connectors** through one shared factory contract.
- Connector packages should be installable remotely by CLI in v1, but installation must remain local-first, explicit, and fail closed.
- The desktop main process remains the privileged host for package registry mutations, auth/session orchestration, and any executable connector loading. The renderer may inspect high-level state, but it must not execute connector packages directly.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Connector manifest - Declarative package metadata, capabilities, compatibility, and non-secret install-time information.
- Connector factory - Stable SDK entrypoint that creates a connector instance from a validated manifest plus host-provided services.
- Built-in connector registry - First-party connectors that ship with the app but should still register through the same factory path as external packages.
- Installed package registry - Durable record of source URL, installed version, integrity metadata, install location, activation state, and compatibility checks.
- Main-process connector host - The only boundary allowed to mutate install state, load connector packages, and coordinate auth/session handling.
- CLI install flow - Fetch, verify, install, inspect, and remove package operations before any future UI is introduced.
- Runtime connector state - Derived state that separates available, installed, loaded, connected, and error conditions.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `packages/contracts/src/connectors/manifest.ts` - Existing connector manifest contract that must expand for package compatibility and integrity metadata.
- `packages/connectors/src/sdk/connector.ts` - Current SDK baseline and likely home for the public connector factory abstraction.
- `packages/connectors/src/{jira,outlook,teams}/` - Built-in connectors that should move onto the shared factory path first.
- `packages/desktop/src/main/index.ts` - Current connector catalog/install/connect logic and future main-process package registry + loader entry point.
- `packages/desktop/dev-connectors/` - Existing dev catalog/package fixtures that can inform package metadata and remote-install testing.
- `.agent-vault/02_Phases/Phase_19_implement_connector_pluggability/` - Shipped baseline for install-before-use and catalog separation.
- `.agent-vault/02_Phases/Phase_20_connector_factory_and_remote_package_installation/` - Follow-on implementation plan for external connector packages.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Remote install must not imply unrestricted arbitrary code trust.
- The renderer and preload layers must never execute third-party connector code.
- Install, load, and connect are separate states and should remain independently inspectable.
- Manifest validation alone is insufficient; executable package integrity and host/package compatibility must be checked before activation.
- Built-in and third-party connectors should converge on one factory contract to avoid a privileged first-party-only path that external developers cannot use.
- Any secret-bearing auth/session flows must stay within the privileged desktop host boundary described by the desktop technical design and security boundary notes.
- CLI-only installation is acceptable for v1, but the install metadata and state model should be designed so a future UI can inspect and manage the same records without migration.

## Failure Modes

- Loading third-party connector code directly in the Electron main process without a constrained contract turns remote install into an RCE surface.
- Duplicate connector definitions between built-ins and external packages cause drift in manifest fields, capability disclosure, and compatibility handling.
- Persisting install state without durable package metadata can strand broken or uninspectable installs on disk.
- Allowing connectors to over-claim capabilities without host-side enforcement weakens permission disclosure and approval boundaries.
- Uninstall that removes install intent but leaves runtime state, cached sessions, or package artifacts behind creates misleading UI state and cleanup gaps.
- Version skew between host SDK and connector package format can break startup if compatibility is not checked before load.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Integration_Map|Integration Map]]
- [[01_Architecture/System_Overview|System Overview]]
- [[02_Phases/Phase_19_implement_connector_pluggability/Phase|PHASE-19 Implement Connector Pluggability]]
- [[02_Phases/Phase_20_connector_factory_and_remote_package_installation/Phase|PHASE-20 Connector Factory and Remote Package Installation]]
- [[06_Shared_Knowledge/srgnt_framework_adr004_connector_contract|ADR-004 Connector Contract and Capability Model]]
- [[06_Shared_Knowledge/srgnt_framework_desktop_technical_design|Desktop App Technical Design]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
<!-- AGENT-END:architecture-related-notes -->
