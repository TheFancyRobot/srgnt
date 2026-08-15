# Outcome

- Record the final result, validation performed, and explicit follow-up here.

## Result

Done by automated checks, including one Electron e2e that drives the real path. Two things the brief asked for are explicitly *not* delivered as stated, and both are named at the claim below rather than buried in follow-up.

Settings gains a **Capabilities** section under Harnesses: one row per registry harness, cells sourced from the STEP-25-01 last-negotiated cache, each in one of six visually distinct states — **yes** / **no** / **clamped** (advertised, then disabled by the definition — Pi's `mcpServers`) / **forced** / **not seen** (a session-discovered field nothing has demonstrated yet) / **not measured** (never connected, or measured against a definition that has since changed). Two behavioral columns come from declared quirks rather than from the negotiation: permission gating (`permission-routing-gaps` → "self-approving", carrying the same copy as the Phase-23 trust badge) and client delegation (`no-client-delegation` → "none", otherwise honestly *not measured*). Freshness (`capturedAt` + agent version) renders per row, and a fingerprint-mismatched row says "re-connect to refresh" instead of presenting an old measurement as current. Rows, labels, docs links and badges derive from registry + cache + quirk data only — a definition invented in `harnesses.json` produces a full row with zero component changes, and there is a test that adds one.

Auth stops being a raw JSON-RPC error. `chat:session:new` answers `SChatAuthRequired` — harness name, docs link, the agent's own error text, and its advertised methods normalized to `SAuthMethod` — and `AuthPanel` renders it above the composer with Retry. The affordance is chosen by `kind` alone: `external-command` shows a copyable command **built from the method's own args plus the definition's binary**, `rpc-authenticate` re-connects and calls `authenticate(methodId)` first, `docs-only` shows the method's own instructions and its docs link. No credential input exists anywhere in the panel, and a test asserts the component renders no `input`/`textarea`/`form` at all.

**Narrower than it sounds, stated here:**

- *"The matrix reflects the committed fixtures."* Asserted across **two seams, not end to end**: `CapabilityMatrix.test.tsx` runs the real `negotiateCapabilities` over the pi-spike and opencode fixtures and checks the rendered cells; `services/harnesses.test.ts` checks cache-file → row. No test spans disk → IPC → DOM in one pass.
- *"Auth failures surface as actionable panels."* Only for **session creation**. A token expiring mid-conversation still surfaces through the STEP-23-04 prompt-error path — `chat:session:prompt` answers `{stopReason}`, and widening it was not paid for by any behaviour either shipped harness has shown.
- **No manual run against a real unauthenticated harness.** The capture machine's opencode has a configured provider, and un-configuring a developer's credentials was out of scope, so the checklist item "opencode unauthenticated → the guidance is actually followable" is **unproven against a real agent**. What is proven: opencode's committed method normalizes to `docs-only`, and the panel renders that method's own description plus its docs link. No manual GUI pass of the matrix against a live Pi session either.

`rpc-authenticate` is reached by no shipped harness (pi is `external-command`, opencode is `docs-only`); it is exercised by the mock only, and that the `docs-only` branch is where a real harness lands is itself a STEP-25-04 finding.

## Validation performed

- `pnpm --filter @srgnt/contracts test` — 207 passed (7 files), incl. the `normalizeAuthMethod` ladder, the `harness:capabilities` response schema, the session-new result union, and an assertion that `harness:list`'s entry shape is unchanged by this step.
- `pnpm --filter @srgnt/harness test` — 148 passed, 3 skipped (the gated pi/opencode ITs). New: `normalizeAuthMethod` over the **committed fixtures** — pi's `pi_terminal_login` → `external-command` with `pi --terminal-login` rebuilt from its own `args` (mutating the args or the binary changes the rendered command), opencode's → `docs-only` because it advertises no `type` and no `args`; plus the mock agent's `authRequired` gate (`-32000` until `authenticate`, `-32602` for an unadvertised method id, ungated when the block is absent).
- `pnpm --filter @srgnt/runtime test` — 458 passed (24 files), untouched by this step but re-run after the contracts/harness rebuild (STEP-25-01's stale-`dist` trap).
- `pnpm --filter @srgnt/desktop test` — 1260 passed (70 files): 11 `CapabilityMatrix` tests (fixture-driven rows, clamped/forced/stale/never-connected, quirk columns, an invented harness), 9 `AuthPanel` tests (one per kind, no-methods degradation, the no-credential-field constraint), 11 new `harness:capabilities` service tests (stale by fingerprint, ghost entry dropped, corrupt/missing cache, no workspace root), 3 controller tests driving the real mock through the wall and back, and 3 IPC tests for the data-not-throw conversion.
- `pnpm exec playwright test e2e/auth.spec.ts` — 1 passed. Real Electron main spawning the real mock child: `-32000` → panel with per-kind affordances and no error toast → `authenticate` → working session. Registered in `test:e2e`, `test:e2e:headed` and `test:e2e:full` (the STEP-23-05 gotcha).
- `pnpm exec playwright test e2e/chat.spec.ts e2e/harnesses.spec.ts e2e/sessions.spec.ts` — 14 passed (regression check on the chat and settings surfaces this step touches). The remaining e2e files were not re-run here; STEP-25-02 recorded two failures on this machine (`app.spec.ts` node-pty, `bug-0013-visual.spec.ts` missing Linux artifact) that this diff does not touch.
- `pnpm -r lint` and `pnpm -r build` — clean, including the harness boundary check.

Verified in the SDK source rather than assumed: `RequestError.authRequired` is JSON-RPC **`-32000`** in `@agentclientprotocol/sdk` 1.2.1, and the client rejects with a `RequestError` carrying that code — which `fromSdkError` copies onto `ProtocolError.code`. `Effect.runPromise` was probed directly and rejects with a `FiberFailure` that has **dropped** the code, so the controller captures the typed failure with `Effect.tapError` and never matches on the message text.

## Follow-up

- **STEP-25-04 inputs (all recorded in Implementation Notes):** auth metadata is not reliably machine-actionable, so a harness catalog needs install/auth hints; opencode's `configOptions` (mode *and* model) remain invisible because `readModes` reads only a `modes` block and `session/set_config_option` is the applying method; `session/close` and `session/fork` are advertised by opencode and unmodelled; `rpc-authenticate` is a classification no shipped harness reaches.
- **Mid-conversation auth failure** → same panel from the prompt-failure surface, when a harness demonstrates the need.
- **fs/terminal delegation is only *declarable*, never measured.** Nothing in the negotiation records it, so opencode's column reads "not measured" until a tool-invoking probe pays for it (the same probe the opencode capture already owes for permission round-trips).
- Pi's new `no-client-delegation` quirk changes its definition fingerprint, so any pre-existing cached pi row shows as stale until the next connect. Display-only and self-healing.
- The in-chat harness picker still lists `mock`/`pi` plus the project default rather than every configured harness (carried from STEP-25-02).

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Session: [[05_Sessions/2026-08-15-130000-add-capability-matrix-view-and-auth-error-surfacing-claude-opus-5|SESSION-2026-08-15-130000]]
