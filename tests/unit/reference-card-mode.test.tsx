// tests/unit/reference-card-mode.test.tsx — the pop-up a Bible reference opens (src/markdown/ReferenceCard.tsx) shows the verse in the mode he reads in now
// (mw-5r3p30.697): English, the Weave with his weave settings, or Greek; and its Open brings the verse to the top of the chapter in the Reader, never the Verse view.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
import { pendingRequest } from '../../src/nav/readerRequest';
import { readerOf } from '../../src/nav/route';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openCard(): Promise<HTMLElement> {
  render(<ReferenceLink written="Heb 7:2">Heb 7:2</ReferenceLink>);
  await userEvent.click(screen.getByRole('link', { name: 'Heb 7:2' }));
  const card = await screen.findByRole('dialog', { name: 'Hebrews 7:2' });
  await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
  return card;
}

describe('the reference pop-up follows the view he reads in', () => {
  it('shows the English in the English view', async () => {
    const card = await openCard();
    const text = card.querySelector('[data-reference-text]') as HTMLElement;
    expect(text).toHaveAttribute('data-view', 'english');
    expect(text.textContent).toContain('Abraham apportioned');
    expect(text.querySelector('[data-woven]')).toBeNull();
    expect(within(card).getByText('Majority Standard Bible')).toBeInTheDocument();
  });

  it('shows the Greek in the Greek view', async () => {
    await setReaderView('greek');
    const card = await openCard();
    const text = card.querySelector('[data-reference-text]') as HTMLElement;
    expect(text).toHaveAttribute('data-view', 'greek');
    expect(text.textContent).toContain('Ἀβραάμ');
    expect(text.textContent).not.toContain('apportioned');
    expect(text).toHaveAttribute('lang', 'el');
  });

  it('draws the Weave with his solid words in Greek, as the Reader does', async () => {
    await setWeave('solid');
    await db.words.put({ lemma: 'δεκάτη', lemmas: ['δεκάτη'], gloss: 'a tenth', lesson: 1, state: 'solid', since: 0 });
    const card = await openCard();
    const text = card.querySelector('[data-reference-text]') as HTMLElement;
    expect(text).toHaveAttribute('data-view', 'english');
    await waitFor(() => expect(text.querySelector('[data-woven]')?.textContent).toContain('δεκάτην'));
    // a word he does not hold stays English
    expect(text.textContent).toContain('Abraham');
  });

  it('is plain English again when the Weave is off', async () => {
    await setWeave('off');
    await db.words.put({ lemma: 'δεκάτη', lemmas: ['δεκάτη'], gloss: 'a tenth', lesson: 1, state: 'solid', since: 0 });
    const card = await openCard();
    expect(card.querySelector('[data-woven]')).toBeNull();
  });
});

describe('Open', () => {
  it('brings the verse to the top of its chapter in the Reader, not the Verse view', async () => {
    const card = await openCard();
    await userEvent.click(within(card).getByRole('button', { name: 'Open' }));
    const at = readerOf(window.location.hash);
    expect(at).toMatchObject({ book: 'heb', chapter: 7 });
    expect(at.verse).toBeUndefined();
    expect(at.passage).toBeUndefined();
    expect(pendingRequest()).toMatchObject({ action: 'verse', book: 'heb', chapter: 7, verse: 2 });
  });
});
