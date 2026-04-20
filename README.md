# srgnt

Desktop-first personal command center built with Electron.

## Project Structure

```
srgnt/
├── packages/
│   ├── tsconfig/          # Shared TypeScript configs
│   ├── contracts/         # Zod schemas and entity definitions
│   ├── runtime/           # Local-first runtime, storage, approvals
│   ├── desktop/           # Electron main/preload/renderer
│   ├── connectors/        # Jira, Outlook Calendar, Teams SDK
│   ├── executors/         # Skill executor contracts
│   ├── sync/              # Sync engine for workspace continuity
│   ├── entitlements/      # Premium/Fred entitlement separation
│   └── fred/              # Fred premium orchestration layer
├── examples/
│   ├── skills/
│   │   └── daily-briefing/ # Example skill package validated against shared contracts
│   └── connectors/
│       └── jira/           # Example connector package validated against shared contracts
├── .agent-vault/          # Durable roadmap, phase, and architecture notes
└── TESTING.md             # Manual verification guide and known limitations
```

## Package Manager

This project uses **pnpm** as the package manager (see `DEC-0005`).

```bash
# Install dependencies
pnpm install

# Type check all packages
pnpm typecheck

# Run tests
pnpm test

# Build all workspaces
pnpm build

# Lint all packages
pnpm lint

# Run the desktop Electron E2E suite
pnpm test:e2e

# Smoke test the packaged Linux desktop build
pnpm test:e2e:packaged:linux
```

## Desktop QA

The desktop app now has a dedicated `Desktop E2E` GitHub Actions workflow that runs on Linux and validates both:

- the Electron end-to-end suite against the built app
- a packaged Linux smoke test against the unpacked desktop bundle

For local details and the full desktop testing workflow, see `TESTING.md`.

## Creating a Connector Plugin

Third-party connectors are distributed as isolated packages that the desktop app installs via CLI, verifies with sha256, and loads in a worker/subprocess runtime (see `DEC-0016`). The public surface lives in `@srgnt/connectors` (SDK) and `@srgnt/contracts` (schemas). A working reference is `examples/connectors/jira/`.

### Package shape

Every connector package must export one `ConnectorPackage` object from its entrypoint:

```ts
import type { ConnectorPackage } from '@srgnt/connectors';

export const connectorPackage: ConnectorPackage = {
  manifest,  // ConnectorManifest — identity, auth, capabilities, entity types
  runtime,   // ConnectorPackageRuntime — sdkVersion, host range, capabilities, executionModel
  factory,   // (host: HostContext) => Promise<Connector>
};
```

- `manifest`: validated by `SConnectorManifest`. Declares `id`, `version`, `provider`, `authType`, capability matrix, and `entityTypes`.
- `runtime`: validated by `SConnectorPackageRuntime`. Must declare `sdkVersion`, `minHostVersion`, `entrypoint`, `capabilities` (subset of `http.fetch`, `logger`, `crypto.randomUUID`, `workspace.root`), and `executionModel: 'worker' | 'subprocess'`. Third-party packages may not run in the Electron main process.
- `factory`: receives a `HostContext` (bounded `HostCapabilities` + `connectorId` + `sdkVersion`) and returns a `Connector`. Typically extends `BaseConnector` or `SyncableConnector` from the SDK.

### Step-by-step

1. **Scaffold the package.** Use `examples/connectors/jira/` as a template: a standalone npm/pnpm package that depends on `@srgnt/connectors` and `@srgnt/contracts`. Build to `./dist/` (TS → ESM) and set `main` to the compiled entrypoint.

2. **Define the manifest.** Shape and validate against `SConnectorManifest` in `packages/contracts/src/connectors/manifest.ts`. Pick a stable `id`; it is the activation key and must match the one the host expects.

3. **Implement the connector.** Extend `BaseConnector` (no sync) or `SyncableConnector` (with `sync(): Promise<SyncResult>`) from `@srgnt/connectors`. Only use capabilities your `runtime.capabilities` block declared — the host mediates all I/O through `HostContext`.

4. **Write the factory.** A minimal factory:

   ```ts
   import { BaseConnector, type HostContext } from '@srgnt/connectors';
   import type { ConnectorPackage } from '@srgnt/connectors';

   class MyConnector extends BaseConnector {
     async connect() { this.updateHealth('connected'); }
     async disconnect() { this.updateHealth('disconnected'); }
     async refresh() { this.updateHealth('connected'); }
   }

   export const connectorPackage: ConnectorPackage = {
     manifest: { id: 'my-connector', /* ... */ },
     runtime: {
       sdkVersion: '0.1.0',
       minHostVersion: '0.1.0',
       entrypoint: 'connectorPackage',
       capabilities: ['http.fetch', 'logger'],
       executionModel: 'worker',
     },
     factory: async (host: HostContext) => new MyConnector(/* manifest */),
   };
   ```

5. **Publish the package.** Host it at an `https://` URL the desktop app can fetch (plain `https` only; `localhost` is allowed for dev registries).

### Installing via CLI

Installation is CLI-only in v1. The binary is `srgnt-connectors`, shipped from `@srgnt/desktop`.

```bash
# Install (HTTPS required; sha256 integrity check is pinned when --checksum is passed)
pnpm --filter @srgnt/desktop cli:connectors -- install https://example.com/my-connector.json \
  --connector-id my-connector \
  --checksum <sha256-hex>

# List installed packages with lifecycle state
pnpm --filter @srgnt/desktop cli:connectors -- list

# Inspect one package (redacted — no tokens, no secrets)
pnpm --filter @srgnt/desktop cli:connectors -- inspect my-connector

# Remove a package
pnpm --filter @srgnt/desktop cli:connectors -- remove my-connector

# JSON output for any command
pnpm --filter @srgnt/desktop cli:connectors -- list --json
```

Flags:

- `--workspace <path>`: override the target workspace (default `$SRGNT_WORKSPACE` or `~/srgnt-workspace`).
- `--connector-id <id>`: assert the installed package's manifest id; mismatches fail closed.
- `--checksum <sha256>`: pin the expected sha256 of the fetched package payload.
- `--json` / `--text`: output format.

Installing only writes a durable package record to the workspace. Activation (handshake, isolated runtime spawn, load) happens when the Electron app boots and calls `ConnectorPackageHost.applyRestartRecovery()`. Integrity, compatibility, or handshake failures all leave the package in a clearly-marked non-active state and the record remains inspectable and removable.

## Pi Team Workflow

If you are using [pi](https://github.com/mariozechner/pi) with this repo, the team templates are maintained **globally** only. See [`docs/pi-teams.md`](docs/pi-teams.md) for the reusable team templates and the recommended QA → bugfix → QA loop.

Quick start:

```text
create_predefined_team({ team_name: "qa", predefined_team: "qa", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "bugfix", predefined_team: "bugfix", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "review", predefined_team: "review-team", cwd: "/path/to/srgnt" })
```
