/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSidePanel } from './SettingsSidePanel.js';

describe('SettingsSidePanel', () => {
  it('renders "Categories" heading', () => {
    render(<SettingsSidePanel />);
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('renders all 3 category buttons', () => {
    render(<SettingsSidePanel />);
    const categories = ['General', 'Privacy', 'Advanced'];
    for (const cat of categories) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  it('calls scrollIntoView when category button clicked', () => {
    const mockScrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as unknown as HTMLElement);
    render(<SettingsSidePanel />);
    const btn = screen.getByText('Privacy');
    fireEvent.click(btn);
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    vi.restoreAllMocks();
  });
});
