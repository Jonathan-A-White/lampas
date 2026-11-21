// tests/unit/septuagint-caret.test.ts — Brenton's plural "ye" is "you^" in LXX2012 (mw-u2w5klk.378; its intro, data/raw/lxx/eng-lxx2012/01-INTeng-lxx2012.usfm line 8). The caret stays and the reader can
// see what it means: the English view draws it as a mark of its own, apart from the word and from the stop beside it, and a tap on it shows the tip. The data carries U+2303 (⌃); the intro's ASCII ^ reads the same.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Verse } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import { SeptuagintSources } from '../../src/reader/SeptuagintSources';
import { SEPTUAGINT_YOU_TIP, splitYouMarks } from '../../src/reader/septuagint';
import type { Lookup } from '../../src/WordSheet';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const joined = (text: string) => splitYouMarks(text).map((p) => p.text).join('');

describe('splitYouMarks: the plural mark apart from its word and its stop (acceptance 3)', () => {
  it("splits 'you⌃,' and 'you⌃;' into the word, the mark and the stop", () => {
    expect(splitYouMarks('rejoice, you⌃, that dwell')).toEqual([{ text: 'rejoice, you', mark: false }, { text: '⌃', mark: true }, { text: ', that dwell', mark: false }]);
    expect(splitYouMarks('Behold you⌃;')).toEqual([{ text: 'Behold you', mark: false }, { text: '⌃', mark: true }, { text: ';', mark: false }]);
  });

  it("splits a capital 'You⌃' and the ASCII 'you^' alike, every one in a chunk", () => {
    expect(splitYouMarks('You⌃ shall, and you^ shall')).toEqual([
      { text: 'You', mark: false }, { text: '⌃', mark: true }, { text: ' shall, and you', mark: false }, { text: '^', mark: true }, { text: ' shall', mark: false },
    ]);
    expect(splitYouMarks('you⌃ you⌃ you⌃').filter((p) => p.mark)).toHaveLength(3);
  });

  it('keeps the text whole: the pieces joined are the chunk, and a chunk with no mark is one piece', () => {
    for (const text of ['Draw you⌃ there-fore', 'you⌃', 'a ^ stray, ⌃ too', 'no mark here.']) expect(joined(text)).toBe(text);
    expect(splitYouMarks('no mark here.')).toEqual([{ text: 'no mark here.', mark: false }]);
  });

  it('does not take a caret that follows no word for the mark', () => {
    expect(splitYouMarks('^ alone').some((p) => p.mark)).toBe(false);
    expect(splitYouMarks('and ⌃ apart').some((p) => p.mark)).toBe(false);
  });
});

const verse = (t: string): Verse =>
  ({
    n: 3,
    ref: { book: 'isa', chapter: 12, verse: 3 },
    g: [{ t: 'καὶ', tr: 'kai', s: '', l: 'καί', p: 'CONJ', y: '1', c: 0.9 }],
    e: [{ t, g: [0], y: 'align' as const }],
  }) as unknown as Verse;

const draw = (t: string, looks: Lookup[] = [], extra: Record<string, unknown> = {}) =>
  render(createElement(VerseText, { verse: verse(t), view: 'english', woven: null, gaps: false, onUnlinked: () => undefined, onLook: (l: Lookup) => looks.push(l), ...extra }));

describe('the English view draws the mark and its tip (acceptance 2)', () => {
  it("draws each 'you⌃' with a mark of its own, and the tip is not there until it is tapped", () => {
    draw('Draw you⌃ there-fore, and rejoice, you⌃ that dwell; You⌃ shall');
    expect(screen.getAllByRole('button', { name: /plural/i })).toHaveLength(3);
    expect(screen.queryByText(SEPTUAGINT_YOU_TIP)).toBeNull();
  });

  it('shows the tip on a tap of the mark, closes it on a tap elsewhere and on Escape, and a second tap on the mark closes it', () => {
    draw('Draw you⌃ there-fore');
    const [mark] = screen.getAllByRole('button', { name: /plural/i });
    fireEvent.click(mark);
    expect(screen.getByText(SEPTUAGINT_YOU_TIP)).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByText(SEPTUAGINT_YOU_TIP)).toBeNull();
    fireEvent.click(mark);
    expect(screen.getByText(SEPTUAGINT_YOU_TIP)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(SEPTUAGINT_YOU_TIP)).toBeNull();
    fireEvent.click(mark);
    fireEvent.click(mark);
    expect(screen.queryByText(SEPTUAGINT_YOU_TIP)).toBeNull();
  });

  it('a tap on the mark opens no word sheet and no verse; the chunk is still a tap target around it', () => {
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw('Draw you⌃ there-fore', looks, { onUnlinked: () => opened.push(3) });
    fireEvent.click(screen.getAllByRole('button', { name: /plural/i })[0]);
    expect(looks).toEqual([]);
    expect(opened).toEqual([]);
    fireEvent.click(screen.getByText(/there-fore/));
    expect(looks).toHaveLength(1);
  });

  it("the word 'you' stays text of the chunk, whose lookup keeps the chunk's own text", () => {
    const looks: Lookup[] = [];
    draw('Draw you⌃ there-fore', looks);
    fireEvent.click(screen.getByText(/Draw you/));
    expect(looks[0].english).toBe('Draw you⌃ there-fore');
  });

  it('is drawn for the Septuagint only: a chunk of any other text keeps its caret as text', () => {
    render(createElement(VerseText, { verse: verse('Draw you⌃ there-fore'), view: 'english', woven: null, onLook: () => undefined }));
    expect(screen.queryAllByRole('button', { name: /plural/i })).toHaveLength(0);
  });

  it('is plain on a card (still), where nothing is tapped', () => {
    draw('Draw you⌃ there-fore', [], { still: true });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/Draw you/).textContent).toContain('you⌃');
  });
});

describe('the sources sheet carries the same note', () => {
  it('says what the mark means', () => {
    render(createElement(SeptuagintSources, { onClose: () => undefined }));
    expect(screen.getByText(SEPTUAGINT_YOU_TIP)).toBeTruthy();
  });
});
