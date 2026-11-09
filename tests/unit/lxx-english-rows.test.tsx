// tests/unit/lxx-english-rows.test.tsx — mw-u2w5klk.307: where Brenton's English holds two Greek verses in the first (Gen 22:15-16, 37:32-33, Ps 149:8-9), the English view of a Septuagint chapter draws ONE row, its number the
// range ('32-33'), and no row with a number and nothing beside it. The Greek is the real LXX2012 fixtures walked through TVTMS (englishByGreekVerse), the Greek words stand-ins (one word a verse).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render } from '@testing-library/react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter, Verse } from '../../src/data/chapter';
import { englishRows, lampasUnit, septuagintNumber } from '../../src/reader/septuagint';
import { ParagraphView, ShownNumber, VerseLine } from '../../src/reader/ChapterText';
import { unitId, unitName } from '../../src/data/passage';
import { buildMaps, parseTvtms, type TvtmsMaps } from '../../scripts/data/tvtms';
import { parseUsfm } from '../../scripts/data/lxx2012';
import { englishByGreekVerse } from '../../scripts/data/lxxChapter';

afterAll(async () => {
  cleanup();
  db.close();
});

const fixture = (name: string): string => readFileSync(`tests/fixtures/lxx/${name}`, 'utf8');
const genesis = parseUsfm(fixture('lxx2012-gen-22-31-37.usfm'));
const genesisMaps: TvtmsMaps = buildMaps(parseTvtms(fixture('tvtms-genesis-slice.txt')));
const psalm149 = parseUsfm(fixture('lxx2012-psa-149.usfm'));
const psalmMaps: TvtmsMaps = buildMaps(parseTvtms(fixture('tvtms-psalms-slice.txt')));

/** The chapter as `lxx:ship` writes it (one English chunk a Greek verse that has English, a verse Brenton holds in the one before has none), one stand-in Greek word a verse. */
function chapterOf(book: ReturnType<typeof parseUsfm>, maps: TvtmsMaps, code: string, chapter: number, count: number): Chapter {
  const { byGreek } = englishByGreekVerse(book, maps);
  const verses: Verse[] = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const text = (byGreek.get(`${code} ${chapter}:${n}`) ?? []).map((s) => s.text).join(' ');
    return {
      n,
      ref: { book: code, chapter, verse: n },
      g: [{ t: `λόγος${n}`, tr: 'logos', s: '', l: 'λόγος', p: 'N-NSM' }],
      e: text ? [{ t: text, g: [0] }] : [],
    };
  });
  return { book: code, code, chapter, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {}, verses } as Chapter;
}

const gen22 = chapterOf(genesis, genesisMaps, 'gen', 22, 24);
const gen37 = chapterOf(genesis, genesisMaps, 'gen', 37, 36);
const psa149 = chapterOf(psalm149, psalmMaps, 'psa', 149, 9);

