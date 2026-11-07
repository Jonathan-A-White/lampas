// tests/unit/diagram-weave.test.ts — the English diagram as the Weave shows the verse (mw-souyao.5): weaveDiagramWords puts the Greek of a woven chunk in the place of its English words, and
// DiagramPane draws a change of Weave from the one tree it was given, with one grind request however often the Weave is switched.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { weaveVerse, withBeside, wovenInOrder, type WovenVerse } from '../../src/data/weave';
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

describe('weaveDiagramWords and the Greek the Weave shows beside an English chunk', () => {
  // Mark 12:16 as he saw it (mw-5r3p30.1141): 'So' is a supplied word for δέ, so the Weave keeps it English and shows δὲ in gold before it
  const mark12 = JSON.parse(readFileSync('public/data/mrk/12.json', 'utf8')) as Chapter;
  const mark16 = mark12.verses.find((v) => v.n === 16) as Verse;
  const lemmas = (...l: string[]) => ({ solid: new Set(l.map((x) => x.normalize('NFC'))) });
  const wovenBeside = (verse: Verse, ...l: string[]): WovenVerse => withBeside(wovenInOrder(verse, weaveVerse(verse, lemmas(...l)), 'english'), verse, lemmas(...l));
  const english16: DiagramWords = [
    { text: 'So', chunk: 0 },
    { text: 'they', chunk: 1 },
    { text: 'brought', chunk: 1 },
    { text: 'it', chunk: 1 },
  ];

  it("draws δὲ beside 'So' in Mark 12:16, the way the woven text shows it, and leaves the other words English", () => {
    const woven = wovenBeside(mark16, 'δέ');
    const shown = weaveDiagramWords(english16, [mark16], () => woven);
    expect(textsOf(shown)).toEqual(['δὲ So', 'they', 'brought', 'it']);
    expect(shown[0]).toMatchObject({ chunk: 0, beside: [1] });
    expect(shown[0].weft).toBeUndefined();
    expect(shown[1]).toBe(english16[1]);
  });

  it('puts the Greek beside a chunk on its first English word (γάρ, μέν, οὖν work as δέ does), and a woven chunk is drawn by weft, not beside', () => {
    const verse: Verse = {
      n: 1,
      g: [
        { t: 'μὲν', l: 'μέν' },
        { t: 'οὖν', l: 'οὖν' },
        { t: 'γὰρ', l: 'γάρ' },
        { t: 'ἄλλος', l: 'ἄλλος' },
      ],
      e: [
        { t: 'Indeed then', g: [0, 1] },
        { t: 'for', g: [2] },
        { t: 'another', g: [3] },
      ],
    } as unknown as Verse;
    const words: DiagramWords = [
      { text: 'Indeed', chunk: 0 },
      { text: 'then', chunk: 0 },
      { text: 'for', chunk: 1 },
      { text: 'another', chunk: 2 },
    ];
    const woven = wovenBeside(verse, 'μέν', 'γάρ');
    expect(woven.beside?.[0]).toHaveLength(1);
    const shown = weaveDiagramWords(words, [verse], () => woven);
    // chunk 1 is one Greek word he knows: woven whole, so it is drawn in Greek by weft, not beside
    expect(textsOf(shown)).toEqual(['μὲν Indeed', 'then', 'γὰρ', 'another']);
    expect(shown[0].beside).toEqual([0]);
    expect(shown[2]).toMatchObject({ weft: [2] });
    expect(shown[2].beside).toBeUndefined();
    expect(shown[3]).toBe(words[3]);
  });

  it('returns the very same words when no chunk has Greek beside it', () => {
    const none = wovenBeside(mark16, 'ἐπιγραφή');
    expect(weaveDiagramWords(english16, [mark16], () => none)).toBe(english16);
  });
});

describe('DiagramPane and the Greek beside an English word', () => {
  it("draws δὲ before 'So' in Mark 12:16 while the Weave is on, and plain 'So' when it is off", async () => {
    const mark12 = JSON.parse(readFileSync('public/data/mrk/12.json', 'utf8')) as Chapter;
    const verse = mark12.verses.find((v) => v.n === 16) as Verse;
    const words: DiagramWords = [
      { text: 'So', chunk: 0 },
      { text: 'they', chunk: 1 },
      { text: 'brought', chunk: 1 },
      { text: 'it', chunk: 1 },
    ];
    const diagram = {
      clauses: [
        {
          clause: {
            subject: { words: [{ i: 1 }], modifiers: [] },
            verb: { words: [{ i: 2 }], modifiers: [{ kind: 'word', word: { i: 0 }, modifiers: [] }] },
            complement: { kind: 'direct-object', slot: { words: [{ i: 3 }], modifiers: [] } },
          },
        },
      ],
    };
    fetchDiagram.mockResolvedValue({ ok: true, diagram, words, kept: false });
    const lemmas = { solid: new Set(['δέ'.normalize('NFC')]) };
    const woven = mark12.verses.map((v) => withBeside(wovenInOrder(v, weaveVerse(v, lemmas), 'english'), v, lemmas));
    const pane = (w: readonly WovenVerse[] | null) => createElement(DiagramPane, { chapter: mark12, verse, view: 'english', woven: w, onLook: () => undefined });
    const { rerender } = render(pane(null));
    expect(await screen.findAllByRole('button', { name: 'So' })).not.toHaveLength(0);
    const soCount = screen.getAllByRole('button', { name: 'So' }).length;
    rerender(pane(woven));
    expect(screen.queryByRole('button', { name: 'So' })).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'δὲ So' });
    expect(buttons).toHaveLength(soCount);
    expect(buttons[0].querySelector('[lang="el"]')).toHaveTextContent('δὲ');
    expect(screen.getAllByRole('button', { name: 'they' })).not.toHaveLength(0);
    rerender(pane(null));
    expect(screen.getAllByRole('button', { name: 'So' })).toHaveLength(soCount);
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
