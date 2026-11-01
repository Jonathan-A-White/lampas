// Copy link on the word sheet (mw-5r3p30.939): a word with no Strong's number (a variant form the text never has, βιβλαρίδιον at Revelation 10:2, the NA reading)
// has no link that names it (a link opens a word by Strong's number or lemma, src/nav/links.ts), so Copy link and Share are not offered; a tagged word's link is as before.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { wordUrl } from '../../src/nav/links';
import { WordSheet } from '../../src/WordSheet';

afterEach(cleanup);

const chapter: Chapter = { book: 'Revelation', code: 'rev', chapter: 10, lex: { G1: { g: 'a scroll', d: '' } }, parse: {}, verses: [] };

describe('Copy link on the word sheet', () => {
  it('is not offered for βιβλαρίδιον, a word with no Strong\'s number', async () => {
    const word: GreekWord = { t: 'βιβλαρίδιον', tr: '', s: '', l: '', p: '' };
    render(<WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} />);
    await screen.findByTestId('sheet-word');
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('is offered for a tagged word, and its link is the Strong\'s number\'s, as before', async () => {
    const word: GreekWord = { t: 'βιβλίον', tr: '', s: 'G1', l: 'βιβλίον', p: 'N' };
    render(<WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} />);
    await screen.findByTestId('sheet-word');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
    expect(wordUrl('G1')).toMatch(/#\/\?word=G1$/);
  });

  it('is not offered for a Hebrew word with no Strong\'s number either', async () => {
    const word: GreekWord = { t: 'בְּרֵאשִׁית', tr: '', s: '', l: '', p: '' };
    render(<WordSheet chapter={{ ...chapter, lang: 'hbo' }} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} />);
    await screen.findByTestId('sheet-word');
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });
});
