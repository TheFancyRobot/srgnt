# Implementation Notes

- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.

### Execution 2026-08-14

**What shipped**

- `packages/contracts/src/ipc/contracts.ts` - `harness:list` / `harness:save-override` / `harness:reset-override` channels; `SHarnessDetection` (wire mirror of `DetectionResult`), `SHarnessWorkspaceLoad` as a TOP-LEVEL field (an unreadable `harnesses.json` is distinguishable from a workspace with no custom entries), `SHarnessListEntry` (`definition` + `overridden` + `detection`), `SHarnessSaveOverrideRequest` (COMPLETE definition, never a patch), `SHarnessRef`, `SHarnessMutationResponse` (`{ok}` union, so a rejection renders next to the field instead of throwing).
- **`SChatTarget` is now `Schema.String`, not `Literal('mock','pi')`.** Which ids are valid is registry data (`harnesses.json` can name anything), and only main can tell a dangling id from an unknown-to-the-schema one. Renderer/preload/`env.d.ts` mirrors widened to `string`; `mock` stays the reserved id of the in-tree agent. Without this the new per-project default selector could offer opencode and main would have silently degraded it to the mock.
- `packages/desktop/src/main/services/harnesses.ts` (new, `services/` module pattern) - registry build from built-ins + `loadWorkspaceHarnesses`, per-definition detection cached **by probed command** (so changing a binary path re-probes with no refresh flag; `refresh: true` re-probes everything), `resolveDefinition(id)` for spawn with `${env:…}` resolved, and the four hardening rules: base-canonicalized allowlist, abort-on-load-failure, sensitive-key rejection, `0600` + per-root serialized write queue.
- `packages/runtime/src/shared/atomic-json.ts` - optional `mode` on `writeJsonAtomic`/`writeFileAtomic`, applied to the TEMP file (`open(tmp,'wx',mode)` + explicit `chmod`, because `open`'s mode is umask-masked). Rename moves the inode, so the published file's mode IS the temp file's mode for its whole life - that is what makes the tmp window provable without racing the write.
- `packages/desktop/src/main/chat/index.ts` - `resolveChatTarget` is async and takes an `isConfigured` probe; a dangling project default now BLOCKS with an actionable error (no session created, no process spawned) instead of the old silent degrade-to-mock. `canDrive` replaces the hardcoded `CHAT_TARGETS` list on the reconnect path. `ChatWiring.harnesses` threads the service through.
- `packages/desktop/src/main/chat/session-controller.ts` - `ChatConnectOptions.resolveDefinition` + `resolveConnectDefinition(target, options, piDefinition)` extracted and exported; `defaultChatConnect` no longer hardcodes `piDefinition` for `pi`, so a saved override is what the next spawn launches.
- `packages/desktop/src/renderer/components/settings/HarnessSettings.tsx` (new) + mounted under `SettingsPanel` in `main.tsx` - per-harness card (detection chip with all three states and actionable titles, binary path, detect command, env key/value editor, overridden badge + Reset/Delete, inline error, "Applies to new sessions"), section-level workspace-load error, "Re-check" (refresh probe), and the per-project default selector writing through `project:set-defaults`.
- `packages/desktop/src/preload/index.ts` + `env.d.ts` - `harnessList`/`harnessSaveOverride`/`harnessResetOverride`, optional on the renderer side so an older preload hides the section rather than crashing Settings.

**Findings / decisions made during execution**

- **The `Function('return import(...)')` ESM dance is untestable under vitest** (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` - the vm has no dynamic-import callback). The service takes an optional `loadHarness` dep that tests set to `() => import('@srgnt/harness')`; production still uses the Function indirection. Same trap will hit any future desktop-main service that reaches into `@srgnt/harness`.
- **`process.umask()` throws `ERR_WORKER_UNSUPPORTED_OPERATION` in vitest workers**, so the "would an unset mode show up?" trick is unavailable; the mode assertion leans on rename-preserves-inode instead.
- **A real workspace SEEDS `harnesses.json`** (`{"version":1,"harnesses":[]}`, workspace v2 bootstrap), so "no file" only happens in unit tests with a bare temp dir. Both paths are covered: missing file decodes as the empty workspace and may be created; a seeded-but-empty file is a normal successful load.
- `canonicalize` destructures `launch` and `detectCommand` OFF the base before spreading, so a cleared field lands as absent rather than being resurrected. The renderer does the same for `detectCommand` (`''` is schema-rejected, and an empty probe command throws `ERR_INVALID_ARG_VALUE`).
- Reset and "delete a custom harness" are the SAME operation (remove the workspace entry); only the button label differs by `source`. No second channel.
- **Per-harness permission-policy defaults: DEFERRED** as the brief's recorded default. `SDesktopSettings` is unchanged; per-project `permissionPolicy` remains the only relaxation surface.
- Not built (Phase 26, per the brief): "Add harness" / custom-harness creation, delta-patch overrides, OS-keychain storage.
- The chat harness picker still offers `mock`/`pi` only. Running opencode is reached through the per-project default (Settings → Harnesses), which is this step's surface; extending the in-chat picker belongs with STEP-25-03's capability matrix.

**Validation notes**

- The "override takes effect on next spawn" check is asserted at the service→connector seam (`resolveConnectDefinition` with the real service over a temp workspace), not by spawning a fake binary: `defaultChatConnect` completes an ACP handshake, so a fake script cannot stand in for the agent. The env-dump-to-marker-file variant in the Validation Plan is therefore not implemented as written; the equivalent assertion is that the resolved `launch.env` carries the resolved reference value while the file on disk carries only `${env:…}`.
- Two pre-existing e2e failures on this machine, unrelated to the diff (nothing in it touches the terminal/pty path): `app.spec.ts › exercises preload APIs…` fails with `posix_spawnp failed` from node-pty (reproduces with the sandbox disabled), and `bug-0013-visual.spec.ts` needs `release/linux-unpacked/srgnt`, which only exists after a Linux package build.

## Related Notes

- Step: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Steps/Step_02_build-harness-settings-ui-with-per-project-defaults|STEP-25-02 Build harness settings UI with per-project defaults]]
- Phase: [[02_Phases/Phase_25_opencode_integration_and_harness_settings/Phase|Phase 25 opencode integration and harness settings]]
