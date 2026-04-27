# Implementation Notes

- This step should freeze release commands the rest of the hardening phase can rely on.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/desktop/electron-builder.config.ts` (or equivalent `electron-builder` config) with targets for macOS (.dmg), Windows (NSIS .exe), and Linux (.AppImage), plus a Fedora-local `.rpm` path
- CI/CD pipeline config (GitHub Actions or equivalent) that builds all three platform artifacts
- Code-signing placeholder configs: macOS Apple notarization env vars, Windows Authenticode env vars, Linux GPG signing config
- Auto-update configuration using `electron-updater` (update server URL, channel config)
- `docs/release-process.md` or equivalent in `.agent-vault/06_Shared_Knowledge/` documenting the exact build commands, signing requirements, and known environment-specific limitations
- Smoke-test script or checklist validating: build succeeds → installer launches → app starts → auto-update check fires

**Key decisions to apply:**
- DEC-0004 (macOS + Windows + Linux, all three first-class) — all three platforms must have working build targets, not just macOS
- DEC-0005 (pnpm monorepo) — build scripts must use pnpm workspace commands, not npm/yarn

**Starting files:**
- `packages/desktop/` must exist with a working Electron main + renderer setup
- `package.json` at root with pnpm workspace config
- PHASE-07 terminal integration must be complete (prerequisite per step note)

**Constraints:**
- `electron-builder` + `electron-updater` are the default v1 packaging choices in this step. If implementation needs to deviate, record a decision note and update the hardening notes before shipping.
- Do NOT implement a custom update server — use electron-updater's built-in GitHub Releases or S3 provider
- Do NOT require real code-signing certificates for local dev builds — signing must be optional via env vars
- Do NOT break the existing dev workflow (`pnpm dev` must still work unchanged)
- Do NOT add platform-specific runtime code to the renderer — all platform branching belongs in main process or build config

**Validation:**
1. Run `pnpm build` — verify it produces packaging jobs or artifacts for macOS, Windows, and Linux from the repo root
2. Install the packaged artifact on the current development platform and confirm the app launches and shows the main window
3. Confirm CI or release automation is configured to build the two non-local target platforms and records PASS/BLOCKED status when that hardware is unavailable locally
5. Verify auto-update config exists (update server URL is set, even if pointing to a placeholder)
6. Verify signing config files exist with env-var placeholders (not hardcoded secrets)
7. Verify release process doc exists and contains exact build commands

**Junior-readiness verdict:** PASS — the execution prompt is clear, electron-builder has extensive documentation, and the deliverables are concrete file artifacts. A junior dev can follow electron-builder setup guides and produce the config. The main risk is platform-specific signing setup, which is mitigated by allowing placeholder configs.

## Related Notes

- Step: [[02_Phases/Phase_08_product_hardening/Steps/Step_01_ship-packaging-update-and-distribution-pipeline|STEP-08-01 Ship Packaging Update And Distribution Pipeline]]
- Phase: [[02_Phases/Phase_08_product_hardening/Phase|Phase 08 product hardening]]
