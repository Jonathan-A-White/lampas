// tests/support/verse-number.ts — a verse's number button in the Reader, found beside its own markup. A role query on `screen` walks every word of the chapter (a button for each), 3 s and more on a
// loaded host (mw-indx1x6.41; the same cost as open-tutor.ts's dialogNamed, mw-5r3p30.555), so a step reaches the number through the attribute the Reader draws it with (src/reader/VerseText.tsx).
import { waitFor } from '@testing-library/react';

/** The number button of verse `n` ('Verse 2'), or null while the Reader draws none. */
export const queryVerseNumber = (n: number): HTMLElement | null => document.querySelector<HTMLElement>(`[data-verse-number][aria-label="Verse ${n}"]`);

/** The number button of verse `n`, waiting for the Reader to draw it. */
export const findVerseNumber = (n: number): Promise<HTMLElement> =>
  waitFor(() => {
    const found = queryVerseNumber(n);
    if (!found) throw new Error(`the Reader draws no number for verse ${n}`);
    return found;
  });
