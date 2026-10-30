import { createContext } from 'react';

/** The key of the setting a link opened Settings at (src/settings/link.ts): its row is marked and scrolled to until the next tap. Null when none. */
export const HighlightedSetting = createContext<string | null>(null);

/** Scrolls the row a link or a search result opened Settings at into view: centred, or by its top when it is taller than the screen (Grammar approach lists
 *  every approach), where its middle would show neither its name nor its end (mw-5r3p30.877). */
export function bringRowIntoView(row: Element | null | undefined): void {
  if (!row) return;
  row.scrollIntoView({ block: row.getBoundingClientRect().height > window.innerHeight ? 'start' : 'center' });
}
