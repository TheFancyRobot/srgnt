# Validation Plan

## Primary Acceptance Checks

1. `release:check:repo` passes end to end on CI **and its definition actually contains
   every stage the acceptance text names**. Assert the script body, not just the exit
   code: the shipped chain is `build:icons && pack && test && test:e2e &&
   test:e2e:packaged:linux` with **no `pnpm typecheck`**, so a green run today proves
   nothing about types. The check is only satisfied once the root `package.json`
   `release:check:repo` script runs `pnpm typecheck` (inserted after `pack`, before
   `pnpm test`) — grep the script for `typecheck` as part of this acceptance, and prove
   the gate bites by confirming a deliberately introduced type error fails the chain
   before the E2E legs run. Maps to phase criterion "Release checklist passes end to
   end."
2. One complete release rehearsal on a tagged RC drives `desktop-release.yml`
   (verify-linux-rc + mac/linux/win matrix) to green with artifacts produced. Every
   matrix leg must be seen *running its build command* — a leg that is green because
   its shell choked before `dist:*`, or because a guard skipped it, does not count
   (STEP-29-03 fixes the Windows leg's POSIX-`case`-under-`pwsh` dispatch; verify it
   here rather than assuming).
3. The three baseline E2E failures are re-audited: each is either fixed or has a
   recorded acceptance reason — no silent known-failures in the gate.

## Commands

- Repo gate (local, Linux): `pnpm run release:check:repo`. Shipped chain today:
  icons → pack → `pnpm test` → `pnpm test:e2e` → `pnpm test:e2e:packaged:linux`.
  Required chain after this step: icons → pack → **`pnpm typecheck`** → `pnpm test` →
  `pnpm test:e2e` → `pnpm test:e2e:packaged:linux`.
- RC with artifacts (Linux): `pnpm run release:rc:linux`.
- Full E2E incl. packaged: `pnpm --filter @srgnt/desktop test:e2e:full`.
- CI rehearsal: push a `v*` tag (or `workflow_dispatch`) to run
  `.github/workflows/desktop-release.yml`.
- Unit/typecheck across workspace: `pnpm test`, `pnpm typecheck`.

## Coverage Matrix To Verify (product surface → spec)

- Chat over ephemeral ACP session → Phase 23 `chat.spec.ts` present in `test:e2e`.
- Session persistence / projects → Phase 24 persistence spec present.
- Groups (multi-harness + bus) → Phase 27 group spec present.
- Pipelines → Phase 28 pipeline spec present.
- Packaged harness session (ESM load) → `packaged.spec.ts` extended (STEP-29-03).
- Notes/GFM, UI coverage, bug-0013 visual → existing specs still run.
- Semantic search → only if the stretch ships.
Confirm each is actually referenced by the `test:e2e` / `test:e2e:full` scripts in
`packages/desktop/package.json`, not merely present on disk.

## Manual / Rehearsal Checks

- Clean-checkout dry run: from a fresh clone, follow the release checklist verbatim and
  confirm each documented step works (this validates STEP-29-04's checklist too).
- Confirm the license gate: the STEP-29-04 license decision note exists and is linked
  from PHASE-29 before the rehearsal is called complete.
- Inspect produced artifacts. Two lists, deliberately separated — the rehearsal can
  only assert what the workflow actually runs (STEP-29-03 owns making these match):
  - From the workflow's uploaded artifacts: dmg (x64 + arm64) from the mac leg,
    AppImage **and rpm** from the Linux leg, and the best-effort Windows NSIS. The rpm
    and the Windows installer are both contingent on STEP-29-03's workflow fixes
    (the Linux leg gained `rpmbuild` + `dist:rpm:fedora`; the Windows leg's build
    command now runs under a shell that can parse it). If STEP-29-03 recorded the
    other outcome — rpm built out-of-band on a Fedora host — then drop the rpm from
    this list, state that in the release checklist, and verify the out-of-band rpm as
    a manual step below instead. Read STEP-29-03's Implementation Notes before
    running the rehearsal so this check matches reality rather than intent.
  - From a local `release:artifacts:linux` run (Fedora/rpmbuild host): the rpm, if and
    only if it is out-of-band per the above.

## Edge Cases / Failure Modes

- A new spec is flaky under CI's `workers: 1` serialization — rely on `retries: 2`
  (the PR #14 mechanism) but investigate genuine flakiness rather than masking it.
- The packaged smoke passes locally but fails in CI's bundled Node (the
  `ERR_REQUIRE_ESM` risk) — this is the gate's most important catch; do not skip the
  packaged job to get green.
- Release rehearsal consumes signing secrets (APPLE_ID, CSC_LINK, etc.) — a missing
  secret should fail loudly, not silently skip signing.

## Regression Expectations

- Release workflow triggers stay `v*` + `workflow_dispatch` ONLY.
- No previously-passing spec is dropped from the gate to make it green.
- Baseline failure count goes to zero-or-explained (not "3 known failures").

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix|STEP-29-05 Assemble release checklist and updated E2E coverage matrix]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
