# Execution Brief

## Why

- The docs are this phase's proof-of-generality: if a third party can follow a written guide from "I have some ACP agent" to "it has a row in the capability matrix" without author hand-holding, the bring-your-own story is real. A guide that only works with insider knowledge fails the same junior-developer bar this vault applies to steps.
- The guide must be grounded in the **real shipped flow**, in order: install the agent yourself (srgnt never installs) → add it (catalog one-click from STEP-26-03, the STEP-26-01 editor, or hand-editing `harnesses.json`) → detection chip goes `ok` → run the STEP-26-02 conformance runner → **review its suggested quirks and explicitly apply the ones you accept** (suggestions are never auto-applied — they prefill the STEP-26-01 editor for the user to confirm and save; the guide must say so, matching the surrounding "never auto-applied" / "prefill editor" wording and never implying srgnt silently mutates the harness definition) → the capability matrix row appears. Every doc section maps onto one of those product surfaces.
- Three worked examples, all ACP-registry-listed third-party agents: **Gemini CLI** (primary — production-grade reference agent; verified through a full session), **claude-acp**, and **codex-acp** (verified at least through a conformance-runner report). These are also the manual proof runs for the phase acceptance criteria.
- **Target list corrected 2026-08-15 against the live registry** (`https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`). These notes previously named **`claude-code-acp`, which is not in the registry**; the entry that exists is `claude-acp` ("Claude Agent", an ACP wrapper for Anthropic's Claude, repo `agentclientprotocol/claude-agent-acp`). Verified present with their launch specs at that date:
  - `gemini` — "Gemini CLI" — `npx @google/gemini-cli@0.55.1 --acp`
  - `codex-acp` — "Codex" — `npx @agentclientprotocol/codex-acp@1.3.0`
  - `claude-acp` — "Claude Agent" — distribution per the registry entry; re-read it at execution time.
  **Re-verify all three (presence, id, and exact launch command) when you write the guide** — those version pins are from 2026-08-15 and the whole point of the worked examples is that the commands actually run. Record the versions you tested, the `OPENCODE_TESTED_VERSION` discipline.
- **REQ-26-xx gate:** the lessons note's comparison axes (launch/detection, auth surfacing, capability gaps, quirks, permission behavior, load/resume, MCP passthrough, stream shape) are the checklist for each worked example's "known quirks" section — expect REQ-26-xx entries to dictate which troubleshooting topics the guide must cover (e.g. PATH in packaged Electron, auth-required first-run, `detectCommand` vs launch command).

## Prerequisites

- STEP-26-02 and STEP-26-03 merged (the guide documents both; dependency list).
- The three target agents installable on the executor's machine; provider credentials for at least Gemini CLI (a full session needs a working model).
- **Verify at execution — do not trust memory or this brief for agent specifics:** each agent's exact ACP invocation must be taken from its *current* docs at execution time (Gemini CLI's ACP mode flag, claude-acp's npm package/binary name, codex-acp's distribution). Record the exact versions tested in the doc itself and in Implementation Notes — the `PI_ACP_VERSION` discipline applied to documentation: a worked example states "verified against X vN.N.N on <date>".
- Read: the lessons note (its axes structure the per-agent sections), the STEP-26-01/02/03 Outcome notes (what actually shipped vs was planned), existing `docs/flagship-workflow-walkthrough.md` (house doc style).

## Likely Code Paths

- `docs/adding-your-own-harness.md` (NEW; recorded assumption on the filename) beside the existing walkthrough docs. Structure:
  1. **Concepts** — what a `HarnessDefinition` is, field by field, written for someone who has never seen the codebase (id/shadowing, launch spec, `detectCommand`, quirks with plain-language meanings, capability overrides tri-state, docsUrl).
  2. **Three add paths** — catalog (screenshots optional), editor, and the hand-edit path with a complete valid `harnesses.json` example (copy-paste runnable).
  3. **Verify your harness** — detection states and what each means, running "Test this harness", reading the report, applying suggested quirks.
  4. **Worked examples** (one section per agent): install command, the exact definition JSON, expected conformance-report highlights, known quirks/auth setup observed, tested version.
  5. **Troubleshooting** — the three detection states, auth-required on first run, PATH in packaged Electron (macOS GUI-launch PATH gap from the 25-02 brief), shadowed-built-in confusion.
- `README.md` — one pointer line to the guide.
- Optional small code touch (**Decision needed, default recorded: yes**): link the guide from the Add-harness flow's empty state / a "Learn more" affordance in Settings, so the doc is discoverable in-product.

## Key Design Constraints

- Every command in the doc must have actually been run during this step — no untested incantations (that is the validation bar).
- The doc documents the product as shipped by steps 01–03; where reality diverged from the phase plan, the doc follows reality and the divergence is recorded in Implementation Notes.
- Quirk/auth claims about each agent must come from that agent's *measured* conformance report, not from its marketing or from memory (the Phase-25 "no invented quirks" rule applied to prose).
- srgnt-never-installs framing throughout: install steps are explicitly "in your terminal", not product features.

## Execution Checklist

1. Install + verify each agent's current ACP invocation from its own docs; record versions.
2. Run the full flow (add → detect → conformance → matrix) for all three; capture reports and quirks.
3. Write the guide following the structure above; embed the measured findings.
4. README pointer + optional in-product link.
5. Doc-follow validation pass (see Validation Plan) and evidence into Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples|STEP-26-04 Document adding third-party harnesses with worked examples]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
- Requirements input: `06_Shared_Knowledge/cross-harness-lessons-learned.md` (axes = per-agent section checklist)
- Product surfaces documented: STEP-26-01 (editor), STEP-26-02 (conformance runner), STEP-26-03 (catalog)
