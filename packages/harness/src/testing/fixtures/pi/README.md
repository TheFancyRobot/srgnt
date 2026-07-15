# Recorded ACP traffic fixtures (`pi`)

Each `*.jsonl` file is a captured session's frames, one srgnt
[`SessionEvent`](../../../../../contracts/src/session.ts) envelope per line
(`{ seq, ts, protocolVersion, kind, payload }`) — the exact `events.jsonl` shape
the persistence layer reads. They are the tolerant-decode corpus exercised by
`fixtures.decode.test.ts`, pinning reader behavior against real-agent drift
(ARCH-0009).

## Files

- `simple-prompt.jsonl` — a plain prompt that streams two message chunks and a
  usage update, then stops (`end_turn`).
- `tool-use.jsonl` — a thought, a plan, one `execute` tool call with its
  completion update, a second plan revision, a final message. Includes a line
  carrying an **unknown update variant** and an **unknown extra envelope field**
  to assert both are tolerated.
- `cancelled-turn.jsonl` — a tool call that requests permission, the client
  cancels, and the turn stops with `cancelled`.

## Invariants asserted by the decode suite

- Every line decodes through the tolerant `readSessionEvent` reader with zero
  errors.
- Unknown `kind` values decode successfully (open string set).
- Unknown extra **envelope** fields are dropped on decode; the opaque `payload`
  is preserved verbatim (so unknown ACP update fields survive).

## Provenance & re-recording

These are **representative** recordings, redacted so no machine-identifying
absolute paths are committed (home paths appear as `/<HOME>`). To capture fresh
frames from a real `pi` session, run the gated Pi integration path
(`SRGNT_IT_PI=1 pnpm --filter @srgnt/harness test`) with the `FrameRecorder`
(`../recorder.ts`) teed onto the live connection, then commit the redacted
`toJsonl()` output here. Never commit un-redacted absolute paths.
