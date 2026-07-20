# Execution Brief

## Why

- A user-provided definition is a claim; the conformance runner turns it into evidence. It is the trust story for arbitrary harnesses: scripted `initialize` → `session/new` → prompt → cancel against a REAL user-configured agent binary, reported per-check as pass / fail / not-supported — plus *suggested quirk flags* the user can apply in the STEP-26-01 editor. This is the "Test this harness" button the capability matrix deliberately did not build (STEP-25-03 recorded assumption: no auto-probe — that button is this step).
- The inversion framing from the phase note is literal: the mock-agent suite scripts the **agent** side against our real client; the conformance runner scripts the **client** side against a real agent. Nearly every piece exists as prior art — the job is composition, not invention:
  - `AcpAgentConnection` (`packages/harness/src/acp/connection.ts`) already exposes exactly the probe surface: `connect` (spawn + initialize + `capabilities`), `newSession`, `loadSession`, `resumeSession`, `prompt`, `cancel`, `close`, with injectable `AgentSpawner` and `ClientPorts` (permission/fs/terminal) for instrumentation.
  - `pi-spike.integration.test.ts` is a hand-rolled one-harness conformance run: probes 1 (permission round-trip), 2 (MCP passthrough via `testing/fixtures/mcp-echo-server.mjs` + `MCP_ECHO_LOG` handshake evidence), 3 (capabilities/load/resume), 4 (fs/terminal delegation), with evidence files. Generalize its probes; keep its evidence discipline.
  - `registry/detect.ts` gives the typed pre-flight (`ok`/`probe-failed`/`not-installed`); the mock agent (`testing/mock-agent/`) is the scriptable agent every unit test runs against; `supervisor/kill-tree.ts` + the `hang-probe.mjs` fixture are the no-orphans prior art.
- **REQ-26-xx gate:** the *mechanism* above is fixed by shipped code; the final check list, report vocabulary, and quirk-suggestion heuristics are expected to be refined by `06_Shared_Knowledge/cross-harness-lessons-learned.md` (STEP-25-04). Its brief already telegraphs the headline requirement — permission round-trips and MCP passthrough must be probed *behaviorally* because `initialize` advertises both dishonestly for Pi — but the exact probe designs and any additional checks (auth shapes, stream-shape findings) come from that note. Read it first; freeze the check catalog against its REQs before coding.

## Prerequisites

- STEP-26-01 merged (dependency: the runner reports against definitions the editor creates, and Settings hosts the button). STEP-25-01/03 shipped pieces consumed: `authMethods`/`sessionList` on `NegotiatedCapabilities`, the verified auth-required error shape (recorded in STEP-25-03 Implementation Notes — read it; do not re-derive), the mock `authRequired` directive.
- Read: `pi-spike.integration.test.ts` end to end (it is the design document), `testing/mock-agent/{scenario,runner,bin,connect}.ts`, `acp/connection.ts`, the spike report (`06_Shared_Knowledge/pi-acp-adapter-spike-report.md`) for expected Pi findings, and the lessons note's REQ list.

## Likely Code Paths

