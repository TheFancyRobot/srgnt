import React from 'react';
import { useLayout } from '../LayoutContext.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarSidePanel(): React.ReactElement {
  const { calendarYear, calendarMonth, setCalendarDate } = useLayout();

  const handlePrevYear = () => setCalendarDate(calendarYear - 1, calendarMonth);
  const handleNextYear = () => setCalendarDate(calendarYear + 1, calendarMonth);
  const handleMonthClick = (month: number) => setCalendarDate(calendarYear, month);

  const now = new Date();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-default">
        <h2 className="section-heading">Calendar</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevYear}
            className="btn btn-ghost p-1"
            aria-label="Previous year"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-mono-data font-medium text-text-primary">{calendarYear}</span>
          <button
            type="button"
            onClick={handleNextYear}
            className="btn btn-ghost p-1"
            aria-label="Next year"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((label, i) => {
            const isCurrentMonth = calendarYear === now.getFullYear() && i === now.getMonth();
            const isSelected = i === calendarMonth;

            let btnClass = 'px-1.5 py-1.5 rounded text-xs text-center transition-colors ';
            if (isSelected) {
              btnClass += 'bg-srgnt-500 text-white font-medium';
            } else if (isCurrentMonth) {
              btnClass += 'bg-surface-brand text-srgnt-500 font-medium';
            } else {
              btnClass += 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary';
            }

            return (
              <button
                key={label}
                type="button"
                onClick={() => handleMonthClick(i)}
                className={btnClass}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
