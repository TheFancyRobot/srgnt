---
note_type: shared_knowledge
title: Desktop App Technical Design
created: '2026-03-21'
updated: '2026-03-22'
tags:
  - architecture
  - desktop
  - electron
  - technical-design
---

# Desktop App Technical Design

## Local-first storage requirement note
The desktop product must be built as a **local-first, file-based workspace**.

This means:
- the primary source of truth is the local workspace on disk
- durable user data should be represented in files and file-backed workspace structures
- no remote backend is the source of truth for raw user workspace data
- future sync services may store only encrypted payloads, settings, and sync metadata
- local query/index acceleration is allowed, but it must be derived from the local workspace rather than replacing it as the source of truth

## Purpose
Define the technical design for the desktop-first v1 product, including shell architecture, runtime boundaries, terminal integration, connector execution, artifact handling, and security-sensitive local services.

## Goals
The desktop app should:
- feel fast, local, and keyboard-friendly
- support a workspace optimized for operations and tracking
- integrate terminal-based coding agents cleanly
- support connectors and skills through stable contracts
- preserve strong local security boundaries
- remain useful without sync or Fred

## Recommended stack direction
- **Desktop shell:** Electron
- **Frontend:** TypeScript + React
- **UI system:** component library + command palette + panel layout system
- **State management:** structured client state + persisted local workspace state
- **Local storage:** structured local database/store plus filesystem-backed artifacts where appropriate
- **Secure secret storage:** OS-native keychain/credential storage via privileged layer
- **Terminal integration:** PTY-backed terminal hosted through privileged local process boundary

## High-level process model

```text
Electron App
├── Main Process (privileged)
│   ├── window lifecycle
│   ├── secure IPC surface
│   ├── secret storage integration
│   ├── terminal/PTy management
│   ├── connector auth/session handling
│   ├── local filesystem mediation
│   ├── updater integration
│   └── local service orchestration
│
├── Renderer Process (UI)
│   ├── Today view
│   ├── Calendar view
│   ├── Inbox view
│   ├── Workflows view
│   ├── Artifacts view
│   ├── Integrations view
│   ├── Runs view
│   ├── command palette
│   └── terminal surface UI
│
└── Shared Core Packages
    ├── entities
    ├── manifests
    ├── skill runtime
    ├── connector contracts
    ├── policy engine
    ├── logging models
    └── executor interfaces
```

## Main process responsibilities
The Electron main process should be the privileged local boundary for desktop.

Responsibilities:
- create and manage app windows
- expose narrow IPC endpoints to renderer
- manage OS credential/secret storage access
- manage terminal/PTy processes
- mediate connector auth flows and token refresh
- handle secure local file operations
- coordinate background-safe local tasks
- own update and packaging-sensitive system interactions

The main process should **not** become a dumping ground for arbitrary business logic. Most product logic should live in shared runtime packages.

## Renderer responsibilities
The renderer should focus on:
- command center UX
- artifact rendering/editing
- tracking and status surfaces
- settings and connector flows
- workflow initiation
- review/approval interfaces
- terminal display and interaction UI

The renderer should only access privileged functionality through explicit, minimal IPC contracts.

## IPC philosophy
IPC should be:
- narrow
- typed
- capability-aware
- auditable where appropriate

Examples of acceptable IPC surfaces:
- `connectors.listInstalled()`
- `connectors.beginAuth(connectorId)`
- `artifacts.list(filters)`
- `artifacts.open(id)`
- `runs.invoke(skillId, inputs)`
- `terminal.open(profile)`
- `terminal.write(sessionId, data)`
- `secrets.store(ref, value)` via mediated internal service, not direct generic secret APIs to renderer

Avoid broad APIs such as:
- arbitrary filesystem access
- arbitrary shell execution from renderer
- unrestricted network bridge APIs

## Workspace model
The product should use a **workspace** model rather than a "vault" model in user-facing language.

