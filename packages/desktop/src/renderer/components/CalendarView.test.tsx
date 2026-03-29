import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalendarView } from './CalendarView';

describe('CalendarView', () => {
  it('renders the calendar header with date', () => {
    render(<CalendarView />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calendar');
  });

  it('renders agenda with fixture events', () => {
    render(<CalendarView />);
    // Events appear in both triage strip and day agenda, so use getAllByText
    expect(screen.getAllByText('Sprint Planning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Architecture Review: Connector v2').length).toBeGreaterThanOrEqual(1);
  });

  it('shows triage strip for events needing action', () => {
    render(<CalendarView />);
    expect(screen.getByText('Triage')).toBeInTheDocument();
    expect(screen.getByText(/need action/)).toBeInTheDocument();
  });

  it('opens event detail panel when event is clicked', () => {
    render(<CalendarView />);
    // Use the agenda section (not triage) to click the event
    const agendaSection = screen.getByText('Day Agenda').closest('section')!;
    const sprintPlanning = within(agendaSection).getByText('Sprint Planning');
    fireEvent.click(sprintPlanning);
    expect(screen.getAllByText('Sarah K.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Review burndown/)).toBeInTheDocument();
  });

  it('closes event detail when close button is clicked', () => {
    render(<CalendarView />);
    const agendaSection = screen.getByText('Day Agenda').closest('section')!;
    const sprintPlanning = within(agendaSection).getByText('Sprint Planning');
    fireEvent.click(sprintPlanning);
    expect(screen.getAllByText('Sarah K.').length).toBeGreaterThanOrEqual(1);
    const closeButton = screen.getByLabelText('Close detail');
    fireEvent.click(closeButton);
  });

  it('renders time and location for each event', () => {
    render(<CalendarView />);
    // Time appears in both triage strip and agenda
    expect(screen.getAllByText('09:00').length).toBeGreaterThanOrEqual(1);
    // "Teams" appears in multiple agenda rows (Sprint Planning + 1:1 with Sarah)
    expect(screen.getAllByText(/Teams/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders category dots with correct colors', () => {
    render(<CalendarView />);
    const agendaSection = screen.getByText('Day Agenda').closest('section')!;
    const meetingButton = within(agendaSection).getByText('Sprint Planning').closest('button');
    expect(meetingButton).toHaveClass('border-l-info-500');
  });

  it('shows attendee count in agenda', () => {
    render(<CalendarView />);
    expect(screen.getByText(/Sarah K., Mike R/)).toBeInTheDocument();
  });
});
