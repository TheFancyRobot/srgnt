# Execution Brief

## Why This Step Exists

Two independent hardening tasks bundled because both are "polish the surfaces phases
23-28 grew":

1. **Settings consolidation.** Each of phases 23-28 added its own settings surface —
   harness selection + capability matrix (Phase 25), permission policy (Phase 23),
   project defaults (Phase 24), group/pipeline defaults (Phase 27/28), plus the
   existing General/Appearance/Advanced. Left un-consolidated, settings become an
   incoherent pile of sections. This step gives them one deliberate information
   architecture before release.
2. **Long-transcript virtualization.** ChatView (Phase 23) renders every message/
   tool-call/diff as a DOM node. A long agent session (thousands of tool calls) will
   render tens of thousands of nodes, blowing scroll performance and memory. The phase
   acceptance criterion is: a **10k-event** transcript scrolls smoothly and loads in
   acceptable time from JSONL. This must be fixed before shipping.

### The canonical benchmark unit (use this everywhere — fixture, gate, and metrics)

**One unit = one persisted JSONL record in the session's `events.jsonl`.** The gate is
**10,000 persisted events**, not 10,000 rendered rows and not 10,000 user/assistant
messages. Reasons: it is the only unit that is directly countable (`wc -l`), it is what
the loader actually parses on open, and it is what the fixture generator can hit
exactly. Wherever an older note says "10k messages", read "10k events" — the phase note
and step note have been updated to match, and no document in this phase should use a
different unit again.

Two consequences to keep straight when reporting numbers:

- **Rendered rows are fewer than events** and vary with the mix: a `tool_call` plus its
  `tool_call_update`s coalesce into one card. Report the resulting row count alongside
  the event count so the two are never confused; do not "top up" the fixture to reach
  10k rows.
- **The fixture's composition is fixed** so the 10k is reproducible across machines and
  reruns: roughly 30% user/assistant text, 55% `tool_call`/`tool_call_update`, 15%
  diffs, generated from a seeded RNG. Record the exact composition alongside the
  timings — a 10k-event fixture that is 95% one-line text messages is not the same
  benchmark.

## What "Done" Looks Like

- Settings render as one coherent surface with a clear section order and no duplicated
  or orphaned controls. The relocated sections (harnesses, permissions, projects,
  groups/pipelines, appearance) each still work and persist.
- ChatView renders long transcripts through windowed virtualization (only visible rows
  mounted) with STABLE scroll anchoring: appending new messages while scrolled up must
  not jump the viewport; scroll-to-bottom on new activity still works; jumping to an
  older message lands correctly.
- A generated fixture session of exactly 10,000 persisted JSONL events (the canonical
  unit above) scrolls smoothly (no long-task jank) and its initial load time from JSONL
  is recorded in the step Outcome with a number, alongside the event count, the
  resulting rendered-row count, and the fixture composition.

## Prerequisites

- Phase 23 ChatView and Phase 24 session persistence (`SessionEventLog`,
  `packages/runtime/src/sessions/transcript.ts`, JSONL event logs) must exist — they
  are the input this step optimizes. Do not start virtualization before ChatView
  renders transcripts.
- Phase 25 harness settings + `CapabilityMatrix`, Phase 23 permission policy UI, and
  Phase 24 project defaults must exist — they are the sections being consolidated.
- Depends on STEP-29-01 (onboarding) only for sequencing, not code: settings changes
  should not regress the first-session walkthrough.

## Relevant Code Paths (shipped today + planned)

- `packages/desktop/src/renderer/components/Settings.tsx` — shipped `SettingsPanel`
  renders a flat list of `SettingsSection[]` (`Setting` has
  `type: 'string'|'boolean'|'select'|'path'`, plus `onChange`/`onBrowse`). Theme is
  special-cased in the `general` section. Consolidation extends THIS model; prefer
  grouping/ordering sections over rewriting the component.
- `packages/desktop/src/renderer/components/settings/CapabilityMatrix.tsx` (Phase 25) —
  harness capability surface; fold into the consolidated harnesses section.
- `packages/desktop/src/main/services/settings.ts` (Phase 25) + settings IPC in
  `packages/contracts/src/ipc/contracts.ts` — settings persist to `settings.json`
  inside the workspace (see onboarding "You're All Set" note). Section relocation is a
  UI/IA change; do not change the persisted schema unless necessary, and if you do,
  keep it backward-compatible with existing `settings.json` files.
- ChatView + transcript rendering (Phase 23 `renderer/components/chat/*`,
  Phase 24 `runtime/src/sessions/transcript.ts`) — the virtualization target.
- No virtualization library is in `package.json` today. Adding one (e.g.
  `@tanstack/react-virtual`) is in scope; a hand-rolled windowing hook is also
  acceptable. Whichever is chosen, it must handle variable row heights (messages,
  multi-line tool cards, diffs differ wildly in height) and stable anchoring.

## Smallest Execution Checklist

1. Audit the current settings sections contributed by phases 23-28; define the
   consolidated order and section titles (one screen, scannable).
2. Move sections into the consolidated layout without changing their persisted keys;
   verify each control still round-trips to `settings.json`.
3. Generate the fixture session on disk (JSONL) at exactly **10,000 events** in the
   fixed composition above (seeded RNG, so reruns are identical) — a script under
   `packages/desktop/e2e/` or `packages/runtime` fixtures. Assert the generated line
   count is 10,000 in the script itself; "approximately 10k" is not the gate. Reuse
   Phase 24's recorder/fixture machinery if available
   (`packages/harness/src/testing/fixtures/`).
4. Introduce windowed virtualization in ChatView with variable-height support and
   stable scroll anchoring. Keep auto-scroll-to-bottom-on-activity behavior.
5. Measure initial load + scroll performance against the fixture; record numbers.
6. Update settings E2E to cover each relocated section.

## Integration Touchpoints / Downstream Effects

- STEP-29-01 onboarding references Settings ("adjust the path later from Settings").
- STEP-29-05's E2E coverage matrix should include the settings-sections E2E and,
  ideally, a transcript-perf smoke.
- Virtualization must not break existing ChatView E2E (Phase 23 `chat.spec.ts`) or the
  arrow-key/large-document behavior guarded by `bug-0013`/`BUG-0014` packaged tests —
  those exercise CodeMirror in Notes, not ChatView, but confirm no shared regression.

## Assumptions / Decision-Needed

- ASSUMPTION: "acceptable" load time = the fixture opens without a visible multi-second
  freeze; record the actual number and let the reviewer set a hard budget. No SLA is
  defined in the phase note.
- ASSUMPTION: settings persistence schema stays stable; this is an IA/layout change,
  not a data migration. If a rename is unavoidable, add a backward-compatible read.
- DECISION-NEEDED: virtualization library vs. hand-rolled hook. Default: prefer a
  small, well-maintained library (`@tanstack/react-virtual`) for variable-height +
  anchoring correctness over a bespoke implementation, unless bundle-size review
  objects. Record the choice.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_02_consolidate-settings-and-virtualize-long-transcripts|STEP-29-02 Consolidate settings and virtualize long transcripts]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
