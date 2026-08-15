# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

### Execution 2026-08-15

**Measured facts (STEP-25-04 inputs)**

- **The ACP auth-required shape, verified in source, not assumed:**
  `@agentclientprotocol/sdk` 1.2.1 →
  `node_modules/.pnpm/@agentclientprotocol+sdk@1.2.1_zod@4.4.3/.../dist/jsonrpc.js:821`
  — `RequestError.authRequired(data, additionalMessage)` is JSON-RPC **`-32000`**
  with message `Authentication required[: <detail>]`. On the client side
  `jsonrpc.js:628` rejects the pending response with
  `new RequestError(code, message, data)`, and `acp/errors.ts` `fromSdkError`
  copies `code` onto `ProtocolError.code`. Detection is on the code; the message
  text is the agent's to change.
- **`Effect.runPromise` loses the code.** Probed directly: it rejects with a
  `FiberFailureImpl` whose only own key is `name`; `message` survives, `code` and
  `_tag` do not. The controller therefore captures the typed failure with
  `Effect.tapError` *before* running, which is also why nothing here matches on
  error prose.
- **The two shipped harnesses disagree about auth metadata, and both are now
  asserted against their committed fixtures** (`packages/harness/src/acp/capabilities.test.ts`):
  pi's `pi_terminal_login` → `external-command` with the command reconstructed
  from its own `args` plus the definition's `detectCommand`; opencode's
  `opencode-login` → `docs-only`, because it advertises no `type` and no `args`
  at all. Mutating the fixture's `args` changes the rendered command, which is
  what proves nothing is hardcoded.
- **`rpc-authenticate` is unreached by any shipped harness.** It exists as a
  classification and is exercised only by the mock. That the `docs-only` branch
  is the one a real harness lands on is itself the STEP-25-04 point.
- **opencode's `configOptions` were deliberately not chased** (per the brief).
  `NegotiatedCapabilities` was not widened; the matrix's `modes` column renders
  what the data says, which for opencode is "not seen". Recorded for STEP-25-04.

**What shipped**

- `packages/contracts/src/harness.ts` — `SAuthMethod` + `SAuthMethodCommand` and
  the pure `normalizeAuthMethod(raw, fallbackCommand?)`. Kind ladder: a runnable
  command (`command` string, or `type: 'terminal'` **with** a fallback
  executable) → `external-command`; a declared non-terminal `type` → 
  `rpc-authenticate`; prose only, or `terminal` with nothing to run → 
  `docs-only`. No `instructions` field: `description` is the only prose a method
  carries and a copy could disagree with it. New quirk `no-client-delegation`.
- `packages/contracts/src/ipc/contracts.ts` — channel `harness:capabilities`;
  `SHarnessCapabilityRow` / `SHarnessCapabilitiesResponse` (`state`,
  `provenance`, normalized `authMethods`, plus the STEP-25-01 cache fields passed
  through unchanged); `SChatAuthRequired` and `SChatSessionNewResult`;
  `authMethodId` on `SChatSessionNewRequest`. `harness:list` is untouched, and a
  test asserts its entry shape still has exactly `definition`/`overridden`/`detection`.
- `packages/harness/src/acp/capabilities.ts` — exported
  `SESSION_DISCOVERED_CAPABILITIES` (`modes`, `slashCommands`) next to the merge
  that owns the rule, so main computes provenance from it rather than from a
  second hand-maintained list.
- `packages/harness/src/acp/connection.ts` — `AcpAgentConnection.authenticate`.
- `packages/harness/src/registry/builtins.ts` — pi declares
  `no-client-delegation` (STEP-22-05 probe 4). This changes pi's definition
  fingerprint, so any pre-existing cached pi row renders as stale until the next
  connect — correct behaviour, and display-only.
- `packages/harness/src/testing/mock-agent/{scenario,runner}.ts` — an
  `authRequired` block (`methods`, `gateSessionNew`): initialize advertises the
  methods verbatim (extension fields included), `session/new` throws
  `RequestError.authRequired` until `authenticate` lands, and an unadvertised
  method id is refused with `-32602`. Absent block = the old unconditional `{}`.
