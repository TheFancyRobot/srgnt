# Validation Plan

## Commands

- `pnpm --filter @srgnt/contracts test` — `SCatalog`/`SCatalogEntry` + IPC schemas; snapshot fixture decodes against the schema (a committed-snapshot decode test is mandatory — a schema change that orphans the snapshot must fail CI).
- `pnpm --filter @srgnt/harness test` — `catalog.ts` unit suite (injected fetcher; no real network in unit tests, ever).
- `pnpm --filter @srgnt/desktop test` / `test:e2e` — catalog view + add-flow specs (offline path is the e2e default).
- Manual online pass: `pnpm --filter @srgnt/desktop dev` with network up.

## Acceptance Checks

- **Offline is the primary path:** with a fetcher that always fails (and in e2e, with no network calls made at all), the catalog view renders every snapshot entry, and the full add flow completes: select entry → editor prefilled → confirm → entry in `harnesses.json` → detection chip renders (`not-installed` + install hint for an uninstalled agent). This exercises the aggregator-era lesson end to end.
- Added entry is an ordinary custom definition: decodes via `SHarnessDefinition`, `source: 'custom'`, listed by the registry, editable/deletable via STEP-26-01, zero special-casing observable anywhere downstream.
- **Online (manual, if a feed exists):** explicit Refresh fetches, list updates, source badge flips to remote; killing the network and refreshing again degrades to the snapshot with a non-blocking notice — the view never empties.
- **Real-agent proof (manual, gated):** Gemini CLI added via the catalog, installed by hand per the install hint, passes the STEP-26-02 conformance runner's deterministic checks — this is the phase acceptance criterion "registry browse/add works … definition then passes the conformance runner".
- No fetch at startup and none on merely opening Settings: assert via e2e network interception that the only fetch fires on the explicit Refresh action (DEC-0017 compliance check).

## Edge Cases

- Malformed remote payload (invalid JSON, schema-invalid entries, empty list) → snapshot served + typed failure detail surfaced as the notice; no partial/mixed list.
- Remote entry colliding with a built-in id → catalog marks it "built-in"; adding it follows the editor's shadow-warning flow, not a silent override.
- Snapshot missing/corrupt (simulated broken packaging) → catalog view shows a readable error; the rest of the Harnesses section is completely unaffected.
- Slow remote (hung fetch) → hard timeout, snapshot remains interactive throughout — the fetch must never block rendering.
- Entry already added (id exists in `harnesses.json`) → catalog shows "configured" state instead of a duplicate add.

## Regression Expectations

- STEP-26-01 editor suites green (the add flow reuses its create path — any editor validation change breaks both or neither).
- No new network activity in any non-catalog flow (startup, chat, settings load) — re-run the e2e network assertion suite-wide.
- `pnpm build` green; packaged-app smoke check that `snapshot.json` ships in the build (fixture path resolution differs in packaged Electron — the STEP-25-02 PATH lesson's cousin).

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_03_integrate-acp-registry-catalog-with-bundled-snapshot-fallback|STEP-26-03 Integrate ACP Registry catalog with bundled snapshot fallback]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
