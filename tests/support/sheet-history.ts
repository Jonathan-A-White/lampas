// tests/support/sheet-history.ts — the wait of a step file that opens the app again after a scenario that ended with a sheet open (mw-5r3p30.629).
// Unmounting an open sheet steps history back (src/ui/sheetBack.ts settle: history.go(-n)) and jsdom lands that popstate a task later, on a loaded host
// later still: if it lands after the next scenario has set its address, the app opens on the screen beneath (Today) and every step looks for the wrong page.
// Each sheet's history entry carries its depth in history.state.sheet, so the real signal that every traversal has landed is that no depth is left.
// The address is no signal: a sheet's entry has the same address as the screen under it.
import { waitFor } from '@testing-library/react';
import { expect } from 'vitest';

/** How many sheets' history entries the phone's Back would still step over: 0 once the traversals of closed sheets have landed. */
export const sheetDepth = (): number => (window.history.state as { sheet?: number } | null)?.sheet ?? 0;

/** Resolves once every sheet that closed has its history traversal landed (waitFor: ASYNC_WAIT_MS). Call it right after cleanup(). */
export async function sheetEntriesGone(): Promise<void> {
  await waitFor(() => expect(sheetDepth()).toBe(0));
}
