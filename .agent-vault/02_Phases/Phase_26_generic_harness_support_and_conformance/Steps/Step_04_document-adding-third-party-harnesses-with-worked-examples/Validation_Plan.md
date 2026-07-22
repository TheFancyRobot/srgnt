# Validation Plan

## Commands

- No test suites own a doc; validation is the doc-follow protocol below plus:
- `pnpm --filter @srgnt/desktop test` — only if the optional in-product "Learn more" link was added (component test that the link renders and targets the doc).
- A markdown link check over `docs/adding-your-own-harness.md` (relative links resolve; external docsUrls reachable at time of writing — record the check date).
- `pnpm build` green if any code was touched.

## Acceptance Checks

- **Doc-follow protocol (the core check):** following the guide *verbatim* — ideally by someone other than its author; otherwise by the executor on a clean profile/workspace with the target agent freshly installed — produces:
  - **Gemini CLI:** a working end-to-end session in srgnt (add → detect `ok` → conformance run → prompt round-trip in chat). This is the phase criterion "proven with at least one non-built-in real agent".
  - **claude-code-acp and codex-acp:** at minimum a completed conformance-runner report each; the report (or its JSON export) pasted into this step's Implementation Notes as evidence.
- Every shell command in the doc was actually executed during validation — spot-audit by re-running each copy-paste block; any command that was never run is a validation failure.
- Each worked example states the exact agent version tested and the date; the definition JSON in each example decodes against `SHarnessDefinition` (paste it into the hand-edit flow and save).
- The hand-edit `harnesses.json` example is copy-paste valid: pasting it into a fresh workspace file and restarting yields a listed harness with a rendering detection chip.
- Troubleshooting section covers, at minimum, the topics the lessons note's REQ-26-xx entries assigned to docs (verify against the note; record the mapping REQ → doc section in Implementation Notes).

## Edge Cases

- An agent whose current release breaks its documented ACP invocation (upstream drift between refinement and execution): the doc records the last-known-working version and a dated caveat rather than silently shipping a broken example — and the breakage is a lessons-learned data point worth a vault bug/decision note.
- Auth-required on first conformance run (likely for all three agents): the doc's flow must pass through the AuthPanel/auth guidance path naturally — if the guide needed an undocumented workaround, that workaround is a product bug to file, not a doc footnote.
- Packaged app vs dev mode: at least one worked example verified against the packaged build (PATH differences are the known trap).

## Regression Expectations

- No product behavior changes from this step beyond the optional doc link; full desktop suite green if it was added.
- Phase acceptance criteria closable after this step: docs exist with three worked examples; conformance reports captured; custom-harness criterion evidenced.

## Related Notes

- Step: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Steps/Step_04_document-adding-third-party-harnesses-with-worked-examples|STEP-26-04 Document adding third-party harnesses with worked examples]]
- Phase: [[02_Phases/Phase_26_generic_harness_support_and_conformance/Phase|Phase 26 generic harness support and conformance]]
