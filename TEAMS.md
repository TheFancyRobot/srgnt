# Team Instructions for srgnt

## Project Overview
- **Name:** srgnt
- **Type:** Desktop-first personal command center
- **Stack:** Electron monorepo with pnpm
- **Location:** `/home/gimbo/dev/srgnt`

## Project Structure
- `packages/contracts/` - IPC contracts and shared types
- `packages/desktop/` - Electron main/renderer process
- `packages/desktop/src/main/` - Main process code
- `packages/desktop/src/preload/` - Preload scripts
- `packages/desktop/src/renderer/` - React renderer components

## Commands
- `pnpm typecheck` - Type checking
- `pnpm lint` - Linting
- `pnpm test` - Run tests
- `pnpm --filter @srgnt/desktop test` - Desktop-specific tests
- `pnpm --filter @srgnt/contracts test` - Contracts tests

## Key Technologies
- Electron
- React
- TypeScript
- Effect-TS
- CodeMirror 6 (codemirror-live-markdown)
- pnpm workspaces

## Current Context
- New `shell:open-external` IPC feature for opening links from Markdown editor
- Wiki link resolution is still a stub (disabled for now)
- LayoutContext has known unhandled-error issues