describe('the English view of a Septuagint chapter draws a pair Brenton joins as one row', () => {
  it.each([
    ['Genesis 22:15-16', gen22, 15, 16, '15-16'],
    ['Genesis 37:32-33', gen37, 32, 33, '32-33'],
    ['Psalms 149:8-9', psa149, 8, 9, '8-9'],
  ] as const)('%s', (_name, chapter, first, second, label) => {
    expect(chapter.verses[second - 1].e).toEqual([]);
    const rows = englishRows(chapter.verses);
    expect(rows.find((v) => v.n === second)).toBeUndefined();
    const row = rows.find((v) => v.n === first)!;
    expect(row.to).toBe(second);
    expect(row.e.length).toBe(1);
    expect(row.g.map((w) => w.t)).toEqual([`λόγος${first}`, `λόγος${second}`]);
    expect(septuagintNumber(row, chapter.chapter).shown).toBe(label);
    expect(unitName(row)).toBe(`verses ${first}-${second}`);
    expect(unitId(row)).toBe(`${first}-${second}`);
    expect(lampasUnit(chapter, row)).toEqual({ n: first, to: second });
  });

  it('leaves no row with Greek words and no English where the pair is folded (Genesis 37 but its verse 1, which is Brenton\'s 36:44)', () => {
    const rows = englishRows(gen37.verses);
    expect(rows.filter((v) => v.e.length === 0).map((v) => v.n)).toEqual([1]);
    expect(rows.length).toBe(gen37.verses.length - 1);
  });

  it('keeps every verse as it is when nothing folds, and the array itself', () => {
    const plain = gen37.verses.filter((v) => v.e.length > 0);
    expect(englishRows(plain)).toBe(plain);
  });

  it('keeps the rows apart in the number of a Greek chapter that differs from Lampas\'s (Greek 22:15-16 beside the range)', () => {
    const row: Verse = { ...gen22.verses[14], ref: { book: 'psa', chapter: 23, verse: 5 }, to: 16, through: { n: 16, ref: { book: 'psa', chapter: 23, verse: 6 } } };
    expect(septuagintNumber(row, 22)).toEqual({ shown: '5-6', greek: '22:15-16' });
  });

  it('does not fold a verse with a heading into the one before', () => {
    const verses = gen37.verses.map((v) => (v.n === 33 ? { ...v, h: 'A heading' } : v));
    expect(englishRows(verses).find((v) => v.n === 33)).toBeDefined();
  });

  it('draws Genesis 37 in the English view with no verse row without text, verse by verse and in paragraphs', () => {
    const rows = englishRows(gen37.verses).filter((v) => v.n !== 1);
    const noop = () => undefined;
    const line = (v: Verse) =>
      createElement(VerseLine, { key: v.n, verse: v, view: 'english', source: 'grc', septuagint: 37, woven: null, selected: false, reading: false, onSelect: noop, onPlay: noop, onLook: noop });
    const { container, unmount } = render(createElement('div', null, rows.map(line)));
    const drawn = Array.from(container.querySelectorAll('[data-verse]'));
    expect(drawn.length).toBe(rows.length);
    for (const el of drawn) {
      const number = el.querySelector('[data-verse-number]');
      const words = (el.textContent ?? '').replace(number?.textContent ?? '', '').trim();
      expect(words, `verse ${el.getAttribute('data-verse')} has text`).not.toBe('');
    }
    const range = container.querySelector('[data-verse="32"] [data-verse-number]');
    expect(range?.textContent).toBe('32-33');
    expect(container.querySelector('[data-verse="33"]')).toBeNull();
    unmount();
    const paragraph = render(
      createElement(ParagraphView, { verses: rows, view: 'english', source: 'grc', septuagint: 37, woven: rows.map(() => null), selected: null, reading: null, onSelect: noop, onPlay: noop, onLook: noop }),
    );
    expect(paragraph.container.querySelector('[data-verse="33"]')).toBeNull();
    expect(paragraph.container.querySelector('[data-verse="32"] [data-verse-number]')?.textContent).toBe('32-33');
    paragraph.unmount();
  });

  it('reads as the range in a number drawn by ShownNumber', () => {
    const row = englishRows(gen37.verses).find((v) => v.n === 32)!;
    const { container, unmount } = render(createElement(ShownNumber, { verse: row, septuagint: 37 }));
    expect(container.textContent).toBe('32-33');
    unmount();
  });
});

describe('every Septuagint chapter on disk in the English view', () => {
  const dirs = ['public/data-lxx', 'tests/fixtures/data-lxx'];
  const files = dirs.flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(`${dir}/${d.name}`).filter((f) => /^\d+\.json$/.test(f)).map((f) => `${dir}/${d.name}/${f}`))
      : [],
  );

  it.each(files.length ? files : ['none'])('%s has no row with a number and no English, once the pairs are folded', (file) => {
    if (file === 'none') return;
    const chapter = JSON.parse(readFileSync(file, 'utf8')) as Chapter;
    expect(englishRows(chapter.verses).filter((v) => v.e.length === 0 && !v.h).map((v) => v.n)).toEqual(chapter.verses[0]?.e.length === 0 ? [chapter.verses[0].n] : []);
  });
});
