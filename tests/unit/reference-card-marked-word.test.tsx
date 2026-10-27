// tests/unit/reference-card-marked-word.test.tsx — the verse card of a Review question (ὅς in Colossians 3:25 as ὃ, mw-5r3p30.817) shows the word the question is
// about, marked, whatever the view: the MSB gives ὃ no English of its own (it is part of 'his wrong'), and the card once drew the verse without it.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ReferenceLink } from '../../src/markdown/ReferenceCard';
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
  render(
    <ReferenceLink written="Colossians 3:25" mark="ὃ">
      Colossians 3:25
    </ReferenceLink>,
  );
  await userEvent.click(screen.getByRole('link', { name: 'Colossians 3:25' }));
  const card = await screen.findByRole('dialog', { name: 'Colossians 3:25' });
  await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
  return card;
}

const marked = (card: HTMLElement): string[] => [...card.querySelectorAll<HTMLElement>('[data-marked]')].map((m) => m.textContent?.trim() ?? '');

describe('the card of ὅς in Colossians 3:25 as ὃ', () => {
  it('marks ὃ in the Greek view', async () => {
    await setReaderView('greek');
    expect(marked(await openCard())).toEqual(['ὃ']);
  });

  it('marks ὃ in plain English, where the MSB has no English of its own for it', async () => {
    const card = await openCard();
    expect(marked(card)).toEqual(['ὃ']);
    // it stands where it does in the verse: beside the English of the words either side of it
    expect(card.querySelector('[data-reference-text]')?.textContent).toContain('will be repaid for ὃ his wrong,');
  });

  it('marks ὃ in the Weave, beside the Greek the Weave shows', async () => {
    await setWeave('solid');
    for (const lemma of ['ὁ', 'δέ', 'καί', 'οὐ', 'εἰμί']) await db.words.put({ lemma, lang: 'grc', lemmas: [lemma], gloss: lemma, lesson: 1, state: 'solid', since: 0 });
    const card = await openCard();
    await waitFor(() => expect(card.querySelector('[data-woven]')).not.toBeNull());
    expect(marked(card)).toEqual(['ὃ']);
  });
});