- `packages/desktop/src/main/services/harnesses.ts` — `capabilities()` + the IPC
  handler. Rows from the registry, cells from `HarnessCapabilityCache.get` (so
  `stale` is the fingerprint decision main already owns), auth methods normalized
  with `detectCommand ?? launch.command` as the fallback executable.
- `packages/desktop/src/main/chat/session-controller.ts` — `ChatAuthRequiredError`,
  `isAuthRequiredFailure`, `AUTH_REQUIRED_CODE`, the `definition` now carried out
  of `openConnection`, and `newSession(target, project, lineage, authMethodId?)`.
- `packages/desktop/src/main/chat/index.ts` — `chat:session:new` catches the wall
  and answers with the payload; every other failure rethrows unchanged.
- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx` (new),
  `.../chat/AuthPanel.tsx` (new), `ChatSessionContext` (`authRequired`,
  `dismissAuth`, `newSession(target?, authMethodId?)`), `ChatView`, `main.tsx`
  (mounted under Harnesses, keyed by workspace root), preload + `env.d.ts`,
  `styles.css` (`chat-auth*`).

**Design calls made during execution**

- **The auth wall crosses IPC as data.** `ipcMain.handle` serializes a rejection
  to its message only, so the advertised methods could not ride on a throw. Only
  `chat:session:new` answers the union; fork and reconnect keep
  `SChatSessionNewResponse`, because an auth wall on either is a plain failure
  neither can act on.
- **`rpc-authenticate` retries on a fresh connection.** The failed connection is
  torn down at the failure (that teardown is the no-orphans invariant), so
  `authMethodId` rides on session creation and main authenticates before
  `session/new`. The alternative — parking the connection in a pending-auth map —
  would have added a second session lifecycle with its own idle-reap and
  quit-teardown edges for a case no shipped harness reaches.
- **`index.ts` duck-types the wall** (`cause.authRequired`), not `instanceof`:
  it imports the controller type-only because the controller statically imports
  the ESM-only `@srgnt/harness` and desktop-main is CommonJS.
- The renderer keeps a *column* list (which capabilities are worth showing) but
  no per-harness knowledge: a key missing from a row renders `not-measured`, and
  the "per session" caption is derived from the payload's `provenance`.
- The initialize baseline is cached even when `session/new` later fails auth
  (`reportCapabilities({})` runs at connect), so an unauthenticated harness still
  produces a measured matrix row carrying its auth methods.

**Validation notes**

- `pnpm --filter @srgnt/contracts test` 207 passed · `@srgnt/harness` 148 passed
  (+3 skipped: the gated pi/opencode ITs) · `@srgnt/runtime` 458 passed ·
  `@srgnt/desktop` 1260 passed · `pnpm -r lint` and `pnpm -r build` clean.
- `pnpm exec playwright test e2e/auth.spec.ts` — 1 passed. Real Electron main,
  real spawned mock child, real `-32000`: panel instead of a raw error, then
  `authenticate` → working session. Registered in all three `test:e2e*` lists
  (the STEP-23-05 gotcha).
- `e2e/chat.spec.ts e2e/harnesses.spec.ts e2e/sessions.spec.ts` — 14 passed
  (regression check on the surfaces this step touches).
- **Fixture → rendered row is asserted in two hops, not one.**
  `CapabilityMatrix.test.tsx` runs the real `negotiateCapabilities` over the
  committed pi-spike and opencode fixtures and asserts the rendered cells;
  `services/harnesses.test.ts` asserts cache file → row over a realistic entry.
  No single test spans disk → IPC → DOM, so the matrix is proven at those two
  seams rather than end to end.
- Only shape and counts are asserted against the opencode fixture — its catalog
  leaves are positional placeholders (`<group-0-option-0-name>`) by design.
- **NOT VALIDATED — manual:** no run against a real unauthenticated opencode
  (this machine's provider is configured, and un-configuring a developer's
  credentials was out of scope), so the checklist's "guidance is actually
  followable end-to-end" is unproven against a real agent. The `docs-only` render
  is asserted against opencode's committed method, which is what its panel would
  show. No manual GUI pass of the matrix against a live Pi session either.
- **NOT COVERED — mid-conversation auth failure.** Detection is on session
  creation only; a token expiring during a turn still surfaces through the
  STEP-23-04 prompt-error path.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Capture: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]]
- Spike: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]]
