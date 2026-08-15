---
note_type: shared_knowledge
title: Cross-Harness Lessons Learned (STEP-25-04) — Pi vs opencode, and the PHASE-26 requirements
created: '2026-08-15'
updated: '2026-08-15'
tags:
  - acp
  - pi
  - opencode
  - harness
  - requirements
  - phase-25
  - phase-26
---

# Cross-Harness Lessons Learned (STEP-25-04)

## Purpose

srgnt now has **two measured ACP integrations**: Pi, adapter-mediated through a
pinned `pi-acp` shim, and opencode, native `opencode acp`. This note is the
distillation — what actually differed, what the data model got wrong, and what
[[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26]]
must therefore build. It is PHASE-26's **requirements input**; PHASE-26's
dependency list names it.

Raw payloads live in the two capture notes and are **not** duplicated here:

- [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]] — the four behavioral probes.
- [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]] — the native baseline.

**Evidence rule for this note:** every REQ below carries a pointer to a
committed fixture, a capture-note section, or a STEP-25-0x Implementation Notes
entry. Anything that could not be pointed at is under **Proposals outside the
REQ list** instead, labelled as unevidenced. Two harnesses is a sample of two — this note describes
what *was measured*, and says so wherever a row is an advertisement rather than
an exercised behavior.

## The two integrations on eight fixed axes

Measured values only. "advertised" means the agent said so at `initialize` and
nothing exercised it; "measured" means a probe drove it.

| Axis | pi (adapter-mediated) | opencode (native) |
| --- | --- | --- |
| **1. Launch & detection** | `npx pi-acp@0.0.31` — the *adapter* is version-pinned in the launch spec (`PI_ACP_VERSION`); `pi` itself is whatever is installed (0.80.6 at spike, 0.84.1 by STEP-25-01). `detectCommand: 'pi'` ≠ `launch.command: 'npx'`. | `opencode acp` — user-installed binary, nothing pinnable; `OPENCODE_TESTED_VERSION = '1.18.18'` is documentation, never a launch input. `detectCommand` unset (detection = launch command). Both live in nvm-global `bin`, invisible to a GUI-launched Electron without a login shell. |
| **2. Auth surfacing** | `pi_terminal_login`, `type: "terminal"`, `args: ["--terminal-login"]`, `env: {}` → normalizes to `external-command`, command rebuilt as `pi --terminal-login` from the method's own args plus the definition's binary. | `opencode-login`, **`id`/`name`/`description` only** — no `type`, no `args`. Normalizes to `docs-only`; the actual command (`opencode auth login`) exists only as prose inside `description`. |
| **3. Capability gaps** | `loadSession: true`, `resumeSession: false`, `sessionList: true`, `embeddedContext: false`, `images: true`. | `loadSession/resume/list: true` **plus `close` and `fork`**, which `NegotiatedCapabilities` does not model at all; `embeddedContext: true`. |
| **4. Quirks needed** | **Four**: `adapter-mediated`, `permission-routing-gaps`, `mcp-passthrough-gaps` (three pre-declared from research, all three confirmed by probes) and `no-client-delegation`, added in STEP-25-03 from STEP-22-05 probe 4. Plus one override, `capabilityOverrides.mcpServers = false`. | **Zero quirks, zero overrides** — and the effective view equals the negotiated view, asserted in the gated IT. The target was zero and it held. |
| **5. Permission behavior** | **Measured: self-approves.** `session/request_permission` calls received during a real tool-executing turn = 0; the tool ran anyway. | **Not measured.** The capture's trivial prompt triggered no tool call, so `permissionRequests = 0` is an absence of stimulus, not a finding. |
| **6. Session load / resume** | **Measured:** `session/load` works and returns a rich payload (`configOptions` with model + `thought_level`, `models`, `modes` = thinking levels, `_meta.piAcp`); `session/resume` → JSON-RPC `-32601 Method not found`. | **Advertised only, and at two different levels:** `loadSession: true` sits directly on `agentCapabilities`, while `resume` (with `list`, `close`, `fork`) is nested under `agentCapabilities.sessionCapabilities` — which is also how `negotiateCapabilities` reads them. Neither was driven. The split matters for REQ-26-14, which asks the runner to retain and report raw capability keys. |
| **7. MCP passthrough** | **Measured: does not pass through.** A valid stdio echo server injected via `session/new.mcpServers` was never launched and the tool was never called — which is why the definition clamps `mcpServers` off. `mcpCapabilities: {http:false, sse:false}`. | **Advertised, unprobed.** `mcpCapabilities: {http:true, sse:true}` plus stdio — the only harness so far advertising non-stdio transports. No echo-server probe was run. |
| **8. Update-stream shape** | One tool-executing turn: `agent_thought_chunk` ×37, `tool_call_update` ×24, `agent_message_chunk` ×23, `session_info_update` ×2, `tool_call` ×1, `available_commands_update` ×1. Recorded fixtures also carry an unknown variant (`pi_experimental_reasoning_summary`) the tolerant reader must survive. | One trivial no-tool turn: `available_commands_update` ×1 (**93 commands**), `agent_message_chunk` ×1, `usage_update` ×1. The commands advertisement arrives on the **first turn**, with nothing at `initialize` hinting at it. |

