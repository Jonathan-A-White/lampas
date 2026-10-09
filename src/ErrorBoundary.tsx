// src/ErrorBoundary.tsx: one render error must never black out the whole app (mw-5r3p30.112). Without a boundary React unmounts
// everything on a throw in render. This one draws 'Something went wrong' with a Reload button, and reports the error (src/reportError.ts).
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from './reportError';

export function ErrorScreen() {
  return (
    <div role="alert" data-error-screen className="flex h-full flex-col items-center justify-center gap-6 bg-canvas px-6 text-center text-fg">
      <p className="text-2xl font-semibold">Something went wrong</p>
      <p className="text-lg">Reload to carry on reading.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-12 rounded-xl bg-accent px-8 text-lg font-medium text-accent-fg"
      >
        Reload
      </button>
    </div>
  );
}

/** Catches a throw while any child renders and shows the error screen in its place. `where` names it in the report. */
export class ErrorBoundary extends Component<{ where: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError(this.props.where, error, info);
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
