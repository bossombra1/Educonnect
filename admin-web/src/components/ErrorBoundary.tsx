import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin Web render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-slate-600">
            Cette page n’a pas pu être affichée correctement. Réessayez sans perdre votre session.
          </p>
          {import.meta.env.DEV && this.state.error?.message ? (
            <pre className="mt-4 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-700">
              {this.state.error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Réessayer
          </button>
        </section>
      </main>
    );
  }
}
