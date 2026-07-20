# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness build && pnpm --filter @srgnt/harness test` — broker unit suite (in-memory transport), bus-server bin subprocess suite, extended mock-agent suites (mcpServers spawn + `call_mcp_tool`).
- `pnpm --filter @srgnt/desktop test` — `GroupSessionController` injection wiring (eligible member gets the `mcpServers` entry with socket/token env; ineligible member gets `[]`).

## Acceptance Checks

- **Round trip (the step's headline):** two mock members against a live broker + real socket + real bin — member A's scenario runs `call_mcp_tool group_send { to: 'b', text: 'ping' }`; member B's runs `call_mcp_tool group_wait` then `group_inbox` and asserts `expectResultContains: 'ping'`. Broadcast variant (`to` absent) reaches both.
- `group_status` returns both roles with correct live tiers; `group_wait` with nothing pending returns `{ timedOut: true }` at the configured timeout, not an error.
- Tier eligibility is data-driven: a member whose definition carries `capabilityOverrides: { mcpServers: false }` (Pi's shipped clamp) is never injected and is registered tier-2-only — assert on the built `session/new` params.
- `memory_search` responds `{ available: false }` gracefully (no crash, no hang) — the STEP-27-05 contract.

## Edge Cases

- **Auth failure:** wrong or missing token in `hello` → error frame + socket destroyed; broker emits an auth-failure event; member is NOT marked tier-1-live.
- **Broker restart:** kill the socket server mid-session, restart it — bus-server bin reconnects with backoff; a tool call issued while disconnected returns a retryable error (never hangs); after reconnect, calls succeed again.
- **Eligible-but-silent harness:** member advertised `mcpServers: true` but no `hello` arrives within the connect timeout → broker downgrades the member to tier 2 and emits the downgrade event (roster badge). No silent degradation.
- Inbox overflow past the cap → oldest dropped + system event emitted; broker memory stays bounded.
- Unknown `to` role on `group_send` → tool error listing valid roles.
- Unix-socket path stays under the macOS `sun_path` limit (assert path length in tests); win32 named-pipe naming compiles and is unit-covered (real Windows run is a recorded follow-up, this machine is darwin).
- Group dispose while `group_wait` is pending → waiter resolves (timedOut/closed), socket closes, bus-server process exits — no orphan (process-tree assertion).

## Regression Expectations

- All pre-existing mock-agent suites green after the runner/scenario changes (`DIRECTIVE_TYPES` exhaustiveness tests updated, not weakened).
- Single-session chat paths untouched (they continue to pass `mcpServers: []`).
- `SRGNT_IT_PI=1` spike suite still passes unchanged — this step must not disturb the pinned Pi definition unless the entry gate said so.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_02_implement-groupbroker-and-injected-bus-mcp-server|STEP-27-02 Implement GroupBroker and injected bus MCP server]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
