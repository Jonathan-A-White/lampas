// tests/unit/diagram-weave.test.ts — the English diagram as the Weave shows the verse (mw-souyao.5): weaveDiagramWords puts the Greek of a woven chunk in the place of its English words, and
// DiagramPane draws a change of Weave from the one tree it was given, with one grind request however often the Weave is switched.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { weaveVerse, wovenInOrder, type WovenVerse } from '../../src/data/weave';
import { DiagramPane } from '../../src/diagram/DiagramPane';
import { weaveDiagramWords } from '../../src/diagram/weave';
import type { DiagramWords } from '../../src/diagram/types';
import { loadFixture } from '../support/diagram-fixtures';

const fetchDiagram = vi.hoisted(() => vi.fn());
vi.mock('../../src/diagram/fetchDiagram', () => ({ fetchDiagram }));

const col3 = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as Chapter;
const verse1 = col3.verses[0];
const english = loadFixture('english');
const wovenWith = (...lemmas: string[]): WovenVerse[] => col3.verses.map((v) => wovenInOrder(v, weaveVerse(v, { solid: new Set(lemmas.map((l) => l.normalize('NFC'))) }), 'english'));
const textsOf = (words: DiagramWords): string[] => words.map((w) => w.text);

afterEach(() => {
  cleanup();
  fetchDiagram.mockReset();
});

describe('weaveDiagramWords', () => {
  it('draws a woven chunk in Greek, the way the woven text shows it, and leaves the rest English', () => {
    const woven = wovenWith('Χριστός');
    const shown = weaveDiagramWords(english.words, [verse1], (v) => woven[col3.verses.indexOf(v)]);
    expect(textsOf(shown)).toEqual(textsOf(english.words).map((t, i) => (i === 7 ? 'χριστῷ' : i === 14 ? 'χριστός' : t)));
    expect(shown[7]).toMatchObject({ text: 'χριστῷ', chunk: 3, weft: [4] });
    expect(shown[14]).toMatchObject({ text: 'χριστός', chunk: 8, weft: [10] });
    expect(shown.filter((w) => w.weft)).toHaveLength(2);
    expect(shown[8]).toBe(english.words[8]);
  });

  it('puts a one-word Greek chunk on the first of its English words and draws the others as nothing', () => {
    const woven = wovenWith('συνεγείρω');
    const shown = weaveDiagramWords(english.words, [verse1], (v) => woven[col3.verses.indexOf(v)]);
    expect(textsOf(shown).slice(2, 7)).toEqual(['συνηγέρθητε', '', '', '', '']);
    expect(shown[2].weft).toEqual([2]);
    expect(shown[3].weft).toEqual([]);
  });

  it('gives the last English word of a chunk the Greek words that are left when the Greek is the longer', () => {
    const verse: Verse = { n: 1, g: [{ t: 'α' }, { t: 'β' }, { t: 'γ' }], e: [{ t: 'one two', g: [0, 1, 2] }] } as unknown as Verse;
    const words: DiagramWords = [
      { text: 'one', chunk: 0 },
      { text: 'two', chunk: 0 },
    ];
    const shown = weaveDiagramWords(words, [verse], () => Object.assign([{ words: verse.g, learning: false }]));
    expect(textsOf(shown)).toEqual(['α', 'β γ']);
    expect(shown.map((w) => w.weft)).toEqual([[0], [1, 2]]);
  });

  it('returns the very same words when nothing is woven', () => {
    expect(weaveDiagramWords(english.words, [verse1], () => null)).toBe(english.words);
    const none = wovenWith();
    expect(weaveDiagramWords(english.words, [verse1], (v) => none[col3.verses.indexOf(v)])).toBe(english.words);
  });
});

describe('DiagramPane and the Weave', () => {
  it('asks once for a verse however often the Weave is switched on and off, and draws the Greek while it is on', async () => {
    fetchDiagram.mockResolvedValue({ ok: true, diagram: english.diagram, words: english.words, kept: false });
    const woven = wovenWith('Χριστός');
    const pane = (w: readonly WovenVerse[] | null) => createElement(DiagramPane, { chapter: col3, verse: verse1, view: 'english', woven: w, onLook: () => undefined });
    const { rerender } = render(pane(null));
    expect(await screen.findAllByRole('button', { name: 'Christ' })).toHaveLength(2);
    rerender(pane(woven));
    expect(screen.queryByRole('button', { name: 'Christ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'χριστῷ' })).toHaveAttribute('lang', 'el');
    expect(screen.getByRole('button', { name: 'χριστός' })).toBeInTheDocument();
    rerender(pane(null));
    expect(screen.getAllByRole('button', { name: 'Christ' })).toHaveLength(2);
    rerender(pane(woven));
    rerender(pane(null));
    expect(fetchDiagram).toHaveBeenCalledTimes(1);
  });
});
