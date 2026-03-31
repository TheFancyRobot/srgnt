---
note_type: step
template_version: 2
contract_version: 1
title: Persist layout preferences and add collapse behaviors
step_id: STEP-13-05
phase: '[[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]'
status: complete
owner: ''
created: '2026-03-30'
updated: '2026-03-30'
depends_on:
  - '[[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_03_refactor-applayout-to-three-panel-shell|STEP-13-03]]'
related_sessions:
  - '[[05_Sessions/2026-03-30-190901-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-190901 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-193903-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-193903 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-222302-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-222302 OpenCode session for Persist layout preferences and add collapse behaviors]]'
  - '[[05_Sessions/2026-03-30-225848-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-225848 OpenCode session for Persist layout preferences and add collapse behaviors]]'
related_bugs: []
tags:
  - agent-vault
  - step
completed_at: '2026-03-30'
---

# Step 05 - Persist layout preferences and add collapse behaviors

## Purpose

- Outcome: The sidebar width and collapsed state are persisted to desktop settings so they survive app restarts. The collapse/expand animation is polished and the toggle behaviors feel native-quality.
- Parent phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]].

## Why This Step Exists

- Without persistence, every app launch resets the layout to defaults. Users who prefer the sidebar collapsed or at a specific width will be frustrated by having to re-adjust each time.
- The collapse/expand animation is a high-visibility interaction that significantly affects perceived quality. Smooth, purposeful motion that matches the existing animation language (the `cubic-bezier(0.16, 1, 0.3, 1)` ease used throughout the app) is essential.
- This step can run in parallel with Step 04 since persistence and view-specific content are independent concerns.

## Prerequisites

- Step 03 completed: the three-panel layout is wired up and the LayoutContext manages sidebar state.
- Understanding of the existing desktop settings persistence mechanism (`window.srgnt.saveDesktopSettings`).

## Relevant Code Paths

- `packages/desktop/src/renderer/main.tsx` -- `saveSettings` / `patchSettings` flow, `DesktopSettings` type usage
- `packages/desktop/src/renderer/components/LayoutContext.tsx` -- `sidebarWidth`, `isSidebarCollapsed`, `activePanel` state
- `packages/contracts/src/ipc/contracts.ts` -- `SDesktopSettings` Effect Schema (needs `layout` field added)
- `packages/desktop/src/renderer/styles.css` -- transition/animation styles
- `packages/desktop/src/main/settings.ts` -- `defaultDesktopSettings` and `mergeDesktopSettings`

## Required Reading

- `packages/desktop/src/renderer/main.tsx` -- understand the `patchSettings` flow and how settings are loaded on startup (lines 50-83, 116-126)
- `packages/desktop/src/renderer/main.tsx` -- also inspect the duplicated renderer-side `defaultSettings` constant at lines 16-28 so layout defaults do not drift between renderer and main process
- `packages/contracts/src/ipc/contracts.ts` -- understand the `SDesktopSettings` Effect Schema (lines 76-104) and the existing `SDesktopConnectorPreferences` nested struct pattern
- `packages/desktop/src/renderer/styles.css` -- understand the existing animation easing curves and transition patterns
- [[01_Architecture/System_Overview|System Overview]] -- understand the desktop settings persistence architecture

## Execution Prompt

1. Read the `DesktopSettings` type definition and the settings persistence flow in `main.tsx`.

2. Extend the `DesktopSettings` type/schema to include layout preferences.

   **The schema lives in `packages/contracts/src/ipc/contracts.ts` and uses Effect `Schema.Struct`.** Add:
    ```typescript
    export const SLayoutPreferences = Schema.Struct({
      sidebarWidth: Schema.Number,
      sidebarCollapsed: Schema.Boolean,
    });
    export type LayoutPreferences = Schema.Schema.Type<typeof SLayoutPreferences>;
    ```

   Then add the optional field to `SDesktopSettings`:
   ```typescript
    export const SDesktopSettings = Schema.Struct({
      // ... existing fields ...
      layout: Schema.optionalWith(SLayoutPreferences, {
        default: () => ({ sidebarWidth: 240, sidebarCollapsed: false }),
      }),
    });
    ```

   **Also update the merge function** in `packages/desktop/src/main/settings.ts` (`mergeDesktopSettings`) to handle the nested `layout` object, similar to how it handles `connectors`:
   ```typescript
    layout: {
      sidebarWidth: 240,
      sidebarCollapsed: false,
      ...(settings?.layout ?? {}),
    },
    ```

   **Also update `patchSettings`** in `packages/desktop/src/renderer/main.tsx` to merge the nested `layout` object:
   ```typescript
   const nextSettings: DesktopSettings = {
     ...settings,
     ...patch,
     connectors: { ...settings.connectors, ...(patch.connectors ?? {}) },
     layout: { ...settings.layout, ...(patch.layout ?? {}) },
   };
   ```

   **Also update `defaultDesktopSettings`** in `settings.ts` to include the layout defaults.

