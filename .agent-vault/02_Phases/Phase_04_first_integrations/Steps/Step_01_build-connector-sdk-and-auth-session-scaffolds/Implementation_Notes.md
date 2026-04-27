# Implementation Notes

- Secrets and session refresh belong in privileged local services.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/connectors/sdk/` — shared connector SDK package containing: manifest schema (Zod), auth/session lifecycle interfaces, sync-cursor abstraction, canonical mapping hook types, and connector registration/discovery mechanism
- `packages/connectors/sdk/src/auth/` — OAuth2 session scaffolds (token storage in main process, refresh lifecycle, session expiry handling)
- `packages/connectors/sdk/src/testing/` — fixture-friendly test harness: mock connector factory, fake auth provider, replayable sync stubs
- `packages/connectors/shared/microsoft-auth/` — shared Azure AD auth boundary reserved for Outlook Calendar and Teams so both connectors reuse the same token-storage and refresh-path rules
- IPC channel definitions in `packages/desktop/preload/` exposing narrow connector status surface (no token/secret leakage)
- One dummy connector that exercises register → auth → sync → status → teardown lifecycle
- Targeted SDK unit tests + dummy connector smoke test

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod): All connector manifests, auth state shapes, sync cursors, and canonical mapping contracts must be Zod schemas — no `any` or `unknown` escape hatches in the SDK's public API
- DEC-0005 (pnpm monorepo): SDK must be a proper pnpm workspace package, importable by connector packages
- DEC-0007 (Dataview/markdown local data): Sync state and connector metadata are persisted as local markdown files, not a database — SDK must expose file-path-based persistence hooks, not database adapters

**Starting files (must exist before this step runs):**
- Zod contract schemas from PHASE-01 (`packages/contracts/`)
- Privileged boundary scaffolding from PHASE-02 (preload/IPC layer in `packages/desktop/`)
- Runtime foundation from PHASE-03 (`packages/runtime/`)

**Constraints:**
- Secrets (tokens, refresh tokens, client secrets) must NEVER be accessible from the renderer process — main process only
- SDK must NOT bake in provider-specific logic; it is the framework, not a connector
- Do NOT introduce a database — persist via markdown/file layer per DEC-0007
- Do NOT create generic privileged bridges — IPC surface must be narrow and explicit (per Human Notes)
- Shared Microsoft auth must own Azure AD token storage and refresh for both Outlook Calendar and Teams; do not duplicate those flows inside per-connector packages

**Validation:**
A junior dev verifies completeness by:
1. Running `pnpm test --filter @srgnt/connector-sdk` and seeing all SDK unit tests pass
2. Running the dummy connector smoke test and confirming register → auth → sync → status lifecycle completes
3. Checking that no Zod schema uses `z.any()` or `z.unknown()` in public API surface
4. Grepping renderer code to confirm zero direct access to token/secret values
5. Confirming the dummy connector is importable from a separate workspace package
6. Confirming Outlook Calendar and Teams can both import the same shared Microsoft auth module without token values crossing into renderer code

**Junior-readiness verdict:** PASS — The execution prompt is concrete (implement SDK, add test hooks, validate with dummy connector). The main risk is scope creep into provider-specific logic. The constraints above and existing Human Notes guard against that. A junior dev with PHASE-01/02/03 artifacts can execute this.

## Related Notes

- Step: [[02_Phases/Phase_04_first_integrations/Steps/Step_01_build-connector-sdk-and-auth-session-scaffolds|STEP-04-01 Build Connector SDK And Auth Session Scaffolds]]
- Phase: [[02_Phases/Phase_04_first_integrations/Phase|Phase 04 first integrations]]
