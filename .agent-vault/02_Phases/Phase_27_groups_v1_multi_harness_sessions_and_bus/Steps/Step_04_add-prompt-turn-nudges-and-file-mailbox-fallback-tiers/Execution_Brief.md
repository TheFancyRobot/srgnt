# Execution Brief

## Why

- Tiers 2 and 3 are what make the bus *universal*. The spike proved both halves of this bet for Pi: injected MCP servers never arrive (probe 2 — tier 1 impossible today), while prompt text flows perfectly well (every probe drove Pi with plain prompts). Under the phase entry gate's conservative outcome (DEC-0018 unresolved upstream/fork), **this step is the only way Pi members participate in a group at all** — it is not an optional fallback, it is the Pi path.
- The nudge mechanism also mirrors the proven pi-teams UX (`docs/pi-teams.md`): teammate messages arrive as prompt-turn text. The mailbox costs nothing and rescues any harness that can read a file.

## Prerequisites

- STEP-27-03 merged (bus events persist; broker emits; timeline renders).
- Read: the spike report's probe 2 + "Implications for downstream phases"; `docs/pi-teams.md` (nudge delivery precedent); `packages/harness/src/supervisor/types.ts` (`SupervisorClock` — the injected-clock seam to copy for debounce testability); STEP-24-05 brief (derived-file rules for `transcript.md` — `mailbox.md` follows the same stance).

## Likely Code Paths

- `packages/harness/src/groups/nudges.ts` — `NudgeScheduler` inside/beside the broker: per-member pending-digest queue fed by routed bus messages; debounce (default 2 000 ms) so bursts collapse into one digest; injected clock (copy the `SupervisorClock` pattern) so tests never sleep. Emits `nudge-ready(role, digest)` events — *delivery* is the controller's job (the scheduler stays transport-free, harness-boundary clean).
- `GroupSessionController` (desktop main) — two delivery modes per member (`MemberSpec.nudgePolicy`, added to contracts in 01):
  - `'auto'` (default): when a nudge is ready and the member is **idle** (no prompt turn in flight), the controller initiates a `session/prompt` carrying the digest block. Never interrupt a turn in flight — queue until the turn's stop reason arrives.
  - `'on-next-prompt'`: digest is prepended to the next user/pipeline-initiated prompt only.
  - Either way the digest is a clearly-fenced block: `[srgnt group bus] N message(s):` + `from → to (time): text` lines + one instruction line telling the agent how to reply given its tier (tier 1: "reply with the group_send tool"; tier 2/3: "write your reply into group/notes/mailbox-out via your file tools" — see reply-path assumption below).
- **Per-member tier selection (the model this phase ships):** derived, per member, from the same registry data the whole app uses — effective `NegotiatedCapabilities` (post-`applyCapabilityOverrides`) + quirks: tier 1 iff effective `mcpServers === true` AND the bus `hello` arrived (02); tier 2 always available; tier 3 (mailbox) always written. A member's *live* tier shows as a roster badge (`bus: tools` / `bus: nudge` / downgrade events from 02) — the quirk-badge pattern from STEP-23-03/25-03. Pi with the shipped `mcp-passthrough-gaps` clamp lands on tier 2 automatically; nothing is keyed on harness id (data-driven invariant).
- `packages/runtime/src/sessions/mailbox.ts` — tier-3 mirror: renders bus events to `group/notes/mailbox.md` (human-and-agent-readable markdown table/log). Derived-file rules from `transcript.md`: append per bus event while live, full regeneration from `bus.jsonl` on group open (recovers any divergence), never a source of truth.
- **Reply path for tier-2/3 members (recorded assumption, flag prominently):** v1 ships *delivery* via nudges + mailbox; a tier-2 member's replies re-enter the bus only via the user (or the member writing a note the others read via their own file tools). A `mailbox-out.md` watcher that auto-ingests member-written replies onto the bus is designed but **deferred unless trivially cheap** — record as Decision needed if Phase 28 pipelines need mechanical replies from tier-2 members.

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- Digest injection is prepend-only and idempotent per message (each bus message appears in at most one digest — mark delivered on inclusion, not on send-success; on prompt failure the messages return to pending).
- Auto-prompt turns are recorded on the bus (`system/*` or `from: 'system'` message) and in the member's channel like any turn — the timeline must show that a nudge fired.
- Debounce and idle-detection constants live in one options object (like `RestartPolicy`) — no scattered magic numbers; settings exposure deferred.
- Mailbox writes are serialized with the same single-write discipline as the JSONL logs; `mailbox.md` regeneration is atomic (tmp + rename).

## Execution Checklist

1. Add `nudgePolicy` handling + tier derivation (effective caps + hello-state → tier) where the roster/controller can read it; roster badge wiring.
2. Implement `NudgeScheduler` with injected clock; unit-test debounce, burst-collapse, pending-return-on-failure.
3. Wire both delivery modes in `GroupSessionController` (idle detection off in-flight turn state; never interrupt).
4. Implement the mailbox mirror (append + regen-on-open) in runtime; content equivalence tests against `bus.jsonl`.
5. Integration test: MCP-disabled member (definition with `capabilityOverrides: { mcpServers: false }` — Pi's exact shipped shape) receives a digest via auto-prompt and reads `mailbox.md` via the existing `read_file` scenario directive — **no new mock directives needed for tiers 2/3**.
6. Run the Validation Plan; record deviations in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_04_add-prompt-turn-nudges-and-file-mailbox-fallback-tiers|STEP-27-04 Add prompt-turn nudges and file mailbox fallback tiers]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Evidence: [[06_Shared_Knowledge/pi-acp-adapter-spike-report|Pi ACP Adapter Spike Report]] (probe 2 = why this tier is the Pi path)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (tier rationale, capability-driven degradation)
