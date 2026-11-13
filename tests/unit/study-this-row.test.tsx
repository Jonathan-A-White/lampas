// The 'Study this' row drawn by itself (mw-indx1x6.6, src/review/StudyThis.tsx): a missed word's links open its word sheet and how to remember it, over the question, and close back to the row.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pictureUrl } from '../../src/data/pictures';
import type { Question } from '../../src/data/quiz';
import { wordHeart } from '../../src/data/wordHeart';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { StudyThis } from '../../src/review/StudyThis';
import { studyOfWord, type Study } from '../../src/review/studyThis';
import { stubChapterFetch } from '../support/chapter-fetch';

const LEMMA = ['λόγος', 'ἀγάπη', 'θεός', 'πίστις', 'χάρις'].find((l) => wordHeart(l) || pictureUrl(l)) ?? '';
const word: Question = { lemma: LEMMA, prompt: LEMMA, gloss: 'the meaning asked', options: ['the meaning asked', 'law', 'sin', 'grace'] };
const NOTHING: Study = { links: [], miss: { asked: 'Say this word aloud: blessed', answer: 'Not yet', right: 'blessed', idea: 'Saying the word blessed' } };
const NO_LICENCE: LicenceDetail = { licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => {}, siteIssued: false, removed: () => {} };

beforeEach(() => {
  stubChapterFetch();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the Study this row', () => {
  it('has a word that some note or picture helps remember', () => {
    expect(LEMMA).not.toBe('');
  });

  it('opens how to remember the word as a layer, with its note or picture, and closes back to the row', async () => {
    const user = userEvent.setup();
    render(<StudyThis study={studyOfWord(word, 'law')} screen="Review" back="Back to Review" />);
    const row = screen.getByRole('group', { name: 'Study this' });
    expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual([`Word: ${LEMMA}`, 'How to remember it']);
    await user.click(within(row).getByRole('button', { name: 'How to remember it' }));
    const layer = await screen.findByRole('dialog', { name: `How to remember ${LEMMA}` });
    expect(within(layer).getByTestId('mnemonic-word')).toHaveTextContent(LEMMA);
    expect(within(layer).getByText('the meaning asked')).toBeInTheDocument();
    expect(within(layer).queryByTestId('word-heart') ?? within(layer).queryByTestId('mnemonic-picture')).not.toBeNull();
    await user.click(within(layer).getByRole('button', { name: 'Back to Review' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: `How to remember ${LEMMA}` })).toBeNull());
    expect(screen.getByRole('group', { name: 'Study this' })).toBeInTheDocument();
  });

  it('opens the word’s sheet over the question', async () => {
    const user = userEvent.setup();
    render(<StudyThis study={studyOfWord(word, 'law')} screen="Review" back="Back to Review" />);
    await user.click(screen.getByRole('button', { name: `Word: ${LEMMA}` }));
    const sheet = await screen.findByRole('dialog', { name: 'Word' });
    expect(sheet).toHaveTextContent(LEMMA);
  });

  it('with nothing to link is Ask the tutor alone on a licensed phone, and nothing at all with no licence', () => {
    const { unmount } = render(<StudyThis study={NOTHING} screen="Review" back="Back to Review" />);
    expect(within(screen.getByRole('group', { name: 'Study this' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ask the tutor']);
    unmount();
    render(
      <LicenceContext.Provider value={NO_LICENCE}>
        <StudyThis study={NOTHING} screen="Review" back="Back to Review" />
      </LicenceContext.Provider>,
    );
    expect(screen.queryByRole('group', { name: 'Study this' })).toBeNull();
  });

  it('still links what teaches the question with no licence', () => {
    render(
      <LicenceContext.Provider value={NO_LICENCE}>
        <StudyThis study={studyOfWord(word, 'law')} screen="Review" back="Back to Review" />
      </LicenceContext.Provider>,
    );
    expect(within(screen.getByRole('group', { name: 'Study this' })).getByRole('button', { name: `Word: ${LEMMA}` })).toBeInTheDocument();
  });
});
