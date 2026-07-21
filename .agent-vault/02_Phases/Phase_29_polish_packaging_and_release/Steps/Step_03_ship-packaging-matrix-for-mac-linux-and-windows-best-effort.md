---
note_type: step
template_version: 2
contract_version: 1
title: Ship packaging matrix for mac linux and windows best-effort
step_id: STEP-29-03
phase: '[[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]'
status: planned
owner: ''
created: '2026-07-10'
updated: '2026-07-10'
depends_on:
  - STEP-29-02
related_sessions: []
related_bugs: []
tags:
  - agent-vault
  - step
---

# Step 03 - Ship packaging matrix for mac linux and windows best-effort

Use this note for one executable step inside a phase. This note is the source of truth for the next concrete unit of work. The goal is to make execution small, teachable, and safe for a junior developer or an automation agent to pick up without guessing. Keep the parent phase relationship explicit and link the architecture notes a reader must inspect first; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Architecture_Template|Architecture Template]] as the contract references.

## Purpose

- Outcome: Ship packaging matrix for mac linux and windows best-effort.
- Parent phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]].
- Exact outcome: packaged builds ship for macOS (dmg, x64 + arm64) and Linux (AppImage + Fedora rpm) as first-class targets with the packaged E2E smoke updated for the new product; a Windows NSIS build is produced best-effort with stdio/ConPTY/path caveats documented; the bundled bus MCP server executable is verified inside every packaged artifact.
- Starting files: `packages/desktop/package.json` electron-builder config; `scripts/build-fedora-rpm.sh`; `e2e/packaged.spec.ts`.
- Validate: `pnpm test:e2e:packaged:linux` green in CI; mac packaged smoke run manually; Windows caveats note committed to docs.

## Why This Step Exists

- The app can't ship until packaged artifacts actually RUN the harness features, not just boot. `@srgnt/harness` is ESM-only and desktop-main is CommonJS; the packaged Electron's bundled Node can `ERR_REQUIRE_ESM` where dev does not — and tsc/build success never catches it.
- Turns "it builds" into "the packaged app runs a real session." The packaged smoke MUST open a harness-backed session (see Execution Brief, "The Critical Packaging Constraint").

## Prerequisites

- Phases 23-28 feature-complete; STEP-29-02 merged. Toolchains: rpmbuild (Fedora rpm), macOS host (dmg), optional Windows host (session smoke only).
- Release workflow triggers are `v*` + `workflow_dispatch` ONLY — do NOT re-add PR/push-to-main triggers.

## Relevant Code Paths

- `packages/desktop/package.json` `build` block (electron-builder: mac dmg x64+arm64, linux AppImage, win nsis) + `dist:*`/`pack` scripts; `scripts/build-fedora-rpm.sh` (rpm spec says `License: UNLICENSED` — flag to STEP-29-04).
- `packages/desktop/e2e/packaged.spec.ts` (extend to drive a session); `Function('return import("@srgnt/harness")')()` in `main/dev-console/session-controller.ts`; `harness/src/groups/bus-server/bin.ts` (bundled bin — verify asar/asarUnpack); `.github/workflows/desktop-release.yml`.

## Required Reading

- [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Execution_Brief|Execution Brief]]
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Validation_Plan|Validation Plan]]
- [[01_Architecture/ACP_Command_Center_Target_Architecture|ACP Command Center Target Architecture]] (bundled bus-server executable requirement)

## Execution Prompt

1. Read the phase note, this step note, and every item in Required Reading before making changes.
2. Restate the goal in your own words and verify that you can name the exact files or workflows likely to change.
3. Inspect the current implementation and tests first. Do not start coding until you understand the current behavior, the expected behavior, and how success will be validated.
4. Make the smallest change that can satisfy this step. Prefer extending existing patterns over inventing a new one unless the phase or a decision note requires a new approach.
5. As you work, record concrete findings in Implementation Notes. If you discover missing context, add it here or create the appropriate bug, decision, or architecture note instead of keeping it only in terminal history.
6. Validate your work with the most direct checks available. Start with targeted tests or manual reproduction steps before broader project-wide commands.
7. If validation fails, stop and document what failed, what you tried, and whether the issue is in your change or was already present.
8. Before marking the step done, update the Agent-Managed Snapshot, Outcome Summary, and Session History so the next engineer can continue without re-discovery.

## Companion Notes

- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Execution_Brief|Execution Brief]] - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Validation_Plan|Validation Plan]] - Acceptance checks, commands, edge cases, and regression expectations.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Implementation_Notes|Implementation Notes]] - Durable findings discovered while the step is being executed.
- [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Outcome|Outcome]] - Final result, validation evidence, and explicit follow-up.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner: 
- Last touched: 2026-07-10
- Next action: Read [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Execution_Brief|Execution Brief]] and [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_03_ship-packaging-matrix-for-mac-linux-and-windows-best-effort/Validation_Plan|Validation Plan]].
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- Use this section for judgment calls, cautions, or handoff guidance that should not be overwritten by automation.

## Session History

<!-- AGENT-START:step-session-history -->
- No sessions yet.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
