# Implementation Notes

- Calendar is a product-level surface, so connector output must stay normalized.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/connectors/outlook-calendar/` — Outlook Calendar connector package: manifest, Azure AD OAuth2 auth adapter, Microsoft Graph Calendar API sync, canonical event mapper, freshness hooks
- `packages/connectors/outlook-calendar/src/auth/` — Azure AD OAuth2 adapter (authorization code flow with PKCE for desktop). **This auth module should be extracted or shared** — Teams (STEP-04-04) uses the same Azure AD / Microsoft Graph auth infrastructure. Build it as `packages/connectors/shared/microsoft-auth/` or equivalent so both connectors reuse it.
- `packages/connectors/outlook-calendar/src/mapping.ts` — canonical event mapping: Graph Calendar event → canonical event entity (title, start/end, attendees, location, organizer, recurrence flag, freshness timestamp, raw metadata blob)
- `packages/connectors/outlook-calendar/fixtures/` — replayable Microsoft Graph API response fixtures for events (single, recurring, all-day, cancelled)
- Freshness model: each synced event carries `lastSyncedAt`, `providerUpdatedAt`, and a derived `freshness` status (fresh/stale/unknown)
- Tests proving: fixture-based sync, canonical event mapping, freshness derivation, timezone preservation, recurring event handling (at minimum: flag + next occurrence, full expansion deferred)

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): Microsoft Graph response shapes validated with Zod; canonical event output matches PHASE-01 contract
- DEC-0003 (Teams first): Outlook and Teams share Azure AD auth — design the auth adapter for reuse now, not after Teams lands
- DEC-0004 (macOS + Windows + Linux): OAuth2 PKCE flow must work on all three platforms (system browser redirect or loopback)
- DEC-0005 (pnpm monorepo): Own workspace package
- DEC-0007 (Dataview/markdown local data): Events persisted as local files, not database

**Starting files (must exist before this step runs):**
- Connector SDK from STEP-04-01
- Canonical entity Zod schemas from PHASE-01 (event schema)
- Runtime sync primitives from PHASE-03

**Constraints:**
- Do NOT implement full recurring event expansion in v1 — flag recurrence, expose next occurrence, defer full series expansion
- Do NOT build Outlook-specific UI logic — connector output must be provider-agnostic canonical events
- Do NOT duplicate Azure AD auth code that Teams will also need — extract shared Microsoft auth infrastructure
- Timezone handling: store in UTC internally, preserve original timezone in raw metadata. Surface timezone bugs explicitly per Human Notes rather than silently converting.

**Validation:**
A junior dev verifies completeness by:
1. Running `pnpm test --filter @srgnt/connector-outlook-calendar` — all fixture tests pass
2. Confirming canonical event entities Zod-parse successfully from fixture sync output
3. Checking freshness timestamps: `lastSyncedAt` and `providerUpdatedAt` are both present and `freshness` status derivation is tested for fresh/stale/unknown cases
4. Verifying the Azure AD auth adapter is importable from a shared location (not buried inside the Outlook connector)
5. Confirming timezone and recurrence edge cases are either handled or explicitly documented as deferred with tracking notes

**Junior-readiness verdict:** PASS — Execution prompt is specific. The main complexity is Azure AD auth and timezone/recurrence handling. The constraint to extract shared Microsoft auth and to defer full recurrence expansion keeps scope manageable. Note: this step can run in parallel with STEP-04-02 and STEP-04-04 after STEP-04-01.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_03_implement-outlook-calendar-connector-fixtures-and-freshness-hooks|STEP-04-03 Implement Outlook Calendar Connector Fixtures And Freshness Hooks]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
