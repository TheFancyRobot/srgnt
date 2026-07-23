# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness build && pnpm --filter @srgnt/harness test` — broker unit suite (in-memory transport), bus-server bin subprocess suite, extended mock-agent suites (mcpServers spawn + `call_mcp_tool`).
- `pnpm --filter @srgnt/desktop test` — `GroupSessionController` injection wiring (eligible member gets the `mcpServers` entry with socket/token env; ineligible member gets `[]`).

## Acceptance Checks

- **Round trip (the step's headline):** two mock members against a live broker + real socket + real bin — member A's scenario runs `call_mcp_tool group_send { to: 'b', text: 'ping' }`; member B's runs `call_mcp_tool group_wait` then `group_inbox` and asserts `expectResultContains: 'ping'`. Broadcast variant (`to` absent) reaches both.
- `group_status` returns both roles with correct live tiers; `group_wait` with nothing pending returns `{ timedOut: true }` at the configured timeout, not an error.
- **Commit order:** with a journal whose `append` is held on a deferred promise, `group_send` does not resolve, the target inbox stays empty, and a pending `group_wait` does not settle until the append resolves; when the append rejects, `group_send` returns a retryable tool error and the message appears in *neither* the inbox nor `bus.jsonl`.
- Tier eligibility is data-driven: a member whose definition carries `capabilityOverrides: { mcpServers: false }` (Pi's shipped clamp) is never injected and is registered tier-2-only — assert on the built `session/new` params.
- `memory_search` responds `{ available: false }` gracefully (no crash, no hang) — the STEP-27-05 contract.

## Edge Cases

- **Auth failure:** wrong or missing token in `hello` → error frame + socket destroyed; broker emits an auth-failure event; member is NOT marked tier-1-live.
- **Listener restart (the only restart in v1 scope):** close the `net.Server` mid-session and re-listen on the same path with the broker object left alive — the bus-server bin reconnects with backoff and re-sends `hello` with its original token; the re-`hello` is accepted idempotently (same member, no duplicate roster entry, inbox contents preserved); a tool call issued while disconnected returns a retryable error (never hangs); after reconnect, `group_inbox` still drains the messages queued during the outage. Do **not** test a broker-process restart — the broker is in-process with desktop main and a desktop restart intentionally yields a fresh bus (assert instead that reopening a group after an app restart shows an empty bus with `bus.jsonl` history intact and no attempt to replay it into inboxes).
- **Eligible-but-silent harness:** member advertised `mcpServers: true` but no `hello` arrives within the connect timeout → broker downgrades the member to tier 2 and emits the downgrade event (roster badge). No silent degradation.
- Inbox overflow past the cap → oldest dropped + system event emitted; broker memory stays bounded.
- Unknown `to` role on `group_send` → tool error listing valid roles.
- Unix-socket path stays under the macOS `sun_path` limit (assert path length in tests); win32 named-pipe naming compiles and is unit-covered (real Windows run is a recorded follow-up, this machine is darwin).
- Group dispose while `group_wait` is pending → **every** pending waiter settles with exactly `{ closed: true, reason: 'group_disposed' }` (a normal tool result, not an MCP error, and never `{ timedOut: true }`), the socket closes, and the bus-server process exits — no orphan (process-tree assertion). Assert the multi-waiter case: two members both parked in `group_wait` both receive the closed result, and neither promise is left dangling.

## Regression Expectations

- All pre-existing mock-agent suites green after the runner/scenario changes (`DIRECTIVE_TYPES` exhaustiveness tests updated, not weakened).
- Single-session chat paths untouched (they continue to pass `mcpServers: []`).
- `SRGNT_IT_PI=1` spike suite still passes unchanged — this step must not disturb the pinned Pi definition unless the entry gate said so.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server|STEP-27-02 Implement GroupBroker and injected bus MCP server]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
