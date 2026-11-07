// The English line of a Septuagint word's sheet (mw-u2w5klk.274.4, his ask 2026-11-06: Genesis 1:1 οὐρανόν showed the whole verse): the tapped word's own aligned Brenton chunk, as the New Testament's
// word shows its MSB chunk; a word with no chunk shows the whole verse's English, and the sheet says it is the whole verse. A New Testament word and a Hebrew word are as they were.
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { bareEnglish, type Chapter, type EnglishChunk, type GreekWord } from '../../src/data/chapter';
import { WordSheet } from '../../src/WordSheet';

afterEach(cleanup);

const WHOLE = 'In the beginning God made the heaven and the earth.';

/** Genesis 1 from the Septuagint fixture, its first verse re-cut into aligned chunks (the shape lxx:align writes): ὁ (3) has no chunk, τὸν (5) is paired to nothing and has none either. */
function aligned(): Chapter {
  const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
  const e: EnglishChunk[] = [
    { t: 'In', g: [0], c: 0.7, y: 'align' },
    { t: 'the beginning', g: [1], c: 0.8, y: 'model' },
    { t: 'God', g: [4], c: 0.85, y: 'align' },
    { t: 'made', g: [2], c: 0.85, y: 'align' },
    { t: 'the', g: [], y: 'model', c: 0.5 },
    { t: 'heaven', g: [6], c: 0.85, y: 'align' },
    { t: 'and', g: [7], c: 0.85, y: 'align' },
    { t: 'the', g: [8], c: 0.55, y: 'align' },
    { t: 'earth.', g: [9], c: 0.9, y: 'align' },
  ];
  const verse = chapter.verses[0];
  const at = (i: number): number | undefined => {
    const k = e.findIndex((c) => c.g.includes(i));
    return k < 0 ? undefined : k;
  };
  verse.g.forEach((w, i) => {
    delete w.e;
    const k = at(i);
    if (k !== undefined) w.e = k;
  });
  verse.e = e;
  return chapter;
}

const sheet = (chapter: Chapter, word: GreekWord, english?: string): void => {
  render(<WordSheet chapter={chapter} lookup={{ words: [word], english, fromEnglish: false }} onClose={() => undefined} />);
};

describe('the English line of a Septuagint word', () => {
  it('is the tapped word’s own chunk: οὐρανόν in Genesis 1:1 reads “heaven”, not the whole verse', async () => {
    const chapter = aligned();
    const word = chapter.verses[0].g[6];
    expect(word.t).toBe('οὐρανὸν');
    sheet(chapter, word, chapter.verses[0].e[word.e!].t);
    const line = await screen.findByTestId('sheet-english');
    expect(line.textContent).toBe('heaven');
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });

  it('is the own chunk even when the tap came with no English at all (a word opened from a list)', async () => {
    const chapter = aligned();
    sheet(chapter, chapter.verses[0].g[9]);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe('earth');
  });

  it('is the whole verse, labelled as the whole verse, for a word with no chunk', async () => {
    const chapter = aligned();
    const word = chapter.verses[0].g[3];
    expect(word.e).toBeUndefined();
    sheet(chapter, word);
    const line = await screen.findByTestId('sheet-english');
    expect(line.textContent).toContain(WHOLE.replace(/\.$/, ''));
    const label = screen.getByTestId('sheet-english-whole');
    expect(label.textContent).toBe('This word has no English of its own: the whole verse.');
    expect(line.contains(label)).toBe(true);
  });

  it('is the whole verse, labelled, for a word of a chapter the aligner has not cut (one chunk holds every word)', async () => {
    const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
    const word = chapter.verses[0].g[6];
    expect(word.e).toBe(0);
    sheet(chapter, word, chapter.verses[0].e[0].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toContain(WHOLE.replace(/\.$/, ''));
    expect(screen.getByTestId('sheet-english-whole')).toBeTruthy();
  });

  it('is unchanged for a New Testament word: its MSB chunk, with no whole-verse label', async () => {
    const mat = JSON.parse(readFileSync('public/data/mat/1.json', 'utf8')) as Chapter;
    const verse = mat.verses[0];
    const word = verse.g.find((w) => w.e !== undefined)!;
    sheet(mat, word, verse.e[word.e!].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe(bareEnglish(verse.e[word.e!].t));
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });

  it('is unchanged for a Hebrew word: its chunk', async () => {
    const gen = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
    const verse = gen.verses[0];
    const word = verse.g.find((w) => w.e !== undefined)!;
    sheet(gen, word, verse.e[word.e!].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe(bareEnglish(verse.e[word.e!].t));
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });
});
