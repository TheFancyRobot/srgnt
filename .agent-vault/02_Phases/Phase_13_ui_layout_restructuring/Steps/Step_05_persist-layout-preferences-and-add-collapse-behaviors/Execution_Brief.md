# Execution Brief

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

## Related Notes

- Step: [[02_Phases/Phase_13_ui_layout_restructuring/Steps/Step_05_persist-layout-preferences-and-add-collapse-behaviors|STEP-13-05 Persist layout preferences and add collapse behaviors]]
- Phase: [[02_Phases/Phase_13_ui_layout_restructuring/Phase|Phase 13 UI Layout Restructuring]]