- `packages/harness/src/conformance/` (NEW module beside `acp`/`registry`/`testing`): `checks.ts` (the catalog), `runner.ts` — pure function: `(definition, options) → ConformanceReport`, injectable spawner/timeouts, **no disk writes and no Electron** (package rule; callers persist/render).
- Report contract: `SConformanceReport` in `packages/contracts/src/` (assumption — it crosses IPC to Settings, so it is an app contract like `SHarnessesFile`): per-check `{ id, title, status, reason?, evidence?, detail? }`, plus negotiated capability row, agent info, suggested quirks, timings, `ranAt` + definition snapshot. **Canonical vocabulary (frozen — the runner, IPC, Settings UI, and every test consume exactly this; the step note and Validation Plan use the same words):** `status` is the ONLY status enum and has exactly four members — `pass | fail | not-supported | skipped`. Everything else the docs mention (`not-installed`, `auth-required`) is **not** a status; it is a structured `reason` code carried alongside a status. Specifically: a not-installed detect result is `status: skipped` with `reason: 'not-installed'`; an unauthenticated harness is `status: skipped` with `reason: 'auth-required'` on the downstream checks (and the auth check itself reports the advertised methods as its evidence). Do not introduce a fifth status or use these reason codes as statuses anywhere.
- Check → ACP method map (v1 catalog; confirm against REQ-26-xx):
  1. **detect** — `detectHarness(definition)` not-installed → this check is `status: skipped, reason: 'not-installed'` and short-circuits every downstream check to `status: skipped` (never `fail`).
  2. **spawn + initialize** — `AcpAgentConnection.connect` via `childProcessSpawner` → protocol version, `agentInfo`, `negotiateCapabilities` row.
  3. **auth advertisement** — `authMethods` from the negotiated row; if `session/new` later fails with the verified auth-required shape, mark the downstream checks `status: skipped, reason: 'auth-required'` (the auth check itself carries the advertised methods as evidence) — an unauthenticated harness is a *finding*, not a runner failure.
  4. **session/new** — sessionId returned; modes advertised (or not).
  5. **prompt turn** — one trivial prompt; assert stream sanity (updates observed, `stopReason: end_turn`); record the update-kind distribution as evidence (the lessons note's stream-shape axis).
  6. **cancel** — second prompt, `session/cancel` mid-turn → expect `stopReason: cancelled` within a timeout (mock `expect_cancel` + spike prior art).
  7. **session/load / resume** — attempt per advertisement; `no-session-load` quirk suggested when load is advertised-but-broken or absent.
  8. **permission round-trip (behavioral, deep)** — instrumented `PermissionPort` **plus instrumented fs/terminal `ClientPorts`**; a prompt scripted to force a *protected tool action* (e.g. write a file / run a command), not merely a permission-inviting phrasing. The `permission-routing-gaps` suggestion requires **two conditions together**: (a) evidence the agent actually attempted the tool action — an observed `fs/*` or `terminal/*` client call, or the agent's own tool-call record in the update stream — AND (b) zero `session/request_permission` observed for it. Zero `request_permission` *alone* is not a finding: with a real model the agent may answer in prose or take another path without ever attempting the action, so a run where no tool action was attempted reports the permission check as `not-supported`/inconclusive (record why), never as a routing gap. This avoids the false-positive the spike's single-probe design risked (spike probe 1).
  9. **MCP passthrough (behavioral, deep)** — inject `mcp-echo-server.mjs` via `session/new` `mcpServers` with `MCP_ECHO_LOG`; handshake lines in the log prove passthrough (spike probe 2, reusable verbatim); absence → suggest `mcp-passthrough-gaps`.
  10. **teardown** — `close()`; process exits within grace; kill-tree fallback; orphan check.
- Deep-probe split: checks 8–9 (and any REQ-added behavioral probes) run real model turns — they cost tokens and need a provider-configured agent. **Decision needed (default recorded):** default run = deterministic checks 1–7, 10; a "deep probe" toggle opts into 8–9 with cost copy. Trivial prompts only (the Phase-25 cost rule).
- Desktop wiring: `harness:conformance-run` IPC in `contracts.ts`; main service invokes the runner (lazy-ESM import) with a hard overall timeout; Settings per-harness card gains "Test this harness"; report rendered per-check with evidence expanders; **JSON export** via Electron save dialog writing the `SConformanceReport`-encoded payload (assumption: file export, not clipboard). **Decision needed (default recorded):** single request/response with an in-flight spinner, no streaming progress channel in v1.
- **Duplicate-run serialization owner (main process, not the renderer):** the main service keeps a per-definition in-flight guard (a map keyed by the definition's id/fingerprint). A second `harness:conformance-run` for a definition already running is rejected (or queued behind the first) at the IPC handler — renderer spinner/debouncing is insufficient because multiple callers or windows can each fire the IPC. The **main service also owns report persistence** (writing/returning the `SConformanceReport`); the runner stays pure (no disk), and the renderer only renders/export-triggers. This is what the Validation Plan's "second concurrent run rejected or queued" check exercises.

## Key Design Constraints

- The runner must never hang: every check has its own timeout; a hung agent gets the kill-tree treatment (test with `registry/__fixtures__/hang-probe.mjs`).
- Suggested quirks are never auto-applied — the report suggests; the user applies via the STEP-26-01 editor. **Decision needed (default recorded):** an "apply suggested quirks" button that *pre-fills* the editor is allowed; silent mutation of `harnesses.json` is not.
- Not spec certification (phase non-goal): checks probe practical capability srgnt actually consumes, nothing more.
- All suites green with no real agent installed: unit tests run the checks against the in-process and stdio mock agent; real-harness runs are env-gated ITs (`SRGNT_IT_PI=1` / `SRGNT_IT_OPENCODE=1` pattern).
- STEP-26-01's "test launch" button should now delegate to checks 1–2 of this runner — one probe engine, two entry points.

## Execution Checklist

1. Read the lessons note; freeze the check catalog + report fields against REQ-26-xx (record deltas in Implementation Notes).
2. Contracts: `SConformanceReport` + IPC + tests.
3. `conformance/checks.ts` + `runner.ts` with injected spawner; unit tests per check against scripted mock scenarios (full-pass, `authRequired`, `expect_cancel`, `crash`, hang, malformed frames via the stdio bin).
4. Gated IT against real Pi asserting the spike's known findings reproduce as report entries.
5. Desktop IPC + button + report view + JSON export; retarget STEP-26-01's test-launch onto checks 1–2.
6. E2E (mock): full run from Settings renders a report; export decodes.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_02_build-acp-conformance-smoke-runner-as-harness-validator|STEP-26-02 Build ACP conformance smoke-runner as harness validator]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- Requirements input: `06_Shared_Knowledge/cross-harness-lessons-learned.md` (REQ-26-xx; behavioral-probe requirements)
- Design document: `packages/harness/src/registry/pi-spike.integration.test.ts` + [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (expected Pi findings)
- Substrate: `packages/harness/src/testing/mock-agent/` (scenario schema + runner this step inverts)
