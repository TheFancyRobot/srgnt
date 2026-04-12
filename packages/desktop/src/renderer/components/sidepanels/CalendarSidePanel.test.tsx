/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarSidePanel } from './CalendarSidePanel.js';

// Mock LayoutContext
const mockSetCalendarDate = vi.fn();
vi.mock('../LayoutContext.js', () => ({
  useLayout: () => ({
    calendarYear: 2025,
    calendarMonth: 5, // June (0-indexed)
    setCalendarDate: mockSetCalendarDate,
  }),
}));

describe('CalendarSidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Calendar heading', () => {
    render(<CalendarSidePanel />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('displays current year', () => {
    render(<CalendarSidePanel />);
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('renders all 12 month buttons', () => {
    render(<CalendarSidePanel />);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const m of months) {
      expect(screen.getByText(m)).toBeInTheDocument();
    }
  });

  it('calls setCalendarDate when a month is clicked', () => {
    render(<CalendarSidePanel />);
    fireEvent.click(screen.getByText('Jan'));
    expect(mockSetCalendarDate).toHaveBeenCalledWith(2025, 0);
  });

  it('navigates to previous year', () => {
    render(<CalendarSidePanel />);
    fireEvent.click(screen.getByLabelText('Previous year'));
    expect(mockSetCalendarDate).toHaveBeenCalledWith(2024, 5);
  });

  it('navigates to next year', () => {
    render(<CalendarSidePanel />);
    fireEvent.click(screen.getByLabelText('Next year'));
    expect(mockSetCalendarDate).toHaveBeenCalledWith(2026, 5);
  });
});
