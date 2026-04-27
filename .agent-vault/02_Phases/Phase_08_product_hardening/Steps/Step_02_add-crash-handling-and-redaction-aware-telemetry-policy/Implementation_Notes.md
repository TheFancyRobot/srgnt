# Implementation Notes

- Sensitive workspace content should default to redacted or local-only handling.
### Refinement (readiness checklist pass)

**Exact outcome:**
- Error boundary component(s) in `packages/desktop/renderer/` — React error boundaries wrapping major UI regions with graceful fallback UI
- Crash handler in `packages/desktop/main/` — `process.on('uncaughtException')` and `process.on('unhandledRejection')` with local crash log writing
- Telemetry policy document in `.agent-vault/06_Shared_Knowledge/telemetry-policy.md` classifying events into: (a) local-only, (b) may-send-redacted, (c) never-capture
- Redaction utility in `packages/runtime/` (or `packages/telemetry/`) — a function that strips workspace content, file paths, and user data from error payloads before any potential remote send
- Crash report local storage: crash logs written under `app.getPath('userData')/crashes/` (or equivalent platform-safe path) with rotation
- Remote crash reporting is explicitly out of scope for this step. If later work wants Sentry or another service, record a dedicated decision note then; the hardening phase must succeed with local-only crash logging.
- One integration test or manual script that triggers a controlled crash and verifies: (a) error boundary catches renderer crash, (b) main process crash is logged locally, (c) crash payload passes through redaction before any write

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — crash payload schemas and telemetry event schemas should be defined with Zod
- DEC-0004 (all three platforms) — crash log paths must work on macOS, Windows, and Linux (use `app.getPath('userData')` or equivalent)
- DEC-0007 (markdown/local data) — crash logs are local files, not database records

**Starting files:**
- `packages/desktop/main/` and `packages/desktop/renderer/` must exist with working Electron app
- `packages/runtime/` must exist (from PHASE-03)
- PHASE-08 STEP-01 packaging pipeline should be complete (so crash handling can be tested in packaged builds)

**Constraints:**
- Do NOT send any telemetry remotely in this step — remote reporting is a future decision. All crash data stays local.
- Do NOT log workspace file contents, user markdown, or file paths in crash reports — redaction is mandatory
- Do NOT make Sentry (or any remote service) a hard dependency — the crash system must function fully offline
- Do NOT capture renderer console.log as telemetry — only structured crash/error events
- Sensitive fields to redact by default: raw workspace markdown/body content, absolute file paths, connector tokens, OAuth callback params, environment variables, and user-entered prompt text

**Validation:**
1. Trigger a renderer error — verify error boundary catches it and shows fallback UI (not a white screen)
2. Trigger a main process unhandled exception — verify crash log is written to the local crashes directory
3. Inspect a crash log payload — verify no workspace content, no file paths, no user-authored text appears
4. Verify Zod schemas exist for crash event and telemetry event types
5. Verify telemetry policy doc exists and classifies at least 5 event categories
6. Run the app with no network — verify crash handling works identically (no remote dependency)

**Junior-readiness verdict:** PASS — the step is now scoped to local-only crash logging plus a redaction policy. The redaction utility has an explicit sensitive-field list, and any future remote reporting choice is intentionally deferred into its own decision note.

## Related Notes

- Step: [[02_Phases/Phase_08_product_hardening/Steps/Step_02_add-crash-handling-and-redaction-aware-telemetry-policy|STEP-08-02 Add Crash Handling And Redaction Aware Telemetry Policy]]
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
