// tests/support/status.ts — the status line a screen draws, found without the app's own live region (src/ui/LiveRegion.tsx, role status, present on every
// screen from mw-cwf538.3): `screen.getByRole('status')` finds two when the whole app is drawn.
import { screen, waitFor } from '@testing-library/react';

const lines = (): HTMLElement[] => screen.queryAllByRole('status').filter((el) => !el.hasAttribute('data-live-region'));

/** The one status line on the screen; throws when there is none or more than one. */
export function statusLine(): HTMLElement {
  const found = lines();
  if (found.length !== 1) throw new Error(`Expected one status line on the screen, found ${found.length}`);
  return found[0];
}

/** The status line once it is drawn. */
export const findStatusLine = (): Promise<HTMLElement> => waitFor(() => statusLine());

/** The status line, or null when the screen draws none. */
export const queryStatusLine = (): HTMLElement | null => lines()[0] ?? null;
