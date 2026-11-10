// tests/unit/copy-septuagint-folded.test.ts — mw-u2w5klk.328: Copy of a row the English view folds (englishRows: Brenton holds Psalm 149:9 inside 149:8) names the WHOLE range:
// 'Psalms 149:8-9', its link Ps.149.8-9, not the first verse alone. The Greek is the real LXX2012 fixtures walked through TVTMS, one stand-in Greek word a verse.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { COPY_DEFAULTS, copyLink, copyReference, copyReferenceLine, copyText, copyUnitOf, sharePieces } from '../../src/copy/format';
import { englishRows } from '../../src/reader/septuagint';
import { buildMaps, parseTvtms, type TvtmsMaps } from '../../scripts/data/tvtms';
import { parseUsfm } from '../../scripts/data/lxx2012';
import { englishByGreekVerse } from '../../scripts/data/lxxChapter';

const fixture = (name: string): string => readFileSync(`tests/fixtures/lxx/${name}`, 'utf8');
const genesis = parseUsfm(fixture('lxx2012-gen-22-31-37.usfm'));
const genesisMaps: TvtmsMaps = buildMaps(parseTvtms(fixture('tvtms-genesis-slice.txt')));
const psalm149 = parseUsfm(fixture('lxx2012-psa-149.usfm'));
const psalmMaps: TvtmsMaps = buildMaps(parseTvtms(fixture('tvtms-psalms-slice.txt')));

/** The chapter as `lxx:ship` writes it (one English chunk a Greek verse that has English), then as the Reader's English view draws it (englishRows). */
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
  return { book: 'Book', code, chapter, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {}, verses } as Chapter;
}
const folded = (chapter: Chapter): Chapter => ({ ...chapter, verses: englishRows(chapter.verses) });

const psa149 = folded({ ...chapterOf(psalm149, psalmMaps, 'psa', 149, 9), book: 'Psalms' });
const gen22 = folded({ ...chapterOf(genesis, genesisMaps, 'gen', 22, 24), book: 'Genesis' });

describe('Copy of a folded Septuagint row names the whole range', () => {
  it.each([
    ['Psalms 149:8-9', psa149, 8, 9, 'Ps.149.8-9'],
    ['Genesis 22:15-16', gen22, 15, 16, 'Gen.22.15-16'],
  ] as const)('%s', (name, chapter, first, second, ref) => {
    const row = chapter.verses.find((v) => v.n === first)!;
    expect(row.to).toBe(second);
    // the hold on the number: the row's own n alone
    const held = copyUnitOf(chapter, { n: first });
    expect(copyReference(held)).toBe(name);
    expect(copyLink(held)).toContain(`ref=${ref}`);
    expect(copyReferenceLine(held)).toContain(`${name} (Septuagint:`);
    // the Verse view's Copy: the passage the row stands for (n to to)
    const view = copyUnitOf(chapter, { n: first, to: second });
    expect(copyReference(view)).toBe(name);
    expect(copyLink(view)).toContain(`ref=${ref}`);
    expect(copyText(view, COPY_DEFAULTS)).toContain(`— ${name} (Septuagint:`);
    expect(sharePieces(view, COPY_DEFAULTS).find((p) => p.id === 'reference')!.data.text).toContain(name);
  });

  it('names the Greek address of the whole range too, where it differs from Lampas\'s', () => {
    const row: Verse = { ...gen22.verses.find((v) => v.n === 15)!, ref: { book: 'psa', chapter: 23, verse: 5 }, to: 16, through: { n: 16, ref: { book: 'psa', chapter: 23, verse: 6 } } };
    const chapter = { ...gen22, verses: [row] };
    expect(copyUnitOf(chapter, { n: 15 }).septuagint?.greek).toBe('Greek 22:15-16');
  });

  it('a passage that runs through a folded row ends at the row\'s last verse', () => {
    const unit = copyUnitOf(psa149, { n: 6, to: 8 });
    expect(copyReference(unit)).toBe('Psalms 149:6-9');
    expect(copyLink(unit)).toContain('ref=Ps.149.6-9');
  });

  it('leaves a row nothing folded into as the verse it was', () => {
    const unit = copyUnitOf(psa149, { n: 7 });
    expect(unit.kind).toBe('verse');
    expect(copyReference(unit)).toBe('Psalms 149:7');
  });
});

describe('sweep: every folded row copies a reference naming its whole range', () => {
  // the shape of every row lxx:ship's 'Greek verses with no English' note names, over the fixtures' chapters and a run of three, a Greek chapter apart from Lampas's and a verse with no Lampas verse
  const run = (lengths: number[], shape: (n: number) => Partial<Verse> = () => ({})): Chapter => {
    let n = 0;
    const verses: Verse[] = lengths.flatMap((len) =>
      Array.from({ length: len }, (_, i) => {
        n += 1;
        return { n, ref: { book: 'isa', chapter: 38, verse: n }, g: [], e: i === 0 ? [{ t: `text ${n}`, g: [] }] : [], ...shape(n) } as Verse;
      }),
    );
    return { book: 'Isaiah', code: 'isa', chapter: 38, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {}, verses: folded({ verses } as Chapter).verses } as Chapter;
  };
  const chapters: Array<[string, Chapter]> = [
    ['Psalms 149', psa149],
    ['Genesis 22', gen22],
    ['Genesis 37', folded({ ...chapterOf(genesis, genesisMaps, 'gen', 37, 36), book: 'Genesis' })],
    ['a pair, a run of three and a lone verse', run([2, 3, 1, 2])],
    ['two Greek verses of one Lampas verse (a Psalm title)', run([2, 1], (n) => (n <= 2 ? { ref: { book: 'psa', chapter: 51, verse: 1 } } : {}))],
    ['rows with no Lampas verse', run([2, 2], (n) => (n % 2 === 0 ? { ref: 'none' as const } : {}))],
  ];
  it.each(chapters)('%s', (_name, chapter) => {
    const rows = chapter.verses.filter((v) => v.through);
    for (const row of rows) {
      const last = row.through!.n;
      const lampasLast = row.through!.ref && row.through!.ref !== 'none' ? row.through!.ref.verse : last;
      const lampasFirst = row.ref && row.ref !== 'none' ? row.ref.verse : row.n;
      for (const unit of [copyUnitOf(chapter, { n: row.n }), copyUnitOf(chapter, { n: row.n, to: row.to })]) {
        expect(unit.verses.length).toBe(1);
        // a Psalm's title is two Greek verses of one Lampas verse: that verse alone
        const want = lampasFirst === lampasLast ? `${lampasFirst}` : `${lampasFirst}-${lampasLast}`;
        expect(copyReference(unit), `${chapter.book} ${row.n}`).toMatch(new RegExp(`:${want}$`));
        expect(copyLink(unit)).toMatch(new RegExp(`\\.${want}$`));
      }
    }
  });
  it('finds folded rows in the fixtures', () => {
    expect(chapters.slice(0, 3).every(([, c]) => c.verses.some((v) => v.through))).toBe(true);
  });
});
