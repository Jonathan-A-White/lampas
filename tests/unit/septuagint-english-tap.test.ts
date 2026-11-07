// tests/unit/septuagint-english-tap.test.ts — a tap on a Septuagint English chunk with no word link (mw-u2w5klk.278; the Governor's report 2026-11-06, Genesis 1:5 "I'm clicking night and it's giving me something very weird").
// Brenton's English is one chunk a verse holding every Greek word of it, with no pairing (`data:build:lxx`), so a tap on 'Night' opened the word sheet of the verse's first word, καὶ. Until the aligner pairs the
// chunk (scripts/lxx/align.ts, mw-u2w5klk.274.1) a tap on a chunk with no link opens the verse (the Verse view), never a word; a chunk the aligner paired opens its own words, as the New Testament's does.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter, EnglishChunk, Verse } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import { ParagraphView } from '../../src/reader/ChapterText';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
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

  it("opens the verse when 'Night' is tapped, and the sheet of no word, καὶ least", () => {
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(verse(plain, 5), looks, opened);
    fireEvent.click(screen.getByText(/the darkness he called Night/));
    expect(looks).toEqual([]);
    expect(opened).toEqual([5]);
  });

  it("opens the verse in the Reader's paragraph layout: a tap on the English is a tap on the verse's number", () => {
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

  it('opens the verse, in a verse the aligner paired elsewhere', () => {
    const v = remainder(verse(aligned, 5));
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(v, looks, opened);
    fireEvent.click(screen.getByText('and there was evening'));
    expect(looks).toEqual([]);
    expect(opened).toEqual([5]);
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
