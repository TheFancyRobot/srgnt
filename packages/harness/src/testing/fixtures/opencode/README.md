# Recorded ACP traffic fixtures (`opencode`)

Captured from a live `opencode acp` session on 2026-08-13 against **opencode
1.18.18** (`OPENCODE_TESTED_VERSION` in `../../../registry/builtins.ts`). Both
files are written by the gated integration test itself — the run *is* the
capture:

```
SRGNT_IT_OPENCODE=1 pnpm --filter @srgnt/harness test opencode
```

## Files

- `initialize.json` — the raw ACP `initialize` result, plus the `session/new`
  response. This is the baseline every capability row in
  `06_Shared_Knowledge/opencode-acp-capture.md` is measured from.
- `simple-prompt.jsonl` — one trivial prompt turn's `session/update` frames as
  srgnt `SessionEvent` envelopes (the `events.jsonl` shape), including the
  `available_commands_update` that makes `slashCommands` an *observed* rather
  than negotiated capability.

## Redaction & trimming

- Absolute home paths are replaced with `/<HOME>` by `recorder.ts`.
- Catalog arrays (`availableCommands`, and each `configOptions` entry's
  `options`) are capped at 3 entries; the original length is preserved as
  `availableCommandsTrimmedFrom` / `optionsTrimmedFrom`. These lists enumerate
  the capturing developer's local commands, agents and models — the fixture
  only needs the shape and the count.

## What these pin

- opencode advertises **no** `modes` block on `session/new`; it exposes model
  and mode as ACP `configOptions` instead. srgnt's mode surface reads `modes`,
  so opencode's mode selector is invisible to it today (STEP-25-04 input).
- The single advertised auth method carries no `type`/`args`, unlike pi's
  `terminal` method — the login command exists only as prose in `description`.
