# srgnt Testing Guide

## Core Commands

```bash
pnpm install
pnpm --filter @srgnt/desktop build:icons
pnpm test
pnpm --filter @srgnt/desktop test
pnpm --filter @srgnt/desktop test:e2e
pnpm --filter @srgnt/desktop test:e2e:packaged:linux
pnpm --filter @srgnt/desktop dist:rpm:fedora
pnpm run release:check:repo
pnpm run release:rc:linux
```

## Release Candidate Shortcuts

- `pnpm run release:check:repo` runs the repo-side release gate: icon generation, workspace tests, desktop Electron E2E, and packaged Linux smoke.
- `pnpm run release:artifacts:linux` builds the Linux AppImage plus the Fedora RPM.
- `pnpm run release:rc:linux` runs the full Linux release-candidate path end to end.
- Treat macOS/Windows installer verification as a separate external sign-off after the repo-side release candidate is green.

## Desktop Development

```bash
pnpm --filter @srgnt/desktop dev
```

## Connector Package CLI

Manage third-party connector packages with the `srgnt-connectors` CLI:

```bash
pnpm run cli:connectors -- help
pnpm run cli:connectors -- install https://example.com/pkg.json --connector-id demo --json
pnpm run cli:connectors -- list --workspace "$SRGNT_WORKSPACE"
pnpm run cli:connectors -- inspect demo --json
pnpm run cli:connectors -- remove demo@1.0.0
```

The CLI only writes durable package records into `.command-center/config/desktop-settings.json`. The Electron desktop boots the isolated worker runtime on next launch. Only `https://` URLs (plus `http://localhost` dev registries) are accepted; the CLI fails closed on checksum, connector-id, or manifest validation errors and returns a non-zero exit status with a structured JSON error body when `--json` is passed.

The Electron app now supports:

- first-run onboarding that creates a local workspace
- settings persisted in `.command-center/config/desktop-settings.json`
- connector status stored through main-process IPC instead of renderer-only timers
- local redacted crash logs plus a renderer fallback screen
- release-QA utility actions for update checks and diagnostic crash logging
- generated platform icon assets from `packages/desktop/build/icon.svg`

## Automated Coverage

### Workspace-wide

- `pnpm test` runs all package and example test suites.
- `pnpm build` rebuilds all workspace packages and refreshes tracked `dist/` outputs.

### Desktop unit tests

- crash redaction and crash-log rotation helpers
- workspace bootstrap and desktop settings persistence helpers
- PTY service and terminal IPC schemas
- renderer component smoke coverage for Today and Calendar

### Desktop E2E

`pnpm --filter @srgnt/desktop test:e2e` validates:

- onboarding and first-run workspace creation
- navigation across Today, Calendar, Connectors, and Settings
- connector connect/disconnect flows through preload IPC
- persisted desktop settings written to workspace config
- diagnostic crash-log writing and redaction
- privileged PTY launch and briefing persistence
- renderer security boundaries (`require` and `process` are not exposed)

`pnpm --filter @srgnt/desktop test:e2e:packaged:linux` validates the packaged Linux launch path.

## Manual Release Checks Still Needed

- macOS installer, notarization, and update-feed validation
- Windows installer and SmartScreen validation
- accessibility audit across onboarding, settings, and navigation
- performance baseline capture (cold start, idle memory, long-run memory)
- live release publishing and hosted update feed verification

## Current Known Gaps

- Fedora local RPM packaging now uses `packages/desktop/scripts/build-fedora-rpm.sh`; install `libxcrypt-compat` and `rpm-build` first.
- Update checks are wired, but a real hosted release feed is still an operator step.

## Pi Team Workflow

If you use [pi](https://github.com/mariozechner/pi) while working on this repo, the team templates are maintained **globally** only. See [`docs/pi-teams.md`](docs/pi-teams.md) for the reusable review/bugfix workflow.

The shortest productive loop is:

```text
create_predefined_team({ team_name: "qa", predefined_team: "qa", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "bugfix", predefined_team: "bugfix", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "review", predefined_team: "review-team", cwd: "/path/to/srgnt" })
```

Recommended use:
- run `qa` first to surface issues and regressions
- run `bugfix` on the reported issues
- use `review-team` when you want one orchestrator to keep the handoff moving automatically
- keep only one orchestrator active at a time to avoid duplicate routing
