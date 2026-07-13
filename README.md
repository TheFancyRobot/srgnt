# srgnt

Desktop command center for CLI coding agents, built with Electron.

srgnt speaks the [Agent Client Protocol](https://agentclientprotocol.com) (ACP) to run, supervise, and persist sessions with coding-agent harnesses (Pi, opencode, custom agents). The product pillars: a chat GUI over any ACP agent, sessions organized into projects, honestly-resumable local-first session history, and Groups — multiple harness instances collaborating through a srgnt-provided bus.

> **Pivot note (2026-07-10).** srgnt was previously a personal data aggregator (Jira/Outlook/Teams connectors, Today/Calendar views, a connector-package CLI). That product line is retired and its surfaces were removed in Phase 21. The rationale lives in vault decision `DEC-0017`; the target architecture is `ARCH-0009` (`.agent-vault/01_Architecture/ACP_Command_Center_Target_Architecture.md`).

## Project Structure

```
srgnt/
├── packages/
│   ├── tsconfig/          # Shared TypeScript configs
│   ├── contracts/         # effect/Schema domain + IPC contracts (Project, Session, SessionEvent, HarnessDefinition)
│   ├── runtime/           # Local-first persistence & policy: workspace v2 bootstrap, approvals, policy, logs, semantic search
│   └── desktop/           # Electron main/preload/renderer; main-process logic composed from services/ modules
├── docs/                  # Dev workflow docs (pi-teams.md)
├── .agent-vault/          # Durable roadmap, phase, and architecture notes
└── TESTING.md             # Testing guide
```

A fifth package, **`@srgnt/harness`, is planned for Phase 22 and does not exist yet**: a pure-Node package (zero Electron imports) holding all agent-facing logic — the ACP SDK wrapper, harness registry, process supervisor, group broker, and a scriptable mock-agent test substrate.

### Package boundaries

- `@srgnt/contracts` — `effect/Schema` definitions only (entities, workspace, IPC); no runtime behavior.
- `@srgnt/runtime` — owns disk layout and policy. Workspace v2 bootstrap creates `projects/`, `groups/templates/`, `harnesses.json`, and `settings.json` under the workspace root. Never speaks ACP.
- `@srgnt/desktop` — Electron composition root. Main-process services live in `packages/desktop/src/main/services/` (window, workspace, settings, terminal, shell, crash, updater, semantic-search); the renderer keeps the three-panel workspace shell, notes editor, and terminal panel.
- `@srgnt/harness` *(upcoming, Phase 22)* — all ACP/harness logic; never touches disk layout.

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

# Run the desktop app in dev mode
pnpm --filter @srgnt/desktop dev

# Run the desktop Electron E2E suite
pnpm test:e2e

# Smoke test the packaged Linux desktop build
pnpm test:e2e:packaged:linux
```

## Desktop QA

The desktop app has a dedicated `Desktop E2E` GitHub Actions workflow that runs on Linux and validates both:

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
