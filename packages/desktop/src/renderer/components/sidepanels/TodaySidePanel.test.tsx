/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodaySidePanel } from './TodaySidePanel.js';

describe('TodaySidePanel', () => {
  it('renders "Sections" heading', () => {
    render(<TodaySidePanel />);
    expect(screen.getByText('Sections')).toBeInTheDocument();
  });

  it('renders all 4 section buttons', () => {
    render(<TodaySidePanel />);
    const sections = ['Blockers & Watch-outs', 'Priorities', 'Schedule', 'Attention Needed'];
    for (const sec of sections) {
      expect(screen.getByText(sec)).toBeInTheDocument();
    }
  });

  it('calls scrollIntoView when section button clicked', () => {
    const mockScrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as unknown as HTMLElement);
    render(<TodaySidePanel />);
    const btn = screen.getByText('Priorities');
    fireEvent.click(btn);
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    vi.restoreAllMocks();
  });

  it('scrolls to correct section ID for each button', () => {
    const mockScrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as unknown as HTMLElement);
    render(<TodaySidePanel />);

    const sectionIds = ['section-blockers', 'section-priorities', 'section-schedule', 'section-attention-needed'];
    const labels = ['Blockers & Watch-outs', 'Priorities', 'Schedule', 'Attention Needed'];

    for (let i = 0; i < labels.length; i++) {
      mockScrollIntoView.mockClear();
      fireEvent.click(screen.getByText(labels[i]));
      expect(document.getElementById).toHaveBeenCalledWith(sectionIds[i]);
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    }

    vi.restoreAllMocks();
  });

  it('does nothing when getElementById returns null', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    render(<TodaySidePanel />);
    // Should not throw
    expect(() => fireEvent.click(screen.getByText('Blockers & Watch-outs'))).not.toThrow();
    vi.restoreAllMocks();
  });
});