Evidence pointers, in the same order:

1. `packages/harness/src/registry/builtins.ts` (`PI_ACP_VERSION`, `piDefinition.detectCommand`, `OPENCODE_TESTED_VERSION`, `opencodeDefinition`); [[06_Shared_Knowledge/opencode-acp-capture|opencode capture]] § Environment (PATH caveat).
2. `packages/harness/src/testing/fixtures/pi-spike/spike-frames.json` → `probe3_initialize_response.msg.result.authMethods`; `packages/harness/src/testing/fixtures/opencode/initialize.json` → `result.authMethods`; the ladder itself is `normalizeAuthMethod` in `packages/contracts/src/harness.ts`, asserted against both fixtures in `packages/harness/src/acp/capabilities.test.ts` (STEP-25-03 Implementation Notes).
3. Both fixtures' `agentCapabilities`; `packages/harness/src/acp/capabilities.ts` (the fields that exist).
4. `packages/harness/src/registry/builtins.ts`; STEP-25-03 Implementation Notes (`no-client-delegation` from probe 4).
5. Spike report probe 1 (`spike-frames.json` → `probe1_request_permission_observed`); [[06_Shared_Knowledge/opencode-acp-capture|opencode capture]] § Explicitly not measured.
6. Spike report probe 3 (`probe3_session_load_response_trimmed`, `probe3_session_resume_error`); opencode capture § Explicitly not measured.
7. Spike report probe 2 (`probe2_session_new_with_mcpServers`, `probe2_echo_server_launched: false`); `packages/harness/src/testing/fixtures/opencode/initialize.json` → `result.agentCapabilities.mcpCapabilities`.
8. Spike report § Streamed-update shape; `packages/harness/src/testing/fixtures/opencode/simple-prompt.jsonl` (seq 0 carries `availableCommandsTrimmedFrom: 93`); `packages/harness/src/testing/fixtures/pi/tool-use.jsonl` + its `README.md` for the unknown-variant corpus.

### The single sharpest divergence: modes

opencode's `session/new` returns `configOptions` — a `model` selector **and** a
`mode` selector (`category: "mode"`, `type: "select"`) — and **no `modes` block
at all**. srgnt's `readModes` (`packages/desktop/src/main/chat/session-controller.ts:691`)
reads only `modes.availableModes`, and the applying method for a config option
is `session/set_config_option`, not `session/set_mode`. So opencode's mode *and*
model selectors are invisible to srgnt today.

This is not a per-harness gap: pi's `session/load` returns `configOptions` too
(model + `thought_level`), and srgnt reaches pi's thinking levels only because
pi *additionally* mirrors them into a `modes` block. **Both** measured harnesses
expose config options; srgnt supports the surface neither of them treats as
primary. Evidence: `packages/harness/src/testing/fixtures/opencode/initialize.json`
→ `sessionNew.configOptions`; `spike-frames.json` → `probe3_session_load_response_trimmed`.

## Where the data model failed — the ARCH-0009 feedback loop

ARCH-0009's invariant is that everything harness-specific is **data**. Phase 25
was the first real test with a second agent, and it did not hold cleanly. Each
item below cost either new generic code or a new schema field:

- **`NegotiatedCapabilities` is a closed struct that trails the protocol.** It
  had to grow `authMethods` and `sessionList` mid-phase to describe agents
  already in front of us, and it *still* cannot express opencode's `session/close`
  and `session/fork`. A new capability an agent advertises is invisible until
  someone edits a TypeScript interface. (`packages/harness/src/acp/capabilities.ts`;
  PHASE-25 phase note § Refinement pass, "grounded model gaps".)
