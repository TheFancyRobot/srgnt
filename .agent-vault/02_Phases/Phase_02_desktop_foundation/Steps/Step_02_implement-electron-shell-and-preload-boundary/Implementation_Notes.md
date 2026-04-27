# Implementation Notes

- Main process is the privileged local boundary; renderer is UI only.
- Avoid arbitrary filesystem access and arbitrary shell execution from the renderer.
### Refinement (readiness checklist pass)

**Exact outcome:**
- `packages/desktop/main/index.ts` — Electron main process entry (BrowserWindow creation, IPC handler registration)
- `packages/desktop/preload/index.ts` — contextBridge exposing a narrow, typed API object (e.g., `window.srgnt`)
- `packages/desktop/renderer/index.html` + `renderer/main.ts` — renderer entry that consumes the preload bridge
- `packages/contracts/src/ipc.ts` (or similar) — shared TypeScript types for IPC channels and payloads, validated with Zod
- At least one working IPC round-trip (e.g., `getAppVersion` or `ping`) proving the bridge works end-to-end
- Electron security settings: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (or documented exception)

**Key decisions to apply:**
- DEC-0002 (TypeScript + Zod) — IPC channel types must be Zod schemas in contracts package
- DEC-0004 (macOS + Windows + Linux) — BrowserWindow config must work cross-platform; no macOS-only APIs without guards

**Starting files:**
- Completed STEP-02-01 scaffold: `packages/desktop/package.json`, root workspace scripts, `tsconfig.base.json`
- `packages/contracts/` must exist with Zod installed

**Constraints:**
- Do NOT expose `fs`, `child_process`, `net`, or shell APIs through preload
- Do NOT disable contextIsolation or enable nodeIntegration in renderer
- Do NOT add navigation/routing UI — this step is shell + IPC only
- Do NOT add connector or runtime logic — this is the empty privilege boundary

**Validation:**
1. `pnpm --filter desktop dev` boots Electron and shows a window
2. DevTools console can call the preload-exposed API and get a typed response
3. `pnpm typecheck` passes, including the shared IPC types in contracts
4. Attempting to access `require('fs')` or `process` from renderer fails (security check)
5. Smoke test script (manual or automated) confirms the IPC round-trip

**Junior-readiness verdict:** PASS — the step is well-defined with a single IPC proof point and now inherits the canonical `packages/desktop/` path from STEP-02-01.

## Related Notes

- Step: [[02_Phases/Phase_02_desktop_foundation/Steps/Step_02_implement-electron-shell-and-preload-boundary|STEP-02-02 Implement Electron Shell And Preload Boundary]]
- Phase: [[02_Phases/Phase_02_desktop_foundation/Phase|Phase 02 desktop foundation]]
