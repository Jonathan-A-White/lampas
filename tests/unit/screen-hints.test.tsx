// Tips in place (mw-5r3p30.824): the first open of each main screen shows one HintCard line, dismissed by a tap and never shown again; each line is one sentence under 90 characters;
// Help lists them under 'Tips'. The hints are the ones of src/tips/hints.ts, drawn by src/tips/HintCard.tsx: no second tip system.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { helpPageById } from '../../src/help';
import { GOAL_OPENED, HINTS, LISTED_HINTS, MEMORIZE_OPENED, PARADIGMS_OPENED, REVIEW_OPENED, WORDS_OPENED, hints } from '../../src/tips/hints';
import { HintCard } from '../../src/tips/HintCard';

const SCREEN_EVENTS = [GOAL_OPENED, WORDS_OPENED, REVIEW_OPENED, MEMORIZE_OPENED, PARADIGMS_OPENED];

beforeEach(() => window.localStorage.removeItem('lampas.tipsDismissed'));
afterEach(cleanup);

describe('the hints written for the main screens', () => {
  it('has one for each of Goal, Words, Review, Memorize and Paradigms', () => {
    for (const event of SCREEN_EVENTS) expect(HINTS.filter((h) => h.event === event), event).toHaveLength(1);
  });

  it('is one sentence under 90 characters, for every hint', () => {
    for (const hint of HINTS) expect(hint.text.length, hint.id).toBeLessThan(90);
    // the offer to hide the chapter buttons is a question of two sentences and is not a tip (Help does not list it)
    for (const hint of LISTED_HINTS) expect(hint.text, hint.id).not.toMatch(/[.!?]\s+\S/);
  });

  it('has an id of its own for each', () => {
    expect(new Set(HINTS.map((h) => h.id)).size).toBe(HINTS.length);
  });
});

describe('a screen hint on its first open', () => {
  it('is drawn, is gone once Got it is tapped, and stays gone when the screen opens again', async () => {
    const first = render(<HintCard event={GOAL_OPENED} />);
    const text = HINTS.find((h) => h.event === GOAL_OPENED)!.text;
    expect(await screen.findByText(text)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText(text)).toBeNull();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('lampas.tipsDismissed') ?? '[]')).toContain(HINTS.find((h) => h.event === GOAL_OPENED)!.id));
    first.unmount();
    // the next open, as after a reload: the store says it was dismissed
    render(<HintCard event={GOAL_OPENED} />);
    await hints.nextTip(GOAL_OPENED).then((next) => expect(next).toBeNull());
    expect(screen.queryByText(text)).toBeNull();
  });
});

describe('Help lists the tips', () => {
  it('has a Tips page that holds every hint, so a dismissed one can be read again', () => {
    const page = helpPageById('tips');
    expect(page?.title).toBe('Tips');
    const body = page?.body.join(' ') ?? '';
    for (const hint of HINTS.filter((h) => h.id !== 'hide-chapter-buttons')) expect(body, hint.id).toContain(hint.text);
  });
});
