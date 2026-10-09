// src/reportError.ts: what the error screen (src/ErrorBoundary.tsx) reports: to the console, and to localStorage 'lampas.lastError'
// (name, message, the top of the stack) so the next sitting can say what broke.
import type { ErrorInfo } from 'react';

export const LAST_ERROR_KEY = 'lampas.lastError';

export function reportError(where: string, error: unknown, info?: ErrorInfo): void {
  console.error(`Lampas error screen (${where})`, error, info?.componentStack ?? '');
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    localStorage.setItem(
      LAST_ERROR_KEY,
      JSON.stringify({ where, at: new Date().toISOString(), name: e.name, message: e.message, stack: (e.stack ?? '').slice(0, 1500) }),
    );
  } catch {
    // storage may be full or blocked; the console has it
  }
}