- **`readModes` is a surface, not a field.** Supporting opencode's selectors is
  new generic code (a config-options surface), not a new definition field —
  the clearest code-not-data gap the phase found. (STEP-25-01 Implementation
  Notes, headline; STEP-25-03 Implementation Notes, "deliberately not chased".)
- **Behavior the protocol cannot express became declared data — twice.**
  `permission-routing-gaps` and `no-client-delegation` are measured facts with
  no protocol field to live in, so they are quirk strings on a definition. That
  works, but it means the *only* source for "does this agent delegate fs?" is a
  human writing a flag; opencode's delegation column honestly reads *not
  measured* and will until a probe pays for it. (STEP-25-03 Outcome § Follow-up.)
- **Closed id sets leaked into the app.** `SChatTarget` was `Literal('mock','pi')`
  and had to widen to `Schema.String` so the registry, not the schema, decides
  what is a valid target (`packages/contracts/src/ipc/contracts.ts:554`). Review
  of PR #33 then caught `ChatView` doing the same thing in the renderer — it
  collapsed any project default that was not `pi`/`mock` to `mock`, so a project
  set to opencode silently started the Mock agent. That is per-harness code
  defeating a per-harness-data feature, and it shipped once. (STEP-25-02 session
  note § Review corrections.) The in-chat picker **still** lists `mock`/`pi` plus
  the project default rather than the registry.
- **A branch exists for a shape no harness has.** `rpc-authenticate` is reached
  by neither shipped harness (pi is `external-command`, opencode is `docs-only`)
  and is exercised only by the mock. Meanwhile `docs-only` — the branch that
  looked like a fallback — is where a real, shipped harness lands.
  (STEP-25-03 Implementation Notes.)
- **What *did* work as data:** `detectCommand`. Pi launching `npx` while
  detecting `pi` was hardcoded inside `detectPi`; making it a definition field
  turned `detectHarness(definition)` into the generic probe the settings UI and
  the auth normalizer both consume. This is the pattern the rest should follow.
