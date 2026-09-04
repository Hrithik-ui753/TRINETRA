import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TRINETRA Error Boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-base-950 p-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="text-2xl font-bold text-white">Application Error</div>
            <p className="text-sm text-gray-400">
              TRINETRA encountered an unexpected error. This is likely a configuration issue.
            </p>
            <pre className="overflow-auto rounded-lg border border-white/[0.06] bg-graphite-800/50 p-4 text-left font-mono text-xs text-error-400">
              {this.state.error?.message ?? 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-semibold text-base-950 transition-all hover:bg-accent-400"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
