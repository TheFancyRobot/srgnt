# Execution Brief

## Why

- Custom harness definitions already work *mechanically*: `SHarnessDefinition`/`SHarnessesFile` are shipped contracts (`packages/contracts/src/harness.ts`), `loadWorkspaceHarnesses` returns a typed decode of workspace `harnesses.json`, and `HarnessRegistry.create` merges workspace entries over built-ins with wholesale last-write-wins shadowing (`packages/harness/src/registry/registry.ts`). After STEP-25-02, a Settings Harnesses section with a main-process `services/harnesses.ts`, `harness:list`/`harness:save-override`/`harness:reset-override` IPC, per-harness cards, an env editor, and atomic `harnesses.json` writes exists too — but STEP-25-02 deliberately shipped **no "Add harness" button** (creation was reserved for this step). This step is therefore a front-end completion, not new machinery: a create/edit form that covers the *full* definition surface and makes "bring your own ACP harness" a product flow instead of a hand-edited JSON file.
- **REQ-26-xx gate (read first, then reconcile):** this step is the first PHASE-26 deliverable the cross-harness lessons-learned note (`06_Shared_Knowledge/cross-harness-lessons-learned.md`, written by STEP-25-04) lands requirements on. That note does not exist at refinement time. Expect REQ-26-xx entries to name concrete editor requirements — e.g. `detectCommand` as a first-class field (Pi launches `npx` but detects `pi`), env-var handling lessons, possibly a delta-patch override mode if wholesale-shadow friction was felt in 25-02. The mechanism below is fixed by shipped code; the field emphases, help copy, and any *additional* fields are gated on that note. Do not start before reading it (phase note: "Do not start Step 01 without it").

## Prerequisites

- PHASE-25 merged. Specifically consumed here: STEP-25-01 (`detectCommand` field on `SHarnessDefinition`, `detectHarness(definition)` in `registry/detect.ts`, opencode built-in), STEP-25-02 (harnesses service + IPC + Settings section this step extends), STEP-25-04 (the lessons note — requirements input).
- Read: `packages/contracts/src/harness.ts` (every field the form must cover), `packages/harness/src/registry/registry.ts` (merge/shadow semantics the UI must explain), the STEP-25-02 Execution Brief + its shipped code (do not duplicate its service or IPC — extend them), and the lessons note's REQ list.
- Mock agent available as the zero-cost validation harness: `packages/harness/src/testing/mock-agent/bin.ts` is a real stdio ACP agent (see `mock-agent.subprocess.test.ts` for the exact spawn incantation) — a custom definition can point at it.

## Likely Code Paths