- **Structural, not per-harness, but it will bite PHASE-26:** `@srgnt/harness` is
  ESM and desktop-main is CommonJS, so main reaches it through
  `Function('return import(...)')`, which is untestable under vitest
  (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`). The harnesses service takes an
  injectable `loadHarness` for tests; `chat/index.ts` duck-types the auth wall
  rather than `instanceof`-ing a type it can only import type-only.
  (STEP-25-02 and STEP-25-03 Implementation Notes.)

## Restated from DEC-0018, so PHASE-27 does not rediscover it

[[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018]]
(accepted 2026-07-15) adopted pinned `pi-acp@0.0.31` for phases 23–24 with a
revisit trigger at PHASE-27. **The Phase-27 group bus injects a stdio MCP server
via `session/new.mcpServers`, and spike probe 2 proves that mechanism does not
reach Pi.** Pi group members need the upstream native `--mode acp` fix, the
`packages/shims/pi-acp` fork, or a non-MCP bus tier. Nothing measured in Phase 25
changes this; opencode advertises stdio + http + sse but was not probed, so it is
not yet evidence that the bus works for it either. The revisit trigger (upstream
native ACP, or PHASE-27 start — whichever first) stands, and the pin should be
re-validated at that time: `pi` itself moved 0.80.6 → 0.84.1 during Phase 25 with
the pinned adapter unchanged and the gated IT still green.

## Requirements for PHASE-26

Deliverable keys: **[editor]** = STEP-26-01 custom harness editor · **[runner]**
= STEP-26-02 conformance smoke-runner · **[catalog]** = STEP-26-03 ACP Registry
integration · **[docs]** = STEP-26-04 "add your own harness" guide.

### REQ-26-01 — Detection is not the launch command, and PATH is not enough

The editor and any catalog entry must model `detectCommand` separately from
`launch.command`, and must accept an absolute binary path.
*Evidence:* `packages/harness/src/registry/builtins.ts` — `piDefinition` launches
`npx` and detects `pi`; [[06_Shared_Knowledge/opencode-acp-capture|opencode capture]]
§ Environment — both binaries live in nvm-global `bin`, which a GUI-launched
Electron does not see without a login shell; STEP-25-01 Outcome § Follow-up names
the binary-path override as the open item.
*Lands on:* **[editor]**, **[catalog]**, **[docs]**.

### REQ-26-02 — Secret-shaped env values are references; ordinary literals stay literal

The editor's env fields must keep the `${env:NAME}` indirection, and the
service-side rejection of literal secrets on sensitive-looking keys must apply
to anything the editor can write, including argv. **Scope it to secrets, not to
all env values:** the shipped rule refuses a literal only when the *key* matches
`SENSITIVE_KEY` (or an argv flag does), so `NODE_ENV=production` and a plain
endpoint stay literal. A Phase-26 editor that demanded indirection for every
value would reject ordinary configuration the current service accepts.
*Evidence:* `packages/desktop/src/main/services/harnesses.ts` (`SENSITIVE_KEY`,
`findSensitiveLiteral` across env **and** argv); STEP-25-02 Outcome § hardening
— literal secrets rejected while `${env:NAME}` is stored literally and resolved
only at spawn.
*Lands on:* **[editor]**, **[docs]**.

### REQ-26-03 — Capability overrides are editable, and a clamp is a visible state

The editor must expose per-capability overrides, and an override that disables
an advertised capability must remain distinguishable from "the agent does not
support it" wherever it renders.
*Evidence:* `piDefinition.capabilityOverrides = { mcpServers: false }` over a
protocol baseline of `mcpServers: true`; the shipped matrix already renders this
as **clamped**, one of six distinct states (STEP-25-03 Outcome § Result).
*Lands on:* **[editor]**, **[runner]**.

### REQ-26-04 — Quirks are first-class, provenance-carrying, and never auto-applied

The editor must expose the quirk set with what each one means; the runner may
*suggest* quirks from measurements but must never write them silently, because a
quirk is a claim about measured behavior.
*Evidence:* `SHarnessQuirk` in `packages/contracts/src/harness.ts` and pi's four
flags in `builtins.ts`; `no-client-delegation` was added in STEP-25-03 from
STEP-22-05 probe 4, one phase after the other three — and that fingerprint change
made every cached pi row read *stale* until the next connect (STEP-25-03
Implementation Notes).
*Lands on:* **[editor]**, **[runner]**.

### REQ-26-05 — A saved edit invalidates the measurement

Saving a definition must make its capability row visibly stale rather than
present an old measurement as current, and re-measuring must be one action away.
*Evidence:* `packages/runtime/src/harnesses/capability-cache.ts`
(`harnessDefinitionFingerprint`, sha256 over the effective definition); the
`no-client-delegation` fingerprint change above, which the matrix already
surfaces as "re-connect to refresh".
*Lands on:* **[editor]**, **[runner]**.

### REQ-26-06 — One bad entry must not destroy the file

`harnesses.json` must tolerate a schema-invalid entry per-entry. Today a single
bad entry fails the whole load, and save/reset then deliberately abort so the
file is never partially rewritten — safe, but it means one hand-edit can lock a
user out of every harness setting.
*Evidence:* STEP-25-02 Outcome § Follow-up ("per-entry tolerance for a
schema-invalid `harnesses.json` — today one bad entry fails the whole file");
`services/harnesses.ts` abort-on-load-failure, asserted with an unreadable file
left byte-identical.
*Lands on:* **[editor]**.

### REQ-26-07 — Decide wholesale-shadow vs delta-patch overrides

Overriding a built-in today writes a full canonicalized copy, so the entry stops
tracking built-in updates (a `PI_ACP_VERSION` bump reaches nobody who edited pi's
card) until Reset. PHASE-26 must either adopt delta patches or state the
consequence in the UI.
*Evidence:* STEP-25-02 Implementation Notes (canonicalize-from-base, protected
fields, duplicate-id review correction); PHASE-25 phase note § Refinement pass,
which recorded delta-patch as "deferred to Phase 26 if lessons demand it" — they
do.
*Lands on:* **[editor]**, **[docs]**.

### REQ-26-08 — No closed harness-id sets anywhere in a new surface

Every PHASE-26 surface must accept an arbitrary harness id from the registry.
This is a guard against a regression that already shipped once.
*Evidence:* `packages/contracts/src/ipc/contracts.ts:554` — `SChatTarget` had to
widen from `Literal('mock','pi')` to `Schema.String`; STEP-25-02 session note
§ Review corrections — `ChatView` collapsed any non-`pi`/`mock` default to
`mock`, so a project set to opencode started the Mock agent. The in-chat picker
is still not registry-driven (STEP-25-03 Outcome § Follow-up).
*Lands on:* **[editor]**.

### REQ-26-09 — Probe permission round-trips behaviorally, not from `initialize`

The runner must drive a tool-invoking turn with a recording permission port and
report whether `session/request_permission` reached the client. Nothing in
`initialize` distinguishes a self-approving agent from a gating one.
*Evidence:* spike probe 1 — `spike-frames.json` →
`probe1_request_permission_observed` ("NONE — pi-acp never called
session/request_permission"), against a definition whose `initialize` says
nothing about it. The counter-case is equally instructive: opencode's
`permissionRequests = 0` is recorded as **not measured** precisely because no
tool ran ([[06_Shared_Knowledge/opencode-acp-capture|capture]] § Explicitly not
measured).
*Lands on:* **[runner]**.

### REQ-26-10 — Probe MCP passthrough behaviorally, with the echo server

The runner must inject a stdio MCP server via `session/new.mcpServers` and check
whether the server process was launched and the tool called — reusing the shipped
probe server rather than a new one.
*Evidence:* spike probe 2 — `probe2_session_new_with_mcpServers` shows a valid
server passed, `probe2_echo_server_launched: false` shows it never started;
`packages/harness/src/testing/fixtures/mcp-echo-server.mjs` is the probe. This is
the check that produces the DEC-0018 / PHASE-27 answer per harness.
*Lands on:* **[runner]**.

### REQ-26-11 — Probe fs/terminal delegation behaviorally

Delegation must become measurable rather than only declarable.
*Evidence:* spike probe 4 — `probe4_fs_delegation_observed` ("NONE — pi-acp never
called client fs/*"), the measurement that later became a quirk string;
STEP-25-03 Outcome § Follow-up: "fs/terminal delegation is only *declarable*,
never measured … opencode's column reads *not measured* until a tool-invoking
probe pays for it."
*Lands on:* **[runner]**.

### REQ-26-12 — Exercise load/resume; report advertised separately from working

The runner must call `session/load` and `session/resume` and distinguish
advertised from working.
*Evidence:* spike probe 3 — `session/load` returned a rich payload while
`session/resume` answered `-32601` (`probe3_session_resume_error`), consistent
with `resumeSession: false`; opencode advertises **both** and neither was ever
driven ([[06_Shared_Knowledge/opencode-acp-capture|capture]] § Explicitly not
measured). PHASE-24's resume branches are gated on exactly these two bits.
*Lands on:* **[runner]**.

### REQ-26-13 — Run at least one prompt turn, and fold mid-session discoveries in

A report built only from `initialize` under-reports the agent. The runner must
complete a turn and merge session-discovered capabilities into the baseline,
one-way (an observation may demonstrate a capability, never un-demonstrate one).
*Evidence:* `packages/harness/src/testing/fixtures/opencode/simple-prompt.jsonl`
seq 0 — `available_commands_update` carrying `availableCommandsTrimmedFrom: 93`
on the **first turn**, from an agent whose `initialize` says nothing about slash
commands; `mergeSessionCapabilities` + `SESSION_DISCOVERED_CAPABILITIES` in
`packages/harness/src/acp/capabilities.ts`. The one-way rule is not theoretical —
three consecutive PR #32 review rounds each broke it a different way (STEP-25-01
session note § Review corrections).
*Lands on:* **[runner]**.

### REQ-26-14 — Report the agent's raw claims, including keys srgnt does not model

The report must carry raw `agentCapabilities` (at minimum `sessionCapabilities`
and `mcpCapabilities`) beside the normalized row, and must have a `not measured`
state distinct from `no`. Token-costing probes are opt-in.
*Evidence:* `packages/harness/src/testing/fixtures/opencode/initialize.json` —
`sessionCapabilities: { close, fork, list, resume }`, of which `close` and `fork`
have no home in `NegotiatedCapabilities`, and `mcpCapabilities: { http: true, sse:
true }` where pi has neither; the six-state matrix already draws the
measured/not-measured line (STEP-25-03 Outcome); both capture notes ran trivial
prompts under an explicit cost rule and recorded what that bought and what it did
not.
*Lands on:* **[runner]**, **[catalog]**.

### REQ-26-15 — Auth: classify, never guess, and treat `docs-only` as a real outcome

The runner must classify each advertised method through the shipped
`normalizeAuthMethod` ladder and must not construct a login command from prose.
It should also probe the unauthenticated wall where it can be reached.
*Evidence:* the two fixtures disagree — pi's method carries `type: "terminal"` +
`args`, opencode's carries neither, so opencode normalizes to `docs-only` and its
login command exists only inside `description`
(`packages/contracts/src/harness.ts` `normalizeAuthMethod`;
`packages/harness/src/acp/capabilities.test.ts` asserts both against the committed
fixtures). The wall itself is JSON-RPC **`-32000`**, verified in
`@agentclientprotocol/sdk` 1.2.1 source rather than assumed, and `Effect.runPromise`
drops the code so it must be captured with `Effect.tapError` (STEP-25-03
Implementation Notes).
*Lands on:* **[runner]**, **[catalog]**, **[docs]**.

### REQ-26-16 — Catalog entries need docs, install hints, and a version field that says which kind

Because auth metadata is not reliably machine-actionable and srgnt never
installs, a catalog entry must carry `docsUrl`, an install hint, and a version
field whose meaning is explicit: a **launch pin** (pi's adapter, part of the
command) is a different thing from a **tested-against constant** (opencode's
user-installed binary).
*Evidence:* `PI_ACP_VERSION` sits inside `piDefinition.launch.args` while
`OPENCODE_TESTED_VERSION` is documentation only (`builtins.ts`); both definitions
already carry `docsUrl` and an install hint inside `description`, which is where
the AuthPanel's `docs-only` affordance gets its link (STEP-25-03 Outcome).
*Lands on:* **[catalog]**, **[docs]**.

### REQ-26-17 — The runner must be callable from CommonJS desktop-main

Whatever the runner is, main must be able to invoke it across the ESM/CJS
boundary and tests must be able to reach it without the `Function('return
import(...)')` indirection.
*Evidence:* STEP-25-02 Implementation Notes — the ESM dance is untestable under
vitest (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`), so `services/harnesses.ts`
takes an injectable `loadHarness`; STEP-25-03 Implementation Notes — `chat/index.ts`
duck-types the auth wall because it can only import the controller type-only.
Every desktop-main service reaching into `@srgnt/harness` has hit this.
*Lands on:* **[runner]**, **[editor]**.

### REQ-26-18 — Report `configOptions`, and flag when they are unreachable

The conformance report must enumerate any `configOptions` a harness returns from
`session/new` or `session/load`, and flag the case where an agent exposes
mode/model selection *only* that way — because srgnt cannot drive it today.
*Evidence:* `packages/harness/src/testing/fixtures/opencode/initialize.json` →
`sessionNew.configOptions` (`model` + `mode` selectors, no `modes` block);
`spike-frames.json` → `probe3_session_load_response_trimmed` (pi returns
`configOptions` too); `packages/desktop/src/main/chat/session-controller.ts:691`
`readModes` reads only `modes.availableModes`.
*Lands on:* **[runner]**. The product surface that would *apply* a config option
is not owned by any PHASE-26 deliverable — see PROP-A.

## Proposals outside the REQ list

Not requirements on PHASE-26 as scoped; recorded so they are not lost.

- **PROP-A — a generic config-options surface. MEASURED 2026-08-15; the
  behavioural unknown is gone, only the scope decision remains.**
  `session/set_config_option` **works** against opencode 1.18.18 with params
  `{sessionId, configId, value}` and returns the updated `configOptions`
  (addendum in [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture]]).
  Two corrections to what this note assumed: `session/set_mode` **also** works on
  opencode — it is not "the wrong method" — and the reason to prefer config
  options is the ACP spec's, namely that **Session Config Options supersede the
  Session Modes API** and dedicated mode methods "will be removed in a future
  version of the protocol". opencode is a transitional agent that answers both
  while advertising only `configOptions`. This is still a **product** surface no
  PHASE-26 deliverable owns, and it remains a scope decision — but it is no
  longer blocked on evidence, and REQ-26-18's "flag them as unreachable" is now
  a statement about srgnt, not about the protocol.
- **PROP-B — model `session/close` and `session/fork`. MEASURED 2026-08-15 —
  but the two have very different protocol standing, and that decides how safely
  either can be built on.** Both work against opencode 1.18.18: `session/close`
  returns `{}`, `session/fork` returns a new `sessionId` plus that session's
  `configOptions`. The "advertised but never driven" caveat is discharged for
  both. However:
  - **`session/close` is stable v1**, documented in
    `agentclientprotocol.com/protocol/v1/session-setup` and gated by
    `sessionCapabilities.close`. Safely promotable. srgnt currently tears a
    session down by killing the process rather than closing the session.
  - **`session/fork` is NOT stable — it is an open RFD**
    (`agentclientprotocol.com/rfds/session-fork`), absent from the v1
    session-setup docs and from the maintainers' own capability list, which names
    only resume / close / delete. opencode has implemented it ahead of
    stabilization. The RFD itself says agents "may reply with an error if forking
    of that specific session or with the given options is not supported". So a
    working probe against one agent is **not** evidence the protocol surface is
    settled: building PHASE-24's fork on it means betting on a proposal. Treat as
    measured-but-unstable, and prefer reporting it (REQ-26-14) over depending on
    it.
  - **srgnt's own client capabilities are narrower than the protocol, and that
    gates PROP-A.** `buildClientCapabilities`
    (`packages/harness/src/acp/connection.ts:171`) advertises only `fs` and
    `terminal`. The protocol also defines **`session.configOptions.boolean`** — a
    *client* capability, so an agent may withhold boolean config options from a
    client that never advertises it — and **`elicitation`** (structured user
    input). PROP-A is therefore not purely a UI question: driving config options
    correctly starts at the initialize handshake, and today srgnt never tells an
    agent it can handle them.
  - Also noted from the maintainers' capability list: **`session/delete` exists
    in the protocol** and srgnt models it nowhere; opencode does not advertise it
    (its `sessionCapabilities` are `close`, `fork`, `list`, `resume`).
- **PROP-C — per-harness permission-policy defaults.** Deferred by decision in
  STEP-25-02; `SDesktopSettings` is untouched and per-project `permissionPolicy`
  remains the only relaxation surface. Pi self-approving is measured, so the need
  is real; the shape is not evidenced by anything Phase 25 built.
- **PROP-D — mid-conversation auth failure.** Auth detection covers session
  creation only; a token expiring during a turn still surfaces through the
  prompt-error path. No shipped harness has demonstrated it (STEP-25-03 Outcome).
- **Unevidenced by anything in Phase 25, listed as such:** OS-keychain-backed
  secret storage.
- ~~Whether agentclientprotocol.com publishes a machine-readable catalog feed.~~
  **VERIFIED 2026-08-15: it does** —
  `https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`, schema
  in `agentclientprotocol/registry` → `FORMAT.md`. Entries carry `id`, `name`,
  `version`, `description` and a required `distribution` object; there is **no**
  `docsUrl` or `installHint` field, so REQ-26-16's "docs + install hints" must be
  composed from `website`/`repository` and `description`. `distribution` comes in
  three kinds — `npx`, `uvx`, and `binary`; **`binary` requires download and
  extraction, which collides with srgnt's never-installs rule**, so not every
  catalog entry is one-click addable. Details and the open decision are in
  STEP-26-03's Execution Brief.

## What this note does not establish

- **Two harnesses is not a population.** Every "harnesses disagree about X" claim
  here rests on one adapter-mediated agent and one native one.
- **Half of opencode's row is advertisement.** Permissions, `session/load`,
  `session/resume`, MCP passthrough and the unauthenticated failure shape were
  all deliberately not probed — each needs a tool-invoking, token-spending run.
  That is precisely the work REQ-26-09 through REQ-26-12 hand to the conformance
  runner, and it is why those requirements exist.
- **No manual GUI verification** backs anything here; the phase's UI claims are
  automated-test-scoped and say so in their own Outcome notes.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_04_write-cross-harness-lessons-learned-note-driving-generic-support-requirements|STEP-25-04 Write cross-harness lessons-learned note driving generic support requirements]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|PHASE-25 Opencode Integration and Harness Settings]]
- Consumer: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|PHASE-26 Generic Harness Support and Conformance]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report (STEP-22-05)]]
- Evidence: [[06_Shared_Knowledge/opencode-acp-capture|opencode ACP Capture (STEP-25-01)]]
- Decision: [[04_Decisions/DEC-0018_pi-acp-adapter-strategy-adopt-pinned-pi-acp-fork-into-a-shim-or-contribute-native-mode-acp|DEC-0018 Pi ACP adapter strategy]]
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009 ACP Command Center Target Architecture]]
