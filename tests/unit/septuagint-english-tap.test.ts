// tests/unit/septuagint-english-tap.test.ts — a tap on a Septuagint English chunk with no word link (mw-u2w5klk.278; the Governor's report 2026-11-06, Genesis 1:5 "I'm clicking night and it's giving me something very weird").
// Brenton's English is one chunk a verse holding every Greek word of it, with no pairing (`data:build:lxx`), so a tap on 'Night' opened the word sheet of the verse's first word, καὶ. Until the aligner pairs the
// chunk (scripts/lxx/align.ts, mw-u2w5klk.274.1) a tap on a chunk with no link opens no word, never a wrong one; a chunk the aligner paired opens its own words, as the New Testament's does.
// mw-u2w5klk.349.67 (the Governor's report 2026-11-20, Genesis 1:1 'the' in the Weave opened the Verse view): such a tap now opens a small sheet of its own, not the Verse view: 'Added in English: the Greek has no word here'
// for a word the aligner knows has no Greek word, 'Not matched to its Greek word yet' for a chunk not paired yet; the verse's number still opens the Verse view.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter, EnglishChunk, Verse } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import { ParagraphView } from '../../src/reader/ChapterText';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { wovenOf } from '../../src/reader/useWoven';
import type { ReaderSettings } from '../../src/reader/useReaderSettings';
import type { Lookup } from '../../src/WordSheet';
import { alignChapter } from '../../scripts/lxx/align';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const plain = read<Chapter>('tests/fixtures/data-lxx/gen/1.json');
const lexicon = read<Record<string, { g?: string }>>('tests/fixtures/data-lxx/lexicon-grc-lxx.json');
const aligned = alignChapter(plain, (lemma) => lexicon[lemma]?.g ?? '').chapter;
const verse = (chapter: Chapter, n: number): Verse => chapter.verses.find((v) => v.n === n) as Verse;

const ADDED = 'Added in English: the Greek has no word here';
const NOT_MATCHED = 'Not matched to its Greek word yet';

/** Genesis 1:5 as the Reader draws it in the English view, with the Septuagint's guard (`onUnlinked`) or without it (the New Testament and the Old Testament) */
const draw = (v: Verse, looks: Lookup[], opened: number[], septuagint = true) =>
  render(createElement(VerseText, { verse: v, view: 'english', woven: null, onLook: (l: Lookup) => looks.push(l), onUnlinked: septuagint ? () => opened.push(v.n) : undefined }));

