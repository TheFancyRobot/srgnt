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
});