A workspace contains:
- artifacts
- local state
- connector metadata
- skill packages
- run history
- logs
- caches
- user settings

Possible internal directory shape:

```text
workspace/
  artifacts/
  skills/
  connectors/
  state/
  logs/
  cache/
  settings/
```

Not all data needs to be file-based. Some should be in a local structured database/store.

## Persistence strategy
Use a hybrid local-first persistence model:

### File-backed artifacts
Use files for:
- durable human-readable artifacts
- generated reports/briefings
- templates
- imported/exported content

### Structured local metadata and index layer
Use a local metadata/index layer derived from the workspace for:
- canonical entities
- run history
- connector freshness/state
- workflow status
- approvals
- indexes/search metadata
- saved query/view materialization
- sync cursors later

Important note:
- this layer is an acceleration and query layer, not the user's authoritative source of truth
- the product should avoid depending on an external database as the primary workspace model

This hybrid model supports both inspectability and strong operational querying.

## Artifact model
Artifacts are first-class product objects, not just files.

Each artifact should have:
- artifact id
- type
- title
- path if file-backed
- created/updated timestamps
- producing workflow/skill
- related entities
- status
- optional follow-up state

This enables tracking-oriented UX instead of generic document browsing.

## Terminal integration model
Terminal integration is a core v1 differentiator.

Requirements:
- embedded terminal pane or strongly integrated terminal surface
- persistent terminal sessions where appropriate
- PTY-backed process management in privileged layer
- workspace-aware environment/context
- workflow launch actions that can open or reuse terminal sessions
- ability to associate terminal runs with artifacts and run logs

Important constraint:
The terminal should feel native to the operations workspace, not like an iframe or detached utility.

## Connector runtime model
Connector runtime should be implemented in shared packages with privileged operations mediated by the main process.

Connector flow:
1. connector manifest discovered
2. user configures connector in UI
3. auth handled through privileged local boundary
4. connector syncs source data
5. data mapped into canonical entities
6. freshness/status stored locally
7. workflows and views consume canonical entities

## Skill runtime model
Skill runtime should:
- discover installed skills
- validate required capabilities
- collect input context
- invoke executor or workflow implementation
- validate outputs
- produce artifacts and run logs
- enforce approval policy

## Local search/indexing direction
The product will need strong local retrieval across:
- artifacts
- entities
- runs
- connector-derived records

This can begin with a local structured search/index layer and evolve later. Full-blown semantic retrieval is not required for v1.

## Security design implications
Desktop technical design must support:
- context isolation in Electron
- no Node exposure directly to renderer
- minimal preload bridge
- strict separation of renderer and privileged operations
- sensitivity-aware local logging
- OS-native secure secret storage
- future client-side encryption paths for sensitive sync content

## Update/distribution considerations
The app should be designed for:
- signed builds
- trusted updater pipeline
- environment separation for dev/beta/prod
- crash handling with redaction-aware reporting

## Performance considerations
Desktop v1 should prioritize:
- fast startup to command-center view
- smooth navigation across primary operational surfaces
- responsive terminal rendering
- incremental connector syncs where possible
- lazy-loading for heavy views

## UX-driven technical priorities
Because the product is not a notes app, technical design should support:
- status-rich list/card/timeline views
- fast filtering and grouping
- explicit workflow/run visibility
- artifact metadata and follow-through state
- multi-panel operations layouts

## Summary
The desktop app should be built as a secure, local-first Electron application with a privileged main-process boundary, shared runtime packages, first-class terminal integration, hybrid persistence, and an operations-first workspace model.

## Related Notes

- [[06_Shared_Knowledge/srgnt_framework|srgnt Product and Architecture Foundation]]
- [[06_Shared_Knowledge/srgnt_framework_security_boundary_model|Security Boundary Model]]
- [[06_Shared_Knowledge/srgnt_framework_local_first_storage|Local-First Storage]]
- [[06_Shared_Knowledge/srgnt_framework_repo_package_structure|Repo and Package Structure]]
