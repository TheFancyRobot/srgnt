# Execution Brief

## Why This Step Exists

This is the phase (and project) exit gate: "releasable = `release:check:repo` pipeline
green across the updated coverage matrix." The existing release gate was written for the
pre-pivot shell and only covers the old E2E specs. After phases 23-28 added chat,
persistence, groups, and pipelines, the gate must run those specs too, and a human-
followable checklist must exist for going from a clean checkout to published artifacts.
Without this, "green CI" would not actually prove the shipped product works.

## What "Done" Looks Like

- The release pipeline (`release:check:repo` lineage) is updated to run the new
  product's full E2E surface: build, typecheck, unit, and E2E for chat, persistence,
  groups, and pipelines, plus the packaged smoke (which per STEP-29-03 now exercises a
  real harness session).
- A release checklist document exists (in TESTING.md or `docs/`) covering the full path
  from clean checkout → tag → CI build matrix → published artifacts, including the
  license gate (STEP-29-04 decision note must exist) and the Windows best-effort note.
- One complete end-to-end release REHEARSAL passes: a tagged RC drives
  `.github/workflows/desktop-release.yml` through `verify-linux-rc` and the mac/linux/
  win build matrix, producing artifacts. The artifact set this rehearsal is allowed to
  claim is exactly what the workflow builds — the Linux leg only produces an rpm if
  STEP-29-03 added `rpmbuild` + `dist:rpm:fedora` to it (today it runs `dist:linux`
  alone, i.e. AppImage only), and the Windows leg only produces an installer once
  STEP-29-03 fixed its shell dispatch. Read STEP-29-03's Implementation Notes first and
  write the checklist against what CI actually does; anything built out-of-band is
  listed as a manual step, not silently expected from the workflow.
- The three known baseline E2E failures are re-audited (fixed or explicitly accepted
  with a recorded reason) so the gate reflects a true pass, not a "known-3-fail" pass.

## Prerequisites

- STEP-29-01..04 merged. In particular STEP-29-03's packaged harness-session smoke is
  the linchpin of the packaged portion of the gate.
- Phases 23-28 E2E specs exist to be wired in (see below).

## Relevant Code Paths

- Root `package.json` scripts (shipped):
  - `release:check:repo` = `build:icons && pack && test && test:e2e &&
    test:e2e:packaged:linux` — the repo-side gate. This is what CI's `verify-linux-rc`
    job runs under xvfb.
  - `release:artifacts:linux` = `dist:linux && dist:rpm:fedora`. NOTE: this local script
    is the **only** shipped caller of `dist:rpm:fedora` — the release workflow's Linux
    leg runs `dist:linux` on its own, so an unmodified workflow uploads no rpm.
    STEP-29-03 owns closing that gap (or recording the rpm as out-of-band); this step
    only reports whichever is true.
  - `release:rc:linux` = `release:check:repo && release:artifacts:linux`.
  - `test:e2e` currently = desktop `test:e2e` = `app.spec.ts`, `gfm-compliance.spec.ts`,
    `ui-coverage-matrix.spec.ts`, `bug-0013-visual.spec.ts`. **The new specs
    (`chat.spec.ts` from Phase 23, plus persistence/groups/pipelines specs) must be
    added to this list** in `packages/desktop/package.json`'s `test:e2e` /
    `test:e2e:full` scripts.
- `packages/desktop/e2e/` — existing specs above + `packaged.spec.ts`,
  `semantic-search-*.spec.ts` (parked; only in the gate if the stretch ships).
- `packages/desktop/playwright.config.ts` — `retries: process.env.CI ? 2 : 0`,
  `workers: process.env.CI ? 1 : undefined`. The retries setting is the auto-retry that
  fixed the flaky gfm ATX-heading test (PR #14); keep it.
- `.github/workflows/desktop-release.yml` — `v*` + `workflow_dispatch` triggers ONLY;
  `verify-linux-rc` gate + build matrix. Do NOT re-add PR/push triggers.

## The Three Baseline E2E Failures (re-audit these)

Carried since STEP-21-01/02/03 and referenced in every phase-21 outcome:
1. `app.spec.ts` "exercises preload APIs" — PTY `posix_spawnp` failure.
2. `gfm-compliance.spec.ts` — ATX-heading `.cm-header-*` classes assertion.
3. `bug-0013-visual.spec.ts` — Linux-only packaged binary ENOENT on macOS
   (host-specific, expected off Linux).
The gfm flakiness was addressed via auto-retry (PR #14). For #1 and #3, decide per
failure: fix, or record as a known-accepted environment limitation with a reason. The
gate should not ship carrying silent failures.

## Smallest Execution Checklist

1. Enumerate every E2E spec the shipped product needs (chat, persistence, groups,
   pipelines) and add them to `test:e2e` / `test:e2e:full` in
   `packages/desktop/package.json`.
2. Confirm `release:check:repo` invokes the expanded `test:e2e` and the STEP-29-03
   packaged session smoke.
3. Re-audit the three baseline failures; fix or record acceptance for each.
4. Write the release checklist (clean checkout → `release:rc:linux` locally → tag →
   `desktop-release.yml` matrix → artifacts → license gate confirmed). Put it in
   TESTING.md (coordinate with STEP-29-04 for single-source-of-truth on the matrix).
5. Run one full release rehearsal on a tagged RC; record the result in the Outcome.

## Assumptions / Decision-Needed

- ASSUMPTION: the coverage matrix lives in TESTING.md (STEP-29-04 embeds it); this step
  defines its content.
- ASSUMPTION: semantic-search specs stay OUT of the gate unless the stretch ships (the
  bundled model returns to `extraResources` only with the stretch — phase Non-Goals).
- DECISION-NEEDED: fix vs. accept for baseline failures #1 (PTY posix_spawnp) and #3
  (Linux-only packaged binary off-Linux). Default: #3 is an accepted host limitation
  (test self-targets Linux); #1 should be investigated and fixed or documented with a
  reason. Record the call.

## Related Notes

- Step: [[02_Phases/Phase_29_polish_packaging_and_release/Steps/Step_05_assemble-release-checklist-and-updated-e2e-coverage-matrix|STEP-29-05 Assemble release checklist and updated E2E coverage matrix]]
- Phase: [[02_Phases/Phase_29_polish_packaging_and_release/Phase|Phase 29 polish packaging and release]]
