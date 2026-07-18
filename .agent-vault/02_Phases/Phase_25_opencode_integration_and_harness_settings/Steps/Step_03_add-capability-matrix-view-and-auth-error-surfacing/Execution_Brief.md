# Execution Brief

## Why

- ARCH-0009's capability-driven-degradation invariant needs a human-legible surface: features silently missing per harness erode trust; a matrix that says *what* each harness supports and *why a cell is off* (advertised-but-clamped vs never advertised vs not yet measured) is the trust story made visible. It also closes the phase acceptance criterion "capability differences render as visible degradation, never silent failure".
- The Pi row is already known ground truth from the spike (loadSession true, resumeSession false, mcpServers advertised-then-clamped, permission self-approving via quirk); opencode's row comes from STEP-25-01's capture. Rendering both from the same persisted data proves nothing is hardcoded per harness.
- Auth becomes real this phase: opencode needs a configured/authenticated provider, and pi-acp advertises a `pi_terminal_login` auth method. Today an auth failure would surface as a raw JSON-RPC error in chat — unacceptable UX for the first thing a new opencode user hits.

## Prerequisites

- STEP-25-01 merged (capability cache + `authMethods` on `NegotiatedCapabilities` + opencode fixtures). STEP-25-02 can run in parallel (phase note); if its Harnesses settings section isn't merged yet, land the matrix as its own settings section and converge later — do not block.
- Read: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|spike report]] (the expected Pi row + probe 1's self-approval finding), `packages/harness/src/acp/capabilities.ts` (negotiated vs effective; which fields are init-negotiated vs discovered mid-session — `modes`/`slashCommands` default false and arrive via `session/new`/`available_commands_update`), `packages/contracts/src/harness.ts` (quirk vocabulary), STEP-23-03's brief + shipped `TrustBadge` (quirk-driven badge pattern this step extends), STEP-23-04's error surfaces (where auth panels slot in).

## Likely Code Paths

- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx` (NEW) — rows: every registry harness (from `harness:list` / a `harness:capabilities` IPC carrying `{negotiated, effective, quirks, capturedAt}` per id); columns: `loadSession`, `resumeSession`, `modes`, `slashCommands`, `images`, `audio`, `embeddedContext`, MCP (stdio/http/sse grouped), plus two **quirk-driven behavioral columns** that are NOT in `NegotiatedCapabilities`: permission gating (self-approving when `permission-routing-gaps`) and fs/terminal delegation (none for Pi — adapter runs tools in-process, spike probe 4). Cell states, each visually distinct: **yes** / **no** / **clamped** (negotiated true, effective false — "advertised, disabled by definition override", the Pi `mcpServers` case) / **forced** (negotiated false, effective true) / **not yet measured** (no cache entry — harness never connected; render honestly, never as "no").
- Data honesty rule: `modes` and `slashCommands` are discovered mid-session, not at initialize — the matrix must caption these cells ("discovered per session") rather than implying a hard no from the negotiated default `false`. The Pi thinking-levels-as-modes finding (spike probe 3) is the concrete example.
- Freshness: show `capturedAt` + agent version per row; a stale row (definition/override changed since capture) gets a "re-connect to refresh" hint. **Recorded assumption:** no auto-probe button this step — capabilities refresh on natural session connects (a "Test harness" button is Phase 26's conformance runner; don't pre-build it).
- Auth surfacing — `packages/desktop/src/renderer/components/chat/AuthPanel.tsx` (NEW): when session setup (`session/new`, or first prompt) fails with the ACP auth-required error, the chat error surface renders a panel instead of a raw error: harness name, the advertised `authMethods` (id/name/description from cached/live capabilities), per-method guidance, and the definition's `docsUrl` link, plus a Retry button that re-attempts session creation after the user authenticates externally.
- Auth flow plumbing (`packages/desktop/src/main/chat/` + IPC): **recorded assumption (v1 scope):** terminal-type auth methods (both known harnesses' reality — pi's `pi_terminal_login` wraps `pi --terminal-login`; opencode's `opencode auth login` is a terminal flow) are treated as *external*: the panel shows the copyable command and the user runs it in their own terminal (or the app's TerminalPanel), then hits Retry. The ACP `authenticate(methodId)` RPC is called only for methods that are non-interactive. **Executor must verify** the exact auth-required error shape surfaced by `@agentclientprotocol/sdk` 1.2.1 (error code/name for auth required) before wiring detection — record it in Implementation Notes; it is also a lessons-learned data point for STEP-25-04.
- Mock agent extension — `packages/harness/src/testing/mock-agent/scenario.ts` + `runner.ts`: an `authRequired` scenario directive: initialize advertises configurable `authMethods`; `session/new` fails auth-required until `authenticate` is called (or until a scenario-scripted external flag), then succeeds. Today `authenticate` unconditionally returns `{}` — the directive makes the auth path E2E-testable without a real provider.
- Tests read expected rows from the committed fixtures (`fixtures/pi/`, `fixtures/opencode/`, mock scenario initialize) — the matrix test asserts *fixture → rendered row* equivalence, which is exactly the phase acceptance check "matrix reflects live initialize negotiation".

## Key Design Constraints

- Nothing keyed on harness id in the UI: rows/badges/panels derive from capabilities + quirks data only (Phase 26 adds arbitrary harnesses with zero UI changes — same constraint STEP-23-03 set for TrustBadge).
- The matrix explains but never lies: clamped cells must say a definition override disabled an advertised capability; the self-approving cell must carry the same honest copy as the Phase-23 trust badge (srgnt cannot gate Pi's tool use).
- Auth guidance never collects credentials: srgnt links/instructs and retries; it does not prompt for API keys or tokens in its own UI (harness auth belongs to the harness — consistent with "srgnt configures the launch, not the harness's internals").
- Renderer gets capability/quirk data over IPC only (no direct `@srgnt/harness` imports in renderer).
- Semantic tokens only; matrix must not overflow the settings column (scroll within its own container).

## Execution Checklist

1. `harness:capabilities` IPC (or extend `harness:list`) + preload (+ contracts tests).
2. `CapabilityMatrix` + component tests driven by fixture payloads: Pi row (clamped mcpServers, self-approving, no delegation), opencode row (from its fixture), mock row, and a never-connected harness (not-yet-measured).
3. Mock `authRequired` directive + runner/unit tests (authenticate transitions the gate; `expect`-style scenario assertions).
4. `AuthPanel` + chat controller auth-required detection + Retry; component tests per method type; audit event (`client/*` kind) appended on auth failure/retry so the event log tells the story.
5. E2E (mock): authRequired scenario → panel renders methods + docs link, no raw error toast; simulated auth → Retry succeeds into a working session.
6. Manual (real): opencode unauthenticated → panel guidance is actually followable end-to-end; record the observed flow in Implementation Notes (STEP-25-04 input).

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_03_add-capability-matrix-view-and-auth-error-surfacing|STEP-25-03 Add capability matrix view and auth error surfacing]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (capability-driven degradation invariant)
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (expected Pi row; `pi_terminal_login`)
- Prior art: [[02_Phases/Phase_23_chat_ui_v1_over_ephemeral_acp_sessions/Steps/Step_03_wire-permission-engine-round-trips-into-default-ask-prompt-ui|STEP-23-03]] (quirk-driven TrustBadge pattern)
