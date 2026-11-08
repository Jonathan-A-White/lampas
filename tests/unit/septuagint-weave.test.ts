// tests/unit/septuagint-weave.test.ts — the Weave on a Septuagint chapter (mw-u2w5klk.274.3; the Governor's word 2026-11-05: "Do A - I'd like to see true weave mode asap"). A chapter whose verses carry
// aligned chunks (the aligner's `y: 'align'`, mw-u2w5klk.274.1) is woven in the Weave position as the New Testament is; the banner that the Weave is off stands only for a chapter with none. The Greek
// dial, the weave order and the woven reading check work on a Septuagint verse. The chapter is the Genesis 1 fixture (tests/fixtures/data-lxx), plain (one chunk a verse, as `data:build:lxx` writes it)
// and aligned (the same chapter through alignChapter, as `lxx:ship` writes it).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { sourceLanguage, type Chapter, type Verse } from '../../src/data/chapter';
import { chunkOrder } from '../../src/data/weave';
import { septuagintAligned, septuagintSettings, septuagintVerseView, septuagintView, septuagintWeaveNoted } from '../../src/reader/septuagint';
import { VerseText } from '../../src/reader/VerseText';
import { runsOf } from '../../src/speech/readAloud';
import { wovenOf } from '../../src/reader/useWoven';
import type { ReaderSettings } from '../../src/reader/useReaderSettings';
import { ReadCheckPanel } from '../../src/ReadCheck';
import { readingSourceOf } from '../../src/useReadChecks';
import { buildReadingRequest, readingText, readingViewOf, wovenReading } from '../../src/services/reading';
import { DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
import { alignChapter } from '../../scripts/lxx/align';
import type { GrammarLevel } from '../../src/data/db';
import { ALWAYS_NEEDED, ideasOf } from '../../src/data/grammar/ladder';

afterAll(async () => {
  cleanup();
  db.close();
});

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const plain = read<Chapter>('tests/fixtures/data-lxx/gen/1.json');
const lexicon = read<Record<string, { g?: string }>>('tests/fixtures/data-lxx/lexicon-grc-lxx.json');
const aligned = alignChapter(plain, (lemma) => lexicon[lemma]?.g ?? '').chapter;
const verse = (chapter: Chapter, n: number): Verse => chapter.verses.find((v) => v.n === n) as Verse;
const index = (chapter: Chapter, n: number): number => chapter.verses.indexOf(verse(chapter, n));

/** every lemma of the chapter, so every chunk with Greek words is woven */
const ALL = new Set(plain.verses.flatMap((v) => v.g.map((w) => w.l)));
const weaving = (over: Partial<ReaderSettings> = {}): Partial<ReaderSettings> => ({
  view: 'english', weave: 'solid', weaveShown: true, weaveGrammar: 'any', weaveOrder: 'english', solid: ALL, learning: new Set(), levels: new Map(), ...over,
});
const wovenChunks = (chapter: Chapter, n: number, over: Partial<ReaderSettings> = {}) => wovenOf(chapter, septuagintSettings(weaving(over), septuagintAligned(chapter)))?.[index(chapter, n)] ?? null;

describe('the fixture', () => {
  it('has no aligned chunk plain and aligned chunks after alignChapter', () => {
    expect(plain.verses.some((v) => v.e.some((c) => c.y === 'align'))).toBe(false);
    expect(aligned.verses.some((v) => v.e.some((c) => c.y === 'align'))).toBe(true);
  });

  it('is a Greek chapter (so the Greek dial reads it)', () => {
    expect(sourceLanguage(aligned)).toBe('grc');
  });
});

describe('which Septuagint chapter is woven', () => {
  it('is the one whose verses carry aligned chunks', () => {
    expect(septuagintAligned(aligned)).toBe(true);
    expect(septuagintAligned(plain)).toBe(false);
  });

  it('is not one whose only chunks are remainders no word is paired in', () => {
    const remainders: Chapter = { ...plain, verses: plain.verses.map((v) => ({ ...v, e: v.e.map((c) => ({ ...c, g: [], y: 'align?' as const })) })) };
    expect(septuagintAligned(remainders)).toBe(false);
  });

  it('weaves an aligned chapter in the Weave position: weaveShown follows the settings, as for the New Testament', () => {
    const settings = weaving();
    expect(septuagintSettings(settings, true).weaveShown).toBe(true);
    const woven = wovenChunks(aligned, 1);
    expect(woven).not.toBeNull();
    // some chunk of Genesis 1:1 is shown as its Greek word
    expect(woven?.some((w) => w !== null && w.words.length > 0)).toBe(true);
    expect(woven?.find((w) => w?.words.some((x) => x.t === 'ἐποίησεν'))).toBeTruthy();
  });

  it('follows weaveShown false too: plain English under the Weave weaves nothing', () => {
    expect(wovenOf(aligned, septuagintSettings(weaving({ weaveShown: false }), true))).toBeNull();
  });

  it('weaves a chapter with no aligned chunk not at all: its Weave position stays the Greek alone', () => {
    expect(septuagintSettings(weaving(), false).weaveShown).toBe(false);
    expect(wovenOf(plain, septuagintSettings(weaving(), false))).toBeNull();
  });
});

describe('the view and the banner by chapter kind', () => {
  it('an aligned chapter in the Weave position is drawn as the English view, the weave over it, and no banner', () => {
    expect(septuagintView('english', true, true)).toBe('english');
    expect(septuagintWeaveNoted('english', true, true)).toBe(false);
  });

  it('a chapter with no aligned chunk keeps the Greek alone and the banner in the Weave position', () => {
    expect(septuagintView('english', true, false)).toBe('greek');
    expect(septuagintWeaveNoted('english', true, false)).toBe(true);
    // the older two-argument form is a chapter with none
    expect(septuagintView('english', true)).toBe('greek');
    expect(septuagintWeaveNoted('english', true)).toBe(true);
  });

  it('the Greek and English positions are as they were for both kinds', () => {
    for (const kind of [true, false]) {
      expect(septuagintView('greek', true, kind)).toBe('greek');
      expect(septuagintView('greek', false, kind)).toBe('greek');
      expect(septuagintView('english', false, kind)).toBe('english');
      expect(septuagintWeaveNoted('english', false, kind)).toBe(false);
      expect(septuagintWeaveNoted('greek', true, kind)).toBe(false);
    }
  });
});

describe('the Greek dial on a Septuagint verse', () => {
  // verse 1's words: every one is solid; the dial 'solid' then asks each word's parsing ideas to be solid in the levels, which are empty: no form passes, so nothing is woven
  it('narrows the weave: the dial at Any weaves, at solid with no grammar solid weaves nothing', () => {
    expect(wovenChunks(aligned, 1, { weaveGrammar: 'any' })?.some((w) => w !== null)).toBe(true);
    expect(wovenChunks(aligned, 1, { weaveGrammar: 'solid' })?.every((w) => w === null)).toBe(true);
  });

  it('lets through the forms whose ideas are solid, and only those', () => {
    // every idea of the parsing of ἐποίησεν (V-AAI-3S) solid: its chunk is woven, the chunks of other forms are not
    const levels = new Map<string, GrammarLevel>([...ideasOf('V-AAI-3S'), ...ALWAYS_NEEDED].map((id) => [id, { id, level: 'solid', since: 0, how: 'placement' } as GrammarLevel]));
    const woven = wovenChunks(aligned, 1, { weaveGrammar: 'solid', levels }) ?? [];
    expect(woven.find((w) => w?.words.some((x) => x.t === 'ἐποίησεν'))).toBeTruthy();
    expect(woven.some((w) => w === null)).toBe(true);
    expect(woven.filter((w) => w !== null).length).toBeLessThan((wovenChunks(aligned, 1, { weaveGrammar: 'any' }) ?? []).filter((w) => w !== null).length);
  });
});

describe('the weave order on a Septuagint verse', () => {
  it('Greek order lays the chunks out where their Greek words stand; English order keeps Brenton’s', () => {
    // Genesis 1:5, 'And God called the light Day': Brenton's English order is not always Swete's Greek order
    const moved = aligned.verses.find((v) => chunkOrder(v, 'greek').some((at, i) => at !== i));
    expect(moved).toBeDefined();
    const n = (moved as Verse).n;
    expect(wovenChunks(aligned, n, { weaveOrder: 'english' })?.order).toBeUndefined();
    expect(wovenChunks(aligned, n, { weaveOrder: 'greek' })?.order).toEqual(chunkOrder(moved as Verse, 'greek'));
  });
});

describe('the woven reading check on a Septuagint verse', () => {
  const n = 1;
  const woven = wovenChunks(aligned, n);
  const reading = wovenReading([verse(aligned, n)], [woven], 'el');

  it('reads the Greek words in Greek and the English in English', () => {
    expect(reading).not.toBeNull();
    const langs = new Set(reading?.segments.map((s) => s.lang));
    expect(langs.has('el')).toBe(true);
    for (const piece of reading?.segments ?? []) {
      if (piece.lang === 'el') expect(piece.text).toMatch(/^[^A-Za-z]+$/u);
      else expect(piece.text).not.toMatch(/\p{Script=Greek}/u);
    }
  });

  it('is sent as segments with the Greek words of the weave', () => {
    const request = buildReadingRequest('Genesis 1:1', verse(aligned, n), 'english', 'en', undefined, undefined, undefined, DEFAULT_PRONUNCIATION, undefined, aligned, reading);
    expect(request.segments?.length).toBeGreaterThan(1);
    expect(request.target_text).toBe(readingText(verse(aligned, n), 'english', reading));
    expect(request.greek_words?.length).toBeGreaterThan(0);
  });

  it('takes the Greek view of a Septuagint chapter for Greek, not Hebrew, though Genesis is a Hebrew book', () => {
    expect(readingSourceOf('gen', aligned)).toBe('grc');
    expect(readingViewOf('greek', readingSourceOf('gen', aligned))).toBe('greek');
    // the Hebrew chapter, and a chapter not yet here, are read by the book as before
    expect(readingSourceOf('gen', { ...aligned, lang: 'hbo' })).toBe('hbo');
    expect(readingSourceOf('gen', null)).toBe('hbo');
    expect(readingSourceOf('jhn', null)).toBe('grc');
  });

  it('shows "Read Genesis 1:1 aloud in Greek" for the Greek view of a Septuagint verse, and "in Hebrew" for a Hebrew one', async () => {
    await db.open();
    const props = { verse: verse(aligned, n), view: 'greek' as const, book: 'gen', chapter: 1, checks: { states: {} }, hold: { onPress: () => undefined, onRelease: () => undefined, onDrop: () => undefined, disabled: false }, onRetry: () => undefined, slot: null };
    const { unmount } = render(createElement(ReadCheckPanel, { ...props, source: 'grc' }));
    expect(await screen.findByText(/aloud in Greek/)).toBeTruthy();
    unmount();
    render(createElement(ReadCheckPanel, props));
    expect(await screen.findByText(/aloud in Hebrew/)).toBeTruthy();
  });
});

const text = (container: HTMLElement): string => (container.textContent ?? '').replace(/\s+/g, ' ').trim();

// mw-u2w5klk.274.7: a Septuagint verse with Greek words and no Brenton English (Isaiah 40:7, e: []) drew a bare verse number in the Weave position, an empty Verse view and nothing to read aloud
describe('a verse with Greek words and no English chunk', () => {
  const holed = (chapter: Chapter, n: number): Chapter => ({ ...chapter, verses: chapter.verses.map((v) => (v.n === n ? { ...v, e: [] } : v)) });
  const bare = holed(aligned, 2);
  const greekOf = (v: Verse): string => v.g.map((w) => w.t).join(' ');

  it('is in an aligned chapter, which is woven (so the Weave position draws its verses in English)', () => {
    expect(septuagintAligned(bare)).toBe(true);
    expect(verse(bare, 2).e).toEqual([]);
    expect(verse(bare, 2).g.length).toBeGreaterThan(0);
  });

  it('draws its Greek words in the Weave position, not an empty row', () => {
    const v = verse(bare, 2);
    const woven = wovenChunks(bare, 2);
    const { container, unmount } = render(createElement(VerseText, { verse: v, view: septuagintView('english', true, true), source: 'grc', woven, onLook: () => undefined, onUnlinked: () => undefined }));
    expect(text(container)).toContain(v.g[0].t);
    expect(text(container)).toContain(v.g[v.g.length - 1].t);
    unmount();
  });

  it('is read aloud: the plan has the verse to read', () => {
    const v = verse(bare, 2);
    const runs = runsOf(v, 'english', wovenChunks(bare, 2), 'grc');
    expect(runs.map((r) => r.text).join(' ')).toBe(greekOf(v).replace(/\s+/g, ' ').trim());
    expect(runs.every((r) => r.language === 'greek')).toBe(true);
  });

  it('leaves a verse with English, and the Greek view, as they were', () => {
    expect(septuagintVerseView('english', verse(aligned, 1))).toBe('english');
    expect(septuagintVerseView('greek', verse(bare, 2))).toBe('greek');
    expect(septuagintVerseView('english', verse(bare, 2))).toBe('greek');
    expect(septuagintVerseView('english', { ...verse(bare, 2), g: [] })).toBe('english');
  });
});

describe('every shipped Septuagint chapter in the Weave position', () => {
  const dirs = ['public/data-lxx', 'tests/fixtures/data-lxx'];
  const files = dirs.flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .flatMap((d) => readdirSync(`${dir}/${d.name}`).filter((f) => /^\d+\.json$/.test(f)).map((f) => `${dir}/${d.name}/${f}`))
      : [],
  );

  it('has a chapter to look at (the fixtures at least)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('draws text for every verse that has Greek words, whether or not it has English', () => {
    const empty: string[] = [];
    for (const file of files) {
      const chapter = read<Chapter>(file);
      const aligned = septuagintAligned(chapter);
      for (const v of chapter.verses) {
        if (v.g.length === 0) continue;
        const view = septuagintVerseView(septuagintView('english', true, aligned), v);
        const woven = wovenOf(chapter, septuagintSettings(weaving({ solid: new Set(chapter.verses.flatMap((x) => x.g.map((w) => w.l))) }), aligned))?.[chapter.verses.indexOf(v)] ?? null;
        const { container, unmount } = render(createElement(VerseText, { verse: v, view, source: 'grc', woven, onLook: () => undefined, onUnlinked: () => undefined }));
        if (text(container) === '') empty.push(`${file} ${v.n}`);
        unmount();
        if (runsOf(v, view, woven, 'grc').length === 0) empty.push(`${file} ${v.n} (aloud)`);
      }
    }
    expect(empty).toEqual([]);
  });
});
