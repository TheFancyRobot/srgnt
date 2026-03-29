import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[renderer] error boundary caught error', error, info);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: undefined });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-surface-secondary grain flex items-center justify-center p-6">
        <div className="card max-w-lg w-full p-8 text-center space-y-5 animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-error-50 border border-error-100 flex items-center justify-center text-error-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-3.758a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-semibold text-text-primary tracking-tight">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              srgnt caught a renderer error and switched to a safe fallback instead of leaving a blank screen.
            </p>
            {this.state.message && (
              <p className="text-xs font-mono-data text-text-tertiary break-all">{this.state.message}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              Return to app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
