# Validation Plan

## Commands

- `pnpm --filter @srgnt/harness test` — `NudgeScheduler` unit suite with injected clock (no wall-clock sleeps): debounce window collapses a burst to one digest; messages return to pending on delivery failure; per-member isolation.
- `pnpm --filter @srgnt/runtime test` — mailbox mirror: rendered content is a faithful projection of `bus.jsonl` (property: render(events) is deterministic; regen equals append accumulation); atomic regen.
- `pnpm --filter @srgnt/desktop test` — delivery-mode wiring: `'auto'` fires only when idle; in-flight turn defers; `'on-next-prompt'` prepends exactly once.
- `pnpm --filter @srgnt/desktop test:e2e` — tier-2/3 member scenario (below).

## Acceptance Checks

- **Tier-2 round trip (the step's headline, and the de-facto Pi path):** a mock member whose harness definition carries `capabilityOverrides: { mcpServers: false }` (Pi's shipped shape) is never injected with the bus server, gets a digest delivered via auto-prompt when another member `group_send`s to it (scenario asserts with `expect_prompt` `contains: '[srgnt group bus]'`), and successfully reads `group/notes/mailbox.md` via the existing `read_file` directive with `expectContentContains` matching the sent text.
- Digest formatting: N pending messages produce one fenced block listing all N with from/to/time; the tier-appropriate reply instruction line is present (tool wording for tier 1, file wording for tier 2/3).
- Roster badges reflect derived tiers: MCP-clamped member shows `bus: nudge`; tier-1 member shows `bus: tools`; the 02 downgrade event flips the badge live.
- `mailbox.md` exists for every group from creation and matches `bus.jsonl` content after any exchange; hand-deleting it and reopening the group regenerates it fully.
- Nudge auto-prompt turns are visible on the bus timeline (a system row) and in the member's own channel.

## Edge Cases

- Message arrives while the recipient's turn is in flight → digest waits for the stop reason, then fires; never a mid-turn prompt.
- Burst of 10 sends inside the debounce window → exactly one digest with 10 entries.
- Auto-prompt fails (member crashed) → messages back to pending; after respawn + next idle, digest fires with the accumulated set.
- `nudgePolicy: 'on-next-prompt'` member with pending messages and no user prompt → messages simply wait (mailbox still has them); nothing fires.
- Mailbox regen with a truncated `bus.jsonl` tail → mirrors the tolerant read (prior events only), no crash.

## Regression Expectations

- Tier-1 members' behavior from STEP-27-02/03 unchanged (tiers stack — a tier-1 member still gets mailbox mirroring, and digests only if it ignores its inbox is NOT v1 behavior: tier-1 members get no nudges by default; assert that).
- Single-session prompt paths untouched — digest prepending exists only inside group member delivery.
- Manual check recorded in a session note: one real-Pi member in a mixed group receives a nudge digest and reads the mailbox (cheap prompt, local model per cost rules) — the honest "Pi participates via tier 2" demonstration.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers|STEP-27-04 Add prompt-turn nudges and file mailbox fallback tiers]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