3. Wire persistence into `LayoutProvider`:
    - Add `onLayoutChange` callback prop to `LayoutProvider` that fires when layout state changes
    - In `App`, pass a callback that calls `patchSettings({ layout: { sidebarWidth, sidebarCollapsed } })`
    - Debounce the save during resize drag (don't save on every mousemove pixel) -- use a 300ms debounce
    - On app startup, read the persisted layout values and pass them as `initialWidth` and `initialCollapsed` to `LayoutProvider`
    - Keep the active panel on the app default route after restart; do not persist `activePanel` in this phase

4. Polish the collapse/expand animation:
   - The side panel width transition should use the same `cubic-bezier(0.16, 1, 0.3, 1)` easing used by `animate-slide-up` and `animate-slide-in-left` throughout the app
   - **Use a single 200ms duration** for both collapse and expand. Asymmetric durations (different for collapse vs expand) would require JS-managed class toggling that adds complexity for minimal UX benefit. Keep it simple.
   - The resize handle should fade out during collapse and fade in during expand (use `opacity` transition, 150ms)
   - Content inside the side panel should not visibly reflow during the width transition -- use `overflow: hidden` and `min-width: 0` on inner content
   - Optional: add a subtle `opacity` transition on the side panel content (fade out on collapse, fade in on expand)

5. Add a visual collapse toggle button:
   - **Position: at the boundary between activity bar and side panel** (VS Code style). This ensures the chevron is always visible, even when the panel is fully collapsed, so the user can always click to re-expand.
   - Implementation: render the chevron as a small (20x20px) absolute-positioned button at the top of the side panel's left edge, overlapping the activity bar border slightly
   - Chevron points left when expanded (←), right when collapsed (→)
   - `aria-label="Collapse side panel"` / `"Expand side panel"` based on state
   - Clicking it calls `toggleSidebar()`
   - Style: `bg-surface-elevated`, `border border-border-muted`, `rounded-full`, `text-text-tertiary`, `hover:text-text-primary hover:bg-surface-tertiary`, `shadow-xs`
   - The chevron should only appear on hover over the activity bar / side panel boundary area (use a parent `:hover` selector or CSS `opacity` transition). This keeps the UI clean when not interacting.

6. Ensure the Ctrl+B / Cmd+B keyboard shortcut (implemented in Step 02) still works and pairs well with the visual toggle.
   - Preserve the phase decision that the shortcut remains global even when the terminal surface is focused.

7. Handle edge cases:
    - If the persisted `sidebarWidth` is outside the min/max range (180–480), clamp it on load
    - Double-click on the resize handle resets width to default (240px). Implementation: track `lastClickTime` on the resize handle. If two clicks happen within 300ms, treat as double-click and call `setSidebarWidth(240)`.
    - If the settings file has no `layout` key (pre-existing settings), the `Schema.optionalWith` default provides `{ sidebarWidth: 240, sidebarCollapsed: false }` — no migration needed

8. Validate:
    - Change sidebar width by dragging, restart the app, and verify the width is preserved
    - Collapse the sidebar, restart, and verify it stays collapsed
    - Switch to a non-default panel, restart, and verify the app still opens on the default panel while preserving width/collapse state
    - Ctrl+B / Cmd+B toggles the sidebar with smooth animation
    - The chevron toggle button works and updates its direction/label based on state
    - The animation feels smooth and matches the app's existing motion language
    - No layout jank or content reflow during collapse/expand transitions
    - Settings file with no `layout` key still works (defaults applied)
    - `pnpm --filter @srgnt/desktop typecheck` passes

## Edge Cases

- Listed in execution prompt section 7 above.

## Security Considerations

- The layout preferences are stored in the same `desktop-settings.json` file as other settings. No new file paths or IPC channels are introduced.
- The `parseSync(SDesktopSettings, payload)` validation in the main process will validate the new `layout` field. Malformed values are rejected at the IPC boundary.

## Performance Considerations

- **Debounce is critical.** The `onLayoutChange` callback fires on every state change. During resize drag, `sidebarWidth` changes on every animation frame. The 300ms debounce after the last change ensures writes to disk don't pile up.
- The `patchSettings` call triggers a round-trip IPC (`saveDesktopSettings` → main process → disk write → response). This is async and non-blocking, but frequent calls (without debounce) would queue up IPC messages.

## Cross-Step Dependencies

- This step adds `onLayoutChange` callback prop to `LayoutProvider`. The `LayoutProvider` was created in Step 02 — the prop needs to be added to the component's type definition. If Step 02 is already complete, this is a small additive change to `LayoutContext.tsx`.
- The `patchSettings` function in `main.tsx` (modified in this step) was created in Step 03's state migration. Ensure the nested `layout` merge is added to the version from Step 03.
- The renderer has a second `defaultSettings` constant in `packages/desktop/src/renderer/main.tsx`; update it in the same commit as the main-process defaults to avoid divergent startup behavior.

## Agent-Managed Snapshot

<!-- AGENT-START:step-agent-managed-snapshot -->
- Status: planned
- Current owner:
- Last touched: 2026-03-30
- Next action: Start STEP-13-05.
<!-- AGENT-END:step-agent-managed-snapshot -->

## Implementation Notes

- Capture facts learned during execution.
- Prefer short bullets with file paths, commands, and observed behavior.

## Human Notes

- The debounce on resize persistence is important. Saving to disk on every pixel of drag will cause noticeable lag. 300ms debounce after drag ends is the right pattern.
- The animation easing curve `cubic-bezier(0.16, 1, 0.3, 1)` is an "ease-out-expo" that gives a fast start and gentle deceleration. It's used consistently throughout the app and the sidebar should match.
- The double-click-to-reset-width behavior is optional polish. Do not block the phase on it if the core persistence and collapse behavior are correct.

## Readiness Checklist

- Exact outcome and success condition: Desktop settings persist only `sidebarWidth` and `sidebarCollapsed`, the side panel reloads with those values, the collapse/toggle interaction is polished, and the validation bullets in this note pass.
- Why this step matters to the phase: It makes the new shell feel durable instead of resetting on every launch and closes the loop on the resizable/collapsible side-panel UX.
- Prerequisites, setup state, and dependencies: Step 03 complete; the shell already uses `LayoutContext`; the engineer understands the renderer/main-process settings boundary before editing contracts or settings helpers.
- Concrete starting files, directories, packages, commands, and tests: Start in `packages/contracts/src/ipc/contracts.ts`, `packages/desktop/src/main/settings.ts`, `packages/desktop/src/renderer/main.tsx`, `packages/desktop/src/renderer/components/LayoutContext.tsx`, and `packages/desktop/src/renderer/styles.css`; validate with `pnpm --filter @srgnt/desktop typecheck`, plus the restart/manual checks listed here.
- Required reading completeness: Pass. The note now calls out both settings default sources, the schema, and the animation/style surface.
- Implementation constraints and non-goals: Do not persist `activePanel`; keep active-panel startup behavior on the app default route; keep new persistence inside the existing desktop settings path and IPC boundary.
- Validation commands, manual checks, and acceptance criteria mapping: The restart, animation, toggle, chevron, defaults, and typecheck checks map directly to the phase acceptance criteria for width/collapse persistence and side-panel behavior.
- Edge cases, failure modes, and recovery expectations: Width clamping, missing `layout` data, debounce behavior, and optional double-click reset are explicit above; if persistence writes cause lag, fix debounce before leaving the step complete.
- Security considerations or explicit not-applicable judgment: The new layout settings stay inside the existing validated desktop-settings contract; no new privileged channels or file paths are introduced.
- Performance considerations or explicit not-applicable judgment: The debounce is required because saving layout state crosses IPC and disk; resize updates must not spam writes on every pointer move.
- Integration touchpoints and downstream effects: Step 02's provider gains `onLayoutChange`; Step 06 must verify the persistence behavior in tests and app-level smoke checks; contracts and main-process tests may need updates alongside renderer work.
- Blockers, unresolved decisions, and handoff expectations: No blockers remain after clarifying that active panel does not persist. Handoff expectation: Step 06 verifies restart behavior instead of redefining persistence scope.
- Junior-developer readiness verdict: PASS - the note now matches the agreed persistence scope and names every cross-boundary file that must stay in sync.

## Session History

<!-- AGENT-START:step-session-history -->
- 2026-03-30 - [[05_Sessions/2026-03-30-190901-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-190901 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-193903-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-193903 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-222302-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-222302 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
- 2026-03-30 - [[05_Sessions/2026-03-30-225848-persist-layout-preferences-and-add-collapse-behaviors-opencode|SESSION-2026-03-30-225848 OpenCode session for Persist layout preferences and add collapse behaviors]] - Session created.
<!-- AGENT-END:step-session-history -->

## Outcome Summary

- Record the final result, the validation performed, and any follow-up required.
- If the step is blocked, say exactly what is blocking it.
