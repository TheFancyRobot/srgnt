# Execution Brief

## Why

- `group/notes/` is the group's shared memory: members drop markdown artifacts through their own file tools, the user reads/edits through NotesView, and the mailbox mirror (04) already lives there. It is the durable complement to the ephemeral bus.
- memsearch adds semantic recall over that memory — but the ARCH-0009 constraint is binding: **optional enhancer, detected at runtime, never load-bearing**. Every acceptance criterion of this phase must pass on a machine without memsearch. The design work here is mostly about degrading gracefully, not about search.

## Prerequisites

- STEP-27-03 merged (notes dir exists from 01; bus mirror from 04 is helpful but only the `memory_search` wiring depends on this step's own pieces — 04 and 05 parallelize after 03 per the phase step order).
- Read: DEC-0014 (notes workspace-boundary rules — group notes are a *new scoped root*, respect the boundary model); `packages/desktop/src/main/notes.ts` (current NotesView backing service and how its root is fixed today); Phase-25 STEP-25-01 brief (`registry/detect.ts` typed `ok`/`probe-failed`/`not-installed` detection states — the pattern to copy); STEP-27-02 brief (`memory_search` tool stub + broker delegation seam).
- Local ground truth (2026-07-18): `~/.local/bin/memsearch` exists on this machine with `index`/`watch`/`search`/`expand`/`stats` subcommands. Treat this as *one developer's box*, not an assumption — detection is runtime, and the without-memsearch configuration is a first-class test target.

## Likely Code Paths

- Notes dir + member writes: nothing new to build for members — they write via their own in-process tools (Pi) or client `fs` where delegated; the dir was created in 01. Enforce nothing beyond existence in v1 (recorded assumption: no schema over note files).
- NotesView scoping — `packages/desktop/src/renderer` NotesView + `main/notes.ts`: add a scoped-root mode so a group session's Notes tab browses `group/notes/` only. Executor inspects how the current root is injected and adds a parameterized root rather than a second notes stack; DEC-0014's cross-workspace navigation rules apply (no escaping the scoped root via relative paths — path-guard like the `fs` services).
- `packages/desktop/src/main/services/memsearch.ts` (new; recorded assumption on placement) — detection + process ownership: it composes runtime paths and child processes, which fits the desktop-main services pattern (`services/terminal.ts`, `services/semantic-search.ts` precedents); `@srgnt/harness` stays ACP-only and `@srgnt/runtime` stays process-free.
  - Detection: resolve the binary at group-session start — try PATH, then common install dirs (`~/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin`), then an explicit settings override. **Gotcha (recorded):** a packaged macOS Electron app does NOT inherit the login-shell PATH, so plain `which` will miss `~/.local/bin` — the fallback-dirs list is required, not defensive flourish. Surface the typed result (`ok(version)` via `memsearch --version` probe / `not-installed` / `probe-failed`) in the group roster/status UI.
  - Lifecycle: when detected, spawn `memsearch watch <group-notes-dir>` (which indexes notes + the mailbox mirror since mailbox lives inside `notes/`) as a plain owned child; kill on group dispose and app quit (same no-orphans bar as agent processes — the Supervisor is for ACP agents, this is a directly-owned child with its own kill; recorded assumption).
- `memory_search` tool (completing the 02 stub): bus-server relays the call to the broker as today; broker delegates to a `MemorySearchProvider` callback registered by desktop main — harness never knows memsearch exists. Provider runs `memsearch search` (and `expand` for top hits) against the group index, returns chunks; when unavailable, returns `{ available: false, hint: 'memsearch not installed — https://…' }` (the 02-shipped behavior, now with the honest hint).

## Key Design Constraints (recorded assumptions — junior-safe defaults)

- Never load-bearing: no feature in 01–04 or 06 may call the provider on its critical path; only the `memory_search` tool and an optional roster indicator touch it.
- Search output shape (recorded default): `{ available: true, chunks: [{ path, snippet, score }] }` — executor records the actual memsearch CLI output flags (`--json` availability) at implementation time; if the CLI has no machine-readable output, parse conservatively and pin with a fixture.
- Watcher crash → mark search degraded (`probe-failed`), do not respawn-loop more than the restart-policy default; group keeps working.
- The user can write into `group/notes/` through NotesView while members hold the dir — last-write-wins, no locking in v1 (same stance as the shared working tree, minus the warning: notes are append-mostly artifacts).

## Execution Checklist

1. Add NotesView scoped-root mode + path guard; group session gets a Notes tab rooted at `group/notes/`.
2. Implement `services/memsearch.ts` detection (PATH + fallback dirs + settings override) with typed states surfaced to the roster.
3. Implement watcher lifecycle (spawn on detect at group start, kill on dispose/quit).
4. Register the `MemorySearchProvider` with the broker; complete the `memory_search` tool path; fixture-pin the CLI output parse.
5. Verify both configurations locally (with `~/.local/bin/memsearch`; and with detection forced off) per the Validation Plan.
6. Record deviations (CLI flags, output shape, placement changes) in Implementation Notes.

## Related Notes

- Step: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Steps/Step_05_add-shared-group-notes-with-optional-memsearch-integration|STEP-27-05 Add shared group notes with optional memsearch integration]]
- Phase: [[02_Phases/Phase_27_groups_v1_multi_harness_sessions_and_bus/Phase|Phase 27 groups v1 multi harness sessions and bus]]
- Boundary: [[04_Decisions/DEC-0014_define-notes-workspace-boundary-and-cross-workspace-navigation-rules|DEC-0014]] (notes scoping rules)
- Architecture: [[01_Architecture/ACP_Command_Center_Target_Architecture|ARCH-0009]] (optional-enhancer constraint)
