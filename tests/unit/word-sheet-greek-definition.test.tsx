// The Greek word card's Definition (mw-5r3p30.1170): every Greek lex entry has `d`, and the card drew none (only the Hebrew card did). A word of Matthew 1:1 shows the lexicon's definition as
// the `sheet-definition` fact, laid out by Definition; a word whose lex entry has no `d` draws no row, and a form-only word of a variant reading none either.
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { WordSheet } from '../../src/WordSheet';

afterEach(cleanup);

const matthew = (): Chapter => JSON.parse(readFileSync('public/data/mat/1.json', 'utf8')) as Chapter;

const sheet = (chapter: Chapter, index: number): void => {
  render(<WordSheet chapter={chapter} lookup={{ words: [chapter.verses[0].g[index]], fromEnglish: false, verse: 1 }} onClose={() => undefined} />);
};

describe('the Greek word card’s Definition', () => {
  it('shows βίβλος of Matthew 1:1 with the lexicon’s definition', async () => {
    const chapter = matthew();
    const word = chapter.verses[0].g[0];
    expect(word.s).toBe('G976');
    sheet(chapter, 0);
    const fact = await screen.findByTestId('sheet-definition');
    expect(fact.textContent).toContain('a book, a roll');
    expect(fact.querySelector('[data-testid="definition"]')).not.toBeNull();
  });

  it('draws no Definition row for a word whose lex entry has no `d`', async () => {
    const chapter = matthew();
    const word = chapter.verses[0].g[0];
    delete chapter.lex[word.s].d;
    sheet(chapter, 0);
    await screen.findByTestId('sheet-word');
    expect(screen.queryByTestId('sheet-definition')).toBeNull();
  });
});
