# Implementation Notes

- Deletion executed in brief order: leaf packages (fred/entitlements/sync/executors) -> renderer views/sidepanels -> preload channels -> main cli/, connectors/, dev-connectors/ -> packages/connectors + examples/ -> contracts src/{connectors,executors} -> e2e pruning.
- Pulled forward two small STEP-21-03 slices because they typed against deleted contracts: `packages/runtime/src/runs/` (skill-run history; not exported from the package entry, only self-tests used it) and `loadConnectorManifest` in `packages/runtime/src/loaders/manifest.ts` (skill-manifest loading kept).
- `SDesktopSettings.connectors` had to go with contracts `src/connectors/` (its `installedPackages` schema lived there). `mergeDesktopSettings` in `packages/desktop/src/main/settings.ts` now strips a legacy `connectors` key from old profiles on read so stale settings files load cleanly (regression test added in settings.test.ts).
- Persisted-layout edge case: LayoutContext never persisted activePanel (only sidebarWidth/sidebarCollapsed reach desktop-settings), and `setActivePanel` ignores unregistered ids — no migration guard needed. Default panel is now `notes`.
- E2E behavior shift: app boots into Notes, so every legacy "click Notes to navigate" step would now collapse the side panel; removed those clicks across app.spec, ui-coverage-matrix, gfm-compliance, semantic-search specs, packaged.spec, bug-0013 helpers. Onboarding is 2 steps (workspace -> ready), so all walks click Next once.
- Preload sync regression tests (`preload-ipc-sync.test.ts`, `preload-self-contained.test.ts`) compare against built contracts dist — they fail until `pnpm build` refreshes `packages/contracts/dist` after channel changes.

## Related Notes

- Step: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Steps/Step_02_delete-aggregator-packages-ui-ipc-and-cli-surfaces|STEP-21-02 Delete aggregator packages UI IPC and CLI surfaces]]
- Phase: [[02_Phases/Phase_21_pivot_groundwork_and_aggregator_teardown/Phase|Phase 21 pivot groundwork and aggregator teardown]]
