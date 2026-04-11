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

## Pi Team Workflow

If you are using [pi](https://github.com/mariozechner/pi) with this repo, the team templates are maintained **globally** only. See [`docs/pi-teams.md`](docs/pi-teams.md) for the reusable team templates and the recommended QA → bugfix → QA loop.

Quick start:

```text
create_predefined_team({ team_name: "qa", predefined_team: "qa", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "bugfix", predefined_team: "bugfix", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "review", predefined_team: "review-team", cwd: "/path/to/srgnt" })
```
