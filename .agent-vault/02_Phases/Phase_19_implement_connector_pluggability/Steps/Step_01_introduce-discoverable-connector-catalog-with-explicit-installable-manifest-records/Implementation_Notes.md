# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- One obvious catalog source exists for bundled connector metadata (`id`, `name`, `description`, `provider`, `version`, and any manifest-derived fields kept in Phase 19).
- Desktop code can derive a connector list from that catalog even when the workspace has installed nothing.
- The install-before-use invariant remains true: catalog presence must never imply `installed = true`.

**Key decisions to apply:**
- Bundled catalog only for v1; no remote lookup and no dynamic downloader.
- Favor a shared manifest-backed or manifest-compatible catalog shape over one-off inline records in `main/index.ts`.
- Keep connector IDs stable (`jira`, `outlook`, `teams`) because later steps, existing tests, and settings migration depend on them.

**Starting files and likely touch points:**
- `packages/contracts/src/connectors/manifest.ts` for manifest-compatible metadata.
- `packages/contracts/src/connectors/index.ts` if a catalog type or helper must be exported.
- `packages/contracts/src/ipc/contracts.ts` if list-entry types should reference catalog-driven fields more directly.
- `packages/desktop/src/main/index.ts` to stop treating inline connector definitions as the only catalog source.

**Constraints and non-goals:**
- Do not change the persisted settings schema yet.
- Do not introduce install/uninstall handlers yet.
- Do not add live provider auth/session data to the catalog.
- Do not default-install connectors for tests, onboarding, or fresh workspaces.

**Edge cases and failure modes:**
- Unknown connector IDs must fail closed instead of inventing placeholder metadata.
- Missing catalog fields should fail tests instead of degrading silently in the renderer.
- Teams and Outlook may share a provider family, but they still need distinct catalog entries and IDs.

**Security:**
- Catalog records are non-secret metadata only.
- No auth tokens, scopes, callback URLs, or provider secrets should move into renderer-visible catalog payloads.

**Performance:**
- This step should stay in-memory and deterministic; no filesystem scan or remote fetch is justified.
- Avoid rebuilding connector metadata in multiple processes if one exported record can be reused.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter connector`
3. Manual smoke: fresh app state still lists discoverable connectors with `installed = false`.

**Junior-readiness verdict:** PASS — bounded scope, clear starting files, and explicit non-goals make this safe to execute first.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_01_introduce-discoverable-connector-catalog-with-explicit-installable-manifest-records|STEP-19-01 Introduce discoverable connector catalog with explicit installable manifest records]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