- `packages/contracts/src/ipc/contracts.ts` — extend the STEP-25-02 channels: either generalize `harness:save-override` into an upsert that also creates new custom entries, or add `harness:create` + `harness:delete` (match whatever shape 25-02 actually shipped; reuse over reinvention). All payloads `parseSync`-validated at the boundary as usual.
- `packages/desktop/src/main/services/harnesses.ts` — add create/delete paths: decode the candidate through `SHarnessDefinition` before writing; write the full file atomically (tmp+rename, the 25-02 pattern); id rules below. Deleting is allowed only for entries whose id does not belong to a built-in (built-ins can only be reset, the 25-02 rule).
- Renderer — extend the Harnesses settings section with an "Add custom harness" flow plus full-field editing on existing custom cards. Field-by-field spec (one form control per contract field):
  - `id` — required slug; unique among workspace entries. An id colliding with a built-in is *not* an error — it is a deliberate wholesale shadow (registry semantics); show an explicit "this will override the built-in X" warning + the overridden badge after save.
  - `name`, `description` (description doubles as the install hint rendered in the not-installed detection state — say so in help text; STEP-26-03's catalog prefill folds a catalog entry's `installHint` into this `description`, since `SHarnessDefinition` has no separate hint field — the two steps must stay consistent on that mapping), `docsUrl`.
  - `launch.command` (argv0 only — validation hint: "no spaces/flags here; use args"), `launch.args` (ordered list editor), `launch.env` (key/value editor; carry 25-02's secret-safe mechanism verbatim — `${env:NAME}` references, service-side rejection of sensitive-key literals, `0600` file mode — not a re-invented warning label), `launch.cwd` (optional plain string; see constraints).
  - `detectCommand` — optional; help text: "binary probed for install detection; defaults to the launch command" (the Pi `npx`-vs-`pi` case as the example). **Contract note:** this is not a new field to invent here — `detectCommand` is the optional `SHarnessDefinition` field added by STEP-25-01 (`packages/contracts/src/harness.ts`, decoder + tests). If for any reason that field did not land in Phase 25, it must be added to the contract/decoder/tests as part of this step before the form can round-trip it through `SHarnessesFile`; the form must never write a key the schema does not define. Verify the field exists on the shipped contract before wiring the control.
  - `quirks` — multi-select rendered **from the `SHarnessQuirk` literal union itself, never a hardcoded list of options**, each with its doc-comment meaning as help text (four members today; STEP-26-02 adds `no-session-resume`, and a form driven off the schema picks that up with no edit here).
  - `capabilityOverrides` — tri-state control per capability (`loadSession`, `resumeSession`, `modes`, `slashCommands`, `images`, `mcpServers`): *trust negotiation* (field absent) / *force on* (true) / *force off* (false) — matching the registry's force-semantics exactly.
- "Test launch" affordance — a minimal probe, NOT the full conformance runner: run `detectHarness(definition)` for context and then **always attempt** one `AcpAgentConnection.connect` → read `connection.capabilities` → `close()`. **Detection is advisory here and must not short-circuit the spawn** — otherwise a missing binary would be reported as `not-installed` and the user could never tell "binary absent" from "binary present but not an ACP agent", which is exactly the distinction this button exists to make. Outcomes, using STEP-26-02's shared reason-code vocabulary verbatim (do not invent local wording): "Launched OK — protocol vN, agent <name> <version>"; `spawn-failed` (process never started — ENOENT/permission/instant exit; the advisory `detected: 'not-installed'` rides along as context in the copy: "binary not found on PATH"); `initialize-timeout` / `initialize-failed` (process started, never answered `initialize` or answered with an error). Lives in the main service (lazy-ESM `@srgnt/harness` import, the established CJS pattern). When STEP-26-02 lands its runner, this button's backend delegates to it in `mode: 'launch'` — do not build a second scripted-probe engine, and do not let two spellings of "launch failed" exist.

## Key Design Constraints

- Created entries get `source: 'custom'` (the schema default); never write `source: 'builtin'` from the editor.
- Everything written must round-trip the contract schema: encode/parse through `SHarnessesFile` before persisting so a hand-editor and the UI can never diverge on shape. Unknown/extra fields are not written (forward compatibility is the `version` field's job).
- srgnt never installs harnesses: a definition whose binary is missing is a *valid saved definition* — the detection chip shows `not-installed` with the description's install hint. Do not block save on detection status.
- `launch.cwd` stays a plain optional string in v1 — no template variables (e.g. `${projectRoot}`). **Decision needed (default recorded): defer cwd templating unless a REQ-26-xx entry demands it.**
- **Decision needed (default recorded):** per-harness permission-policy defaults were explicitly deferred out of 25-02 to this phase. Default: add the field only if the lessons note carries a REQ for it; otherwise per-project `permissionPolicy` remains the only surface.
- Renderer never imports `@srgnt/harness` (IPC only); semantic tokens only; default-ask permission stance untouched.

## Execution Checklist

1. Read `06_Shared_Knowledge/cross-harness-lessons-learned.md`; reconcile its REQ-26-xx entries onto the field spec above (add/adjust fields it demands; record deltas in Implementation Notes).
2. Contracts: IPC channel changes + tests.
3. Service: create/delete + schema-validated writes + unit tests (temp workspace).
4. Renderer: add/edit form, shadow warning, quirk/override controls + component tests.
5. Test-launch affordance end to end (mock agent as the target).
6. E2E: create a custom harness pointing at the mock-agent bin, run a full session with it, restart, verify persistence.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_01_build-custom-harness-editor-with-launch-specs-and-capability-overrides|STEP-26-01 Build custom harness editor with launch specs and capability overrides]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- Requirements input: `06_Shared_Knowledge/cross-harness-lessons-learned.md` (STEP-25-04; REQ-26-xx list)
- Prior art: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02]] (the service/IPC/section this extends)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (per-harness knowledge is definition *data*, never protocol code)
