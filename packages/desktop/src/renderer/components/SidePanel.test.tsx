import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SidePanel } from './SidePanel.js';
import { LayoutProvider, type PanelDefinition } from './LayoutContext.js';
import { navIcons } from './icons.js';

const defaultPanels: PanelDefinition[] = [
  { id: 'today', icon: navIcons['today']!, label: 'Daily Dashboard', section: 'main', order: 1 },
];

function renderWithSidePanel(children: React.ReactNode, options?: { initialCollapsed?: boolean; initialWidth?: number }) {
  return render(
    <LayoutProvider
      initialPanels={defaultPanels}
      initialCollapsed={options?.initialCollapsed ?? false}
      initialWidth={options?.initialWidth ?? 240}
    >
      <SidePanel>{children}</SidePanel>
    </LayoutProvider>
  );
}

describe('SidePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children when not collapsed', () => {
    renderWithSidePanel(<div>Test Content</div>);

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has data-collapsed="true" when collapsed', () => {
    renderWithSidePanel(<div>Test Content</div>, { initialCollapsed: true });

    const sidePanel = screen.getByRole('complementary', { name: 'Side panel' });
    expect(sidePanel).toHaveAttribute('data-collapsed', 'true');
  });

  it('has data-collapsed="false" when not collapsed', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const sidePanel = screen.getByRole('complementary', { name: 'Side panel' });
    expect(sidePanel).toHaveAttribute('data-collapsed', 'false');
  });

  it('has role="complementary" and aria-label', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const sidePanel = screen.getByRole('complementary', { name: 'Side panel' });
    expect(sidePanel).toBeInTheDocument();
  });

  it('resize handle has role="separator" and aria-orientation="vertical"', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });
    expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('resize handle has aria-label="Resize side panel"', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const resizeHandle = screen.getByRole('separator');
    expect(resizeHandle).toHaveAttribute('aria-label', 'Resize side panel');
  });

  it('resize handle is not keyboard focusable without keyboard resize support', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });
    expect(resizeHandle).not.toHaveAttribute('tabindex');
  });

  it('resize handle is not rendered when collapsed', () => {
    renderWithSidePanel(<div>Test Content</div>, { initialCollapsed: true });

    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('chevron toggle button has correct aria-label when expanded', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const toggleBtn = screen.getByRole('button', { name: 'Collapse side panel' });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('chevron toggle button has correct aria-label when collapsed', () => {
    renderWithSidePanel(<div>Test Content</div>, { initialCollapsed: true });

    const toggleBtn = screen.getByRole('button', { name: 'Expand side panel' });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('chevron toggle button calls toggleSidebar when clicked', async () => {
    const onLayoutChange = vi.fn();

    render(
      <LayoutProvider initialPanels={defaultPanels} onLayoutChange={onLayoutChange}>
        <SidePanel><div>Test Content</div></SidePanel>
      </LayoutProvider>
    );

    onLayoutChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse side panel' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ sidebarCollapsed: true }));
  });

  it('updates width live during drag and commits the final width on mouseup', () => {
    renderWithSidePanel(<div>Test Content</div>);

    const sidePanel = screen.getByRole('complementary', { name: 'Side panel' });
    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });

    act(() => {
      vi.advanceTimersByTime(16);
    });

    expect(sidePanel).toHaveStyle({ '--sidebar-width': '300px' });

    fireEvent.mouseUp(document);

    expect(sidePanel).toHaveStyle({ '--sidebar-width': '300px' });
  });

  it('double clicking the resize handle resets width to the default', () => {
    renderWithSidePanel(<div>Test Content</div>, { initialWidth: 320 });

    const sidePanel = screen.getByRole('complementary', { name: 'Side panel' });
    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });

    fireEvent.click(resizeHandle);
    fireEvent.click(resizeHandle);

    expect(sidePanel).toHaveStyle({ '--sidebar-width': '240px' });
  });

  it('cleans up drag listeners and selection state when unmounted mid-resize', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderWithSidePanel(<div>Test Content</div>);

    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize side panel' }), { clientX: 100 });

    expect(document.body.style.userSelect).toBe('none');

    unmount();

    expect(document.body.style.userSelect).toBe('');
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });

  it('unmounting does not throw when dragCleanupRef.current is null', () => {
    // The cleanup effect calls dragCleanupRef.current?.() — when current is null
    // this should not throw. Test that unmount is clean.
    const { unmount } = renderWithSidePanel(<div>Test Content</div>);
    // No mouseDown — dragCleanupRef.current stays null
    expect(() => unmount()).not.toThrow();
  });

  it('unmounting does not throw when clickTimeoutRef is falsy', () => {
    // The cleanup effect clears clickTimeoutRef.current if truthy.
    // When falsy (undefined), the if-check should be a no-op.
    const { unmount } = renderWithSidePanel(<div>Test Content</div>);
    // No click triggered — clickTimeoutRef.current remains falsy
    expect(() => unmount()).not.toThrow();
  });

  it('calls cancelAnimationFrame on unmount when a drag frame is pending', () => {
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const rafCallbacks: number[] = [];
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      const id = originalRAF(cb);
      rafCallbacks.push(id);
      return id;
    });

    try {
      const { unmount } = renderWithSidePanel(<div>Test Content</div>);

      const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });
      fireEvent.mouseDown(resizeHandle, { clientX: 100 });
      // Move to schedule a requestAnimationFrame, but don't let it fire
      fireEvent.mouseMove(document, { clientX: 160 });

      // mouseUp calls cleanupDrag which clears frameRef, so we can't unmount mid-frame
      // after mouseUp. Instead, unmount directly while the frame is pending (before rAF fires).
      unmount();

      // cancelAnimationFrame should have been called from the useEffect cleanup
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    } finally {
      window.requestAnimationFrame = originalRAF;
    }
  });

  it('calls clearTimeout on unmount when a click timeout is pending', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = renderWithSidePanel(<div>Test Content</div>);

    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });
    // Single click starts the timeout (doesn't clear it)
    fireEvent.click(resizeHandle);

    // Unmount before the 300ms timeout fires
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('calls dragCleanupRef on unmount during active drag, canceling pending frame', () => {
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = renderWithSidePanel(<div>Test Content</div>);

    const resizeHandle = screen.getByRole('separator', { name: 'Resize side panel' });
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 200 });

    // Click starts a timeout while drag is active
    fireEvent.click(resizeHandle);

    unmount();

    // dragCleanupRef.current?.() should have been called, which internally
    // cancels the animation frame from the drag cleanup
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    // The useEffect cleanup should also clear the click timeout
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
