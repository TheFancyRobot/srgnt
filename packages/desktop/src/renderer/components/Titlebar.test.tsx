/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Titlebar } from './Titlebar.js';

const mockWindowSrgnt = {
  windowIsMaximized: vi.fn().mockResolvedValue(false),
  onWindowMaximizedChange: vi.fn(() => vi.fn()),
  windowMinimize: vi.fn(),
  windowMaximize: vi.fn(),
  windowClose: vi.fn(),
};

describe('Titlebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'srgnt', {
      value: { ...mockWindowSrgnt },
      writable: true,
      configurable: true,
    });
  });

  it('renders "srgnt" logo text', () => {
    render(React.createElement(Titlebar));
    expect(screen.getByText('srgnt')).toBeTruthy();
  });

  it('renders minimize, maximize, and close buttons', () => {
    render(React.createElement(Titlebar));
    expect(screen.getByLabelText('Minimize')).toBeTruthy();
    expect(screen.getByLabelText('Maximize')).toBeTruthy();
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('calls window.srgnt.windowMinimize on minimize button click', () => {
    render(React.createElement(Titlebar));
    fireEvent.click(screen.getByLabelText('Minimize'));
    expect(mockWindowSrgnt.windowMinimize).toHaveBeenCalledTimes(1);
  });

  it('renders Restore icon when window is maximized', async () => {
    mockWindowSrgnt.windowIsMaximized.mockResolvedValue(true);
    render(React.createElement(Titlebar));
    // windowIsMaximized resolves asynchronously, so wait for re-render
    await waitFor(() => {
      expect(screen.getByLabelText('Restore')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Maximize')).toBeNull();
  });

  it('calls windowMaximize when already maximized (toggles to restore)', async () => {
    mockWindowSrgnt.windowIsMaximized.mockResolvedValue(true);
    render(React.createElement(Titlebar));
    await waitFor(() => {
      expect(screen.getByLabelText('Restore')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Restore'));
    expect(mockWindowSrgnt.windowMaximize).toHaveBeenCalledTimes(1);
  });
});