describe('a Septuagint chunk with no word link (acceptance 1)', () => {
  it('is what data:build:lxx writes: one chunk holding every Greek word of Genesis 1:5, paired to none', () => {
    const v = verse(plain, 5);
    expect(v.e).toHaveLength(1);
    expect(v.e[0].g).toHaveLength(v.g.length);
    expect(v.e[0].y).toBeUndefined();
    expect(septuagintChunkLinked(v.e[0])).toBe(false);
  });

  it("opens no word's sheet and not the Verse view when 'Night' is tapped: a small sheet says it is not matched to its Greek word yet", () => {
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(verse(plain, 5), looks, opened);
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    expect(looks).toEqual([]);
    expect(opened).toEqual([]);
    expect(screen.getByText(NOT_MATCHED)).toBeTruthy();
  });

  it("does the same in the Reader's paragraph layout, and the verse's number still opens the Verse view", () => {
    const looks: Lookup[] = [];
    const selected: number[] = [];
    render(
      createElement(ParagraphView, {
        verses: [verse(plain, 5)], view: 'english', septuagint: 1, woven: [null], selected: null, reading: null,
        onSelect: (n: number) => selected.push(n), onPlay: () => undefined, onLook: (l: Lookup) => looks.push(l),
      }),
    );
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    expect(looks).toEqual([]);
    expect(selected).toEqual([]);
    expect(screen.getByText(NOT_MATCHED)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verse 5' }));
    expect(selected).toEqual([5]);
  });
});

describe('a chunk the aligner left unlinked (acceptance 4)', () => {
  const remainder = (v: Verse): Verse => ({ ...v, e: [{ t: 'and there was evening', g: [], y: 'align?' as const }, ...v.e.slice(1)] });

  it('is a chunk with no word in it, whatever the aligner called it', () => {
    expect(septuagintChunkLinked({ g: [], y: 'align?' })).toBe(false);
    expect(septuagintChunkLinked({ g: [], y: 'align' })).toBe(false);
    expect(septuagintChunkLinked({ g: [], y: 'model' })).toBe(false);
    expect(septuagintChunkLinked({ g: [3] })).toBe(false);
  });

  it('opens the sheet that says the Greek has no word here, in a verse the aligner paired elsewhere', () => {
    const v = remainder(verse(aligned, 5));
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(v, looks, opened);
    fireEvent.click(screen.getByText('and there was evening'));
    expect(looks).toEqual([]);
    expect(opened).toEqual([]);
    expect(screen.getByText(ADDED)).toBeTruthy();
  });
});

describe('a chunk the aligner paired (acceptance 2)', () => {
  const linked = (chapter: Chapter): { v: Verse; chunk: EnglishChunk } => {
    const v = chapter.verses.find((x) => x.e.some((c) => c.y === 'align' && c.g.length > 0 && c.g.length < x.g.length)) as Verse;
    return { v, chunk: v.e.find((c) => c.y === 'align' && c.g.length > 0 && c.g.length < v.g.length) as EnglishChunk };
  };

  it('is a chunk of Greek words the aligner paired', () => {
    expect(septuagintChunkLinked(linked(aligned).chunk)).toBe(true);
  });

  it("opens the sheet of its own Greek words, as the New Testament's chunks do, and not the verse", () => {
    const { v, chunk } = linked(aligned);
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(v, looks, opened);
    fireEvent.click(screen.getByText(chunk.t.trim()));
    expect(opened).toEqual([]);
    expect(looks).toHaveLength(1);
    expect(looks[0].fromEnglish).toBe(true);
    expect(looks[0].words).toEqual(chunk.g.map((i) => v.g[i]));
    expect(looks[0].words.length).toBeLessThan(v.g.length);
  });
});

describe('the New Testament and the Old Testament (acceptance 3)', () => {
  it("keeps opening the chunk's words on a tap, with no guard given", () => {
    const v = verse(plain, 5);
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(v, looks, opened, false);
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    expect(opened).toEqual([]);
    expect(looks).toHaveLength(1);
    expect(looks[0].fromEnglish).toBe(true);
    expect(looks[0].words).toEqual(v.g);
  });
});

describe("an English-only word's sheet (mw-u2w5klk.349.67)", () => {
  const first = verse(aligned, 1);
  const the = first.e.findIndex((c) => c.t === 'the' && c.g.length === 0);
  const weaving: Partial<ReaderSettings> = {
    view: 'english', weave: 'solid', weaveShown: true, weaveGrammar: 'any', weaveOrder: 'english',
    // every word but ἀρχή: with Ἐν and ἀρχή both in Greek the 'the' between them is not drawn (mw-u2w5klk.349.69), and there would be nothing to tap
    solid: new Set(plain.verses.flatMap((v) => v.g.map((w) => w.l)).filter((l) => l !== 'ἀρχή')), learning: new Set(), levels: new Map(),
  };
  const woven = wovenOf(aligned, weaving)?.[aligned.verses.indexOf(first)] ?? null;
  const tapThe = (looks: Lookup[], opened: number[], weave: boolean) => {
    render(createElement(VerseText, { verse: first, view: 'english', woven: weave ? woven : null, onLook: (l: Lookup) => looks.push(l), onUnlinked: () => opened.push(1) }));
    // the first 'the' is Genesis 1:1's English-only one: 'In the beginning'
    fireEvent.click(screen.getAllByText('the')[0]);
  };

  it("is the fixture's: Genesis 1:1 'the' is a chunk the aligner left with no Greek word", () => {
    expect(the).toBe(1);
    expect(septuagintChunkLinked(first.e[the])).toBe(false);
  });

  for (const weave of [true, false]) {
    it(`${weave ? 'in the Weave' : 'in the English view'}: a tap on 'the' opens a sheet titled the word, saying it is added in English, with the next Greek word's button, and not the Verse view`, () => {
      const looks: Lookup[] = [];
      const opened: number[] = [];
      tapThe(looks, opened, weave);
      expect(opened).toEqual([]);
      expect(looks).toEqual([]);
      const sheet = screen.getByRole('dialog', { name: 'the' });
      expect(within(sheet).getByRole('heading', { name: 'the' })).toBeTruthy();
      expect(within(sheet).getByText(ADDED)).toBeTruthy();
      expect(within(sheet).queryByText(NOT_MATCHED)).toBeNull();
      expect(within(sheet).getByRole('button', { name: 'Next Greek word: ΑΡΧΗ' })).toBeTruthy();
    });
  }

  it("the button opens the next Greek word's sheet (ἀρχή is the word after 'the') and the sheet goes", () => {
    const looks: Lookup[] = [];
    const opened: number[] = [];
    tapThe(looks, opened, true);
    fireEvent.click(screen.getByRole('button', { name: 'Next Greek word: ΑΡΧΗ' }));
    expect(looks).toHaveLength(1);
    expect(looks[0].words).toEqual([first.g[1]]);
    expect(looks[0].fromEnglish).toBe(false);
    expect(opened).toEqual([]);
    expect(screen.queryByRole('dialog', { name: 'the' })).toBeNull();
  });

  it('Done closes the sheet and opens nothing', () => {
    const looks: Lookup[] = [];
    const opened: number[] = [];
    tapThe(looks, opened, false);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(looks).toEqual([]);
    expect(opened).toEqual([]);
  });

  it('a chunk not paired yet has no Greek word to offer: its sheet says so and has no Greek button', () => {
    const looks: Lookup[] = [];
    render(createElement(VerseText, { verse: verse(plain, 5), view: 'english', woven: null, onLook: (l: Lookup) => looks.push(l), onUnlinked: () => undefined }));
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText(NOT_MATCHED)).toBeTruthy();
    expect(within(sheet).queryByRole('button', { name: /Next Greek word/ })).toBeNull();
  });

  it("the New Testament's and the Old Testament's taps are as they were: no sheet of this kind without the guard", () => {
    const looks: Lookup[] = [];
    draw(verse(plain, 5), looks, [], false);
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(looks).toHaveLength(1);
  });
});
