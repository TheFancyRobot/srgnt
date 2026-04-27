# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

### Refinement (readiness checklist pass)

**Exact outcome:**
- Desktop settings persist installation separately from runtime connection state.
- Fresh workspaces serialize an empty install set.
- Legacy settings files with `jira: true` / `outlook: true` / `teams: true` migrate deterministically to the new install-state structure without installing anything else.

**Key decisions to apply:**
- Install state is durable workspace configuration; availability is not.
- Migration should preserve explicit prior intent only; absence is not consent.
- Keep the serialized shape simple and inspectable in `.command-center/config/desktop-settings.json`.

**Starting files and likely touch points:**
- `packages/contracts/src/ipc/contracts.ts` for `SDesktopConnectorPreferences` and `SDesktopSettings`.
- `packages/contracts/src/ipc/contracts.test.ts` for parser/default behavior.
- `packages/desktop/src/main/settings.ts` for defaults, merges, and file read/write behavior.
- `packages/desktop/src/main/settings.test.ts` for migration/default assertions.
- `packages/desktop/src/main/index.ts` only as a consumer of the new settings shape.

**Constraints and non-goals:**
- Do not persist `available` in settings.
- Do not silently install connectors during first run.
- Do not remove legacy compatibility until tests prove the migration path works.
- Do not mix in auth/session secrets; persisted install state stays non-secret.

**Edge cases and failure modes:**
- Missing `connectors` blocks in older settings files must still read safely.
- Unknown connector IDs in a future or hand-edited file should be ignored or normalized safely rather than crashing startup.
- Partial settings writes must still merge layout/theme defaults correctly.

**Security:**
- Workspace settings may store only non-secret installation intent.
- Secret/session state stays outside this file and outside the renderer-visible settings payload.

**Performance:**
- Migration must happen once during read/merge, not on every render loop.
- Avoid expensive deep transforms; the setting is a tiny record.

**Validation:**
1. `pnpm -C packages/contracts test -- --filter ipc`
2. `pnpm -C packages/desktop test -- --filter settings`
3. Manual smoke: delete desktop settings, relaunch, and confirm the written default file still contains zero installed connectors.
4. Manual smoke: create a legacy-style settings fixture with one `true` connector flag and confirm only that connector migrates to installed.

**Junior-readiness verdict:** PASS — this step is implementation-ready as long as the migration rule above is followed literally.

## Related Notes

- Step: [[02_Phases/Phase_19_implement_connector_pluggability/Steps/Step_02_separate-connector-availability-from-enabled-state-in-desktop-settings-and-settings-schema|STEP-19-02 Separate connector availability from enabled state in desktop settings and settings schema]]
- Phase: [[02_Phases/Phase_19_implement_connector_pluggability/Phase|Phase 19 implement connector pluggability]]
