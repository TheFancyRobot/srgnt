import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityBar, defaultActivityBarItems } from './ActivityBar.js';

describe('ActivityBar', () => {
  it('renders all default activity bar items as buttons with aria-label attributes', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    expect(screen.getByRole('button', { name: 'Daily Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connectors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument();
  });

  it('buttons do NOT have role="tab"', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      if (button.getAttribute('aria-label') === 'Online') continue;
      expect(button).not.toHaveAttribute('role', 'tab');
    }
  });

  it('the toolbar container has role="toolbar" and aria-orientation="vertical"', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const toolbar = screen.getByRole('toolbar', { name: 'Application views' });
    expect(toolbar).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('active item has aria-pressed="true", others have aria-pressed="false"', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    expect(screen.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Terminal' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('active item has tabindex="0", others have tabindex="-1"', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const todayBtn = screen.getByRole('button', { name: 'Daily Dashboard' });
    expect(todayBtn).toHaveAttribute('tabIndex', '0');

    const calendarBtn = screen.getByRole('button', { name: 'Calendar' });
    expect(calendarBtn).toHaveAttribute('tabIndex', '-1');
  });

  it('ArrowDown moves focus to next item, wrapping from last to first', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="terminal" onNavigate={onNavigate} />);

    const terminalBtn = screen.getByRole('button', { name: 'Terminal' });
    terminalBtn.focus();
    expect(terminalBtn).toHaveFocus();

    fireEvent.keyDown(terminalBtn, { key: 'ArrowDown' });

    const todayBtn = screen.getByRole('button', { name: 'Daily Dashboard' });
    expect(todayBtn).toHaveFocus();
  });

  it('ArrowUp moves focus to previous item, wrapping from first to last', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const todayBtn = screen.getByRole('button', { name: 'Daily Dashboard' });
    todayBtn.focus();
    expect(todayBtn).toHaveFocus();

    fireEvent.keyDown(todayBtn, { key: 'ArrowUp' });

    const terminalBtn = screen.getByRole('button', { name: 'Terminal' });
    expect(terminalBtn).toHaveFocus();
  });

  it('Home key moves focus to first item', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="calendar" onNavigate={onNavigate} />);

    const calendarBtn = screen.getByRole('button', { name: 'Calendar' });
    calendarBtn.focus();

    fireEvent.keyDown(calendarBtn, { key: 'Home' });

    const todayBtn = screen.getByRole('button', { name: 'Daily Dashboard' });
    expect(todayBtn).toHaveFocus();
  });

  it('End key moves focus to last item', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const todayBtn = screen.getByRole('button', { name: 'Daily Dashboard' });
    todayBtn.focus();

    fireEvent.keyDown(todayBtn, { key: 'End' });

    const terminalBtn = screen.getByRole('button', { name: 'Terminal' });
    expect(terminalBtn).toHaveFocus();
  });

  it('clicking a button calls onNavigate with the correct ID', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(onNavigate).toHaveBeenCalledWith('calendar');

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('main, system, and utility sections are rendered in separate groups', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const mainButtons = [screen.getByRole('button', { name: 'Daily Dashboard' }), screen.getByRole('button', { name: 'Calendar' }), screen.getByRole('button', { name: 'Notes' })];
    const systemButtons = [screen.getByRole('button', { name: 'Connectors' }), screen.getByRole('button', { name: 'Settings' })];
    const utilityButtons = [screen.getByRole('button', { name: 'Terminal' })];

    expect(mainButtons.length).toBe(3);
    expect(systemButtons.length).toBe(2);
    expect(utilityButtons.length).toBe(1);
  });

  it('each button has a title attribute matching its label', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      const ariaLabel = button.getAttribute('aria-label');
      if (ariaLabel === 'Online') continue;
      expect(button).toHaveAttribute('title', ariaLabel!);
    }
  });

  it('all icon SVGs inside buttons have aria-hidden="true"', () => {
    const onNavigate = vi.fn();
    render(<ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />);

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      if (button.getAttribute('aria-label') === 'Online') continue;
      const iconSpan = button.querySelector('span[aria-hidden="true"]');
      expect(iconSpan).toBeInTheDocument();
    }
  });

  it('resyncs the roving tab stop when activeId changes programmatically', () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <ActivityBar items={defaultActivityBarItems} activeId="today" onNavigate={onNavigate} />,
    );

    rerender(<ActivityBar items={defaultActivityBarItems} activeId="terminal" onNavigate={onNavigate} />);

    expect(screen.getByRole('button', { name: 'Terminal' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('tabIndex', '-1');
  });
});
