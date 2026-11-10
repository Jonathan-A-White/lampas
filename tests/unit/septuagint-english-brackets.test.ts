// tests/unit/septuagint-english-brackets.test.ts — Brenton's square brackets in the Septuagint's English view (mw-u2w5klk.331; the Tester's finding mw-u2w5klk.299 on Genesis 35:16).
// Brenton brackets words the Greek lacks ('[And Jacob removed from Baethel, and pitched his tent beyond the tower of Gader,] and it came to pass'). They look like Swete's lacuna brackets, so Settings >
// Show manuscript gaps governs them too (PROVISIONAL, the Governor to confirm): Off drops the bracket characters and keeps every word, On draws them as printed. Display only: the chunk keeps its `t`,
// so lookup, speech, copy and search read what they always did. The Greek view and a text that is not the Septuagint are unchanged.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { ParagraphView } from '../../src/reader/ChapterText';
import { VerseText } from '../../src/reader/VerseText';
import { chunkShown } from '../../src/reader/septuagint';
import type { Lookup } from '../../src/WordSheet';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const word = (t: string, l: string): GreekWord => ({ t, tr: '', s: '', l, p: 'N-NSM', y: '1', c: 0.9 });
const PRINTED = '[And Jacob removed from Baethel, and pitched his tent beyond the tower of Gader,] and it came to pass when Israel dwelt in that land, that Reuben went.';
const BARE = 'And Jacob removed from Baethel, and pitched his tent beyond the tower of Gader, and it came to pass when Israel dwelt in that land, that Reuben went.';
/** Genesis 35:16-22 as Brenton's English is a chunk a verse, with a chunk the bracket opens in and one it closes in, as a gloss paired to words can be */
const chunk = (t: string, g: number[]): EnglishChunk => ({ t, g });
const GEN35: Verse = {
  n: 16,
  ref: { book: 'gen', chapter: 35, verse: 16 },
  g: [word('καὶ', 'καί'), word('ἐξῆρεν', 'ἐξαίρω')],
  e: [chunk(PRINTED, [0, 1])],
} as unknown as Verse;
const SPLIT: Verse = { ...GEN35, e: [chunk('[And Jacob removed', [0]), chunk('from Baethel,] and it came to pass.', [1])] } as unknown as Verse;

/** Psalm 146:8 as the file holds it: a chunk that is only the bracket, paired to no word, then the chunk that closes it */
const LONE: Verse = { ...GEN35, e: [chunk('He lifts up the lowly;', [0]), chunk('[', []), chunk('the Lord loves the righteous;', [1]), chunk('and the poor of men;]', [1])] } as unknown as Verse;

const text = (container: HTMLElement): string => (container.querySelector('[data-text]')?.textContent ?? '').replace(/\s+/g, ' ').trim();
const draw = (verse: Verse, gaps: boolean | undefined, view: 'english' | 'greek' = 'english', looks: Lookup[] = []) =>
  render(createElement(VerseText, { verse, view, woven: null, onLook: (l: Lookup) => looks.push(l), gaps }));

describe('the English view of Genesis 35:16 (acceptance 1)', () => {
  it('Show manuscript gaps Off: no bracket is drawn and every word that was inside them is, in order', () => {
    const { container } = draw(GEN35, false);
    expect(container.textContent).not.toMatch(/[[\]]/);
    expect(text(container)).toBe(BARE);
  });

  it('Show manuscript gaps On: the brackets are drawn as printed', () => {
    const { container } = draw(GEN35, true);
    expect(text(container)).toBe(PRINTED);
  });

  it('Off drops a bracket that opens in one chunk and closes in the next', () => {
    const { container } = draw(SPLIT, false);
    expect(text(container)).toBe('And Jacob removed from Baethel, and it came to pass.');
  });

  it('Off draws no empty chunk for a chunk that is only a bracket; On draws it', () => {
    const off = draw(LONE, false);
    expect(text(off.container)).toBe('He lifts up the lowly; the Lord loves the righteous; and the poor of men;');
    expect(off.container.querySelectorAll('[data-chunk]')).toHaveLength(3);
    cleanup();
    const on = draw(LONE, true);
    expect(text(on.container)).toBe('He lifts up the lowly; [ the Lord loves the righteous; and the poor of men;]');
    expect(on.container.querySelectorAll('[data-chunk]')).toHaveLength(4);
  });

  it("the Reader's paragraph layout draws the same", () => {
    for (const [gaps, expected] of [[false, BARE], [true, PRINTED]] as const) {
      const { container } = render(createElement(ParagraphView, { verses: [GEN35], view: 'english', septuagint: 35, gaps, woven: [null], selected: null, reading: null, onSelect: () => undefined, onPlay: () => undefined, onLook: () => undefined }));
      expect(text(container)).toContain(expected);
      cleanup();
    }
  });
});

describe('what is not drawn is not changed (acceptance 2 and 3)', () => {
  it('a text that is not the Septuagint (gaps absent) keeps its brackets whatever it holds', () => {
    const { container } = draw(GEN35, undefined);
    expect(text(container)).toBe(PRINTED);
  });

  it('the chunk keeps its text, so a tap, copy, speech and search read what they did', () => {
    const looks: Lookup[] = [];
    draw(GEN35, false, 'english', looks);
    fireEvent.click(document.querySelector('[data-chunk="0"]') as HTMLElement);
    expect(looks).toHaveLength(1);
    expect(looks[0].english).toBe(PRINTED);
    expect(GEN35.e[0].t).toBe(PRINTED);
  });

  it('the Greek view draws no English at all, with the setting either way', () => {
    for (const gaps of [false, true]) {
      const { container } = draw(GEN35, gaps, 'greek');
      expect(text(container)).toBe('καὶ ἐξῆρεν');
      cleanup();
    }
  });

  it('chunkShown takes out the brackets only when gaps is false', () => {
    expect(chunkShown(PRINTED, false)).toBe(BARE);
    expect(chunkShown(PRINTED, true)).toBe(PRINTED);
    expect(chunkShown(PRINTED, undefined)).toBe(PRINTED);
  });
});
