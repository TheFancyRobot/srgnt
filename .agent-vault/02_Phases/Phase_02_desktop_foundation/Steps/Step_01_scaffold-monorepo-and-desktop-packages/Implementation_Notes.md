# Implementation Notes

- Framework recommends a monorepo shape with app, connector, skill, executor, and docs packages.
- This is the step that should freeze the command names later steps use for validation.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `pnpm-workspace.yaml` defining workspace packages
- Root `package.json` with `pnpm` engine constraint and workspace scripts: `install`, `typecheck`, `test`, `desktop:dev` (smoke)
- `packages/contracts/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `packages/runtime/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `packages/desktop/package.json` + `tsconfig.json` with Electron dev dependency, React renderer dependencies, and placeholder `main/index.ts`, `preload/index.ts`, and `renderer/main.tsx`
- `packages/connectors/package.json` + `tsconfig.json` (empty src/ with barrel export)
- `examples/` directory with at least one placeholder README
- Root `tsconfig.base.json` with shared compiler options and project references
- Renderer stack frozen here for downstream consistency: `packages/desktop/renderer/` uses React + TypeScript. If implementation must deviate, record a decision note and update downstream step references before coding.

**Key decisions to apply:**
- DEC-0005 (pnpm as monorepo package manager) — this is the primary decision for this step
- DEC-0002 (TypeScript + Zod) — tsconfig and Zod dependency setup
- DEC-0004 (macOS + Windows + Linux) — Electron config must not assume a single OS

**Starting files:**
- Existing `.agent-vault/` vault (do not disturb)
- Existing root files (if any) — verify repo is vault-only before scaffolding

**Constraints:**
- Do NOT use npm, yarn, or bun — pnpm only (DEC-0005)
- Do NOT add any runtime application code — this step produces skeleton only
- Do NOT install Electron globally — workspace-local dev dependency only
- Do NOT create `apps/` top-level directory — use `packages/` per PHASE-01 monorepo layout

**Validation:**
1. `pnpm install` succeeds from repo root with no errors
2. `pnpm typecheck` (or `pnpm -r exec tsc --noEmit`) passes across all packages
3. `pnpm test` runs (even if zero tests, it should not error)
4. `pnpm --filter desktop dev` or equivalent starts Electron and shows a window (blank is fine)
5. `pnpm ls -r` shows the expected package graph: contracts, runtime, desktop, connectors

**Junior-readiness verdict:** PASS — well-scoped scaffolding step with clear deliverables, canonical package paths, and an explicit renderer-stack default for downstream notes.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_01_scaffold-monorepo-and-desktop-packages|STEP-02-01 Scaffold Monorepo And Desktop Packages]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
