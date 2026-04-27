# Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.
- Migrated the remaining production consumer schemas to Effect Schema in `packages/sync/src/engine.ts`, `packages/sync/src/classification.ts`, `packages/fred/src/boundary.ts`, `packages/entitlements/src/index.ts`, and `packages/desktop/src/main/pty/contracts.ts`.
- Updated `packages/desktop/src/main/pty/node-pty-service.ts` to decode PTY request and process payloads with `parseSync(...)` instead of Zod `.parse()`.
- Repaired validation fallout in `packages/runtime/src/store/canonical.test.ts` by switching the runtime validator fixture from `zEntityEnvelope` to `SEntityEnvelope`.
- Consumer-package tests now validate the Effect schemas directly via `safeParse(...)` / `parseSync(...)`, especially in `packages/desktop/src/main/terminal/terminal-ipc.test.ts`, `packages/fred/src/boundary.test.ts`, and `packages/entitlements/src/index.test.ts`.

## Related Notes

- Step: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Steps/Step_04_migrate-consumer-packages-runtime-desktop-sync-entitlements-fred|STEP-06-04 Migrate consumer packages runtime desktop sync entitlements fred]]
- Phase: [[02_Phases/Phase_06_replace_zod_with_effect_schema/Phase|Phase 06 replace zod with effect schema]]
