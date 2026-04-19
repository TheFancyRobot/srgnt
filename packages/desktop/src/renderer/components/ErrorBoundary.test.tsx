import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.js';

const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

const ThrowingComponent = () => {
  throw new Error('test crash');
};

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('catches render errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('test crash')).toBeInTheDocument();
  });

  it('logs error to console via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalled();
    const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const ourCall = calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('[renderer] error boundary caught error'),
    );
    expect(ourCall).toBeDefined();
  });

  it('resets error state when "Return to app" is clicked', () => {
    let shouldThrow = true;
    const ConditionalThrow = () => {
      if (shouldThrow) throw new Error('boom');
      return <div>Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Return to app' }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onReset callback when reset is triggered', () => {
    const onReset = vi.fn();
    let shouldThrow = true;
    const ConditionalThrow = () => {
      if (shouldThrow) throw new Error('boom');
      return <div>OK</div>;
    };

    render(
      <ErrorBoundary onReset={onReset}>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Return to app' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('displays error message from the thrown error', () => {
    const SpecificError = () => {
      throw new Error('specific error message 123');
    };

    render(
      <ErrorBoundary>
        <SpecificError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('specific error message 123')).toBeInTheDocument();
  });
});
