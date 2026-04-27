# Implementation Notes

- Repo evidence today: only `AGENTS.md` and `.agent-vault/` exist at the project root.
- `srgnt_framework.md` recommends a monorepo-style repo strategy, but no package layout has been implemented yet.
### Refinement (readiness checklist pass)

**Exact outcome**: A `pnpm-workspace.yaml` and directory tree committed to the repo with these packages:
- `packages/contracts/` — shared Zod schemas and inferred types (entities, manifests, executor)
- `packages/runtime/` — placeholder for PHASE-03 runtime code
- `packages/desktop/` — placeholder for PHASE-02 Electron shell
- `packages/connectors/` — placeholder for PHASE-04 connector packages
- `packages/sync/` — reserved for PHASE-09 sync-preparation schemas and interfaces
- `packages/entitlements/` — reserved for PHASE-10 entitlement contracts
- `packages/fred/` — reserved for PHASE-10 premium orchestration interfaces
- `examples/skills/daily-briefing/` — worked skill example
- `examples/connectors/jira/` — worked connector example

**Key decisions to apply**:
- DEC-0002: All contract files are TypeScript + Zod. Package uses `zod` as a dependency.
- DEC-0005: Monorepo uses pnpm. This step creates `pnpm-workspace.yaml` and root `package.json`.
- DEC-0007: Entity data is stored as markdown with YAML frontmatter. The contracts package defines Zod schemas that validate frontmatter shapes.

**Starting files**: Only `AGENTS.md` and `.agent-vault/` exist. This step creates all new product directories.

**Constraints**:
- Do not install Electron, UI frameworks, or runtime dependencies — only `zod` and `typescript` in the contracts package.
- Do not create package stubs with business logic — only `package.json`, `tsconfig.json`, and a `src/index.ts` barrel export per package.
- Do not create an `apps/desktop/` root; downstream notes must use `packages/desktop/` as the canonical desktop package path.

**Validation**:
- `pnpm install` succeeds from repo root.
- `pnpm -r run typecheck` succeeds (all packages compile).
- Every later PHASE-01 step can name an exact file path under `packages/contracts/src/`.

**Junior-readiness verdict**: PASS. The step now has explicit directory names, tooling choices, and a validation command.

## Related Notes

- Step: [[02_Phases/Phase_01_foundation_contracts/Steps/Step_01_freeze-repo-layout-and-contract-locations|STEP-01-01 Freeze Repo Layout And Contract Locations]]
- Phase: [[02_Phases/Phase_01_foundation_contracts/Phase|Phase 01 foundation contracts]]
