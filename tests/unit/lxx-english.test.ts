// tests/unit/lxx-english.test.ts — Lampas Septuagint R1 (mw-u2w5klk.9): Brenton's English per verse (LXX2012, scripts/data/lxx2012.ts) and the
// Greek-to-Lampas verse map (STEPBible TVTMS, scripts/data/tvtms.ts), read by scripts/lxx/english.ts. Fixtures under tests/fixtures/lxx/ are
// slices of the real sources; no test touches the network.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { carriedAsGreek, parseUsfm } from '../../scripts/data/lxx2012';
import { buildMaps, parseTvtms, type TvtmsMaps } from '../../scripts/data/tvtms';
import { bookReport, formatLine } from '../../scripts/lxx/english';
import { sweteVerses, verseSetGaps, formatGap } from '../../scripts/lxx/versesets';
import { aloneNote, englishByGreekVerse, noEnglishSplit, unplacedVerses, versesWithoutEnglish, withoutEnglishNote } from '../../scripts/data/lxxChapter';

const fixture = (name: string): string => readFileSync(`tests/fixtures/lxx/${name}`, 'utf8');
const gen = parseUsfm(fixture('lxx2012-gen-1.usfm'));
const psa = parseUsfm(fixture('lxx2012-psa-22.usfm'));
const est = parseUsfm(fixture('lxx2012-est-1.usfm'));
const dan = parseUsfm(fixture('lxx2012-dan-3.usfm'));
const rows = parseTvtms(fixture('tvtms-slice.txt'));
const maps: TvtmsMaps = buildMaps(rows);

const verseOf = (book: ReturnType<typeof parseUsfm>, chapter: number, verse: number) =>
  book.chapters.find((c) => c.chapter === chapter)?.verses.find((v) => v.verse === verse);

describe('LXX2012 (eBible USFM) per verse', () => {
  it('reads Gen 1:1 as Brenton has it, and drops a footnote', () => {
    expect(gen.code).toBe('gen');
    expect(verseOf(gen, 1, 1)?.text).toBe('In the beginning God made the heaven and the earth.');
    const four = verseOf(gen, 1, 4);
    expect(four?.text).toBe('And God saw the light that it was good, and God divided between the light and the darkness.');
    expect(four?.text).not.toMatch(/Hebraism|Gr\.|\\f/);
  });

  it('gives the positions of the supplied words (\\add), counted among the verse text split on white space', () => {
    expect(verseOf(psa, 22, 5)?.text).toContain('the best wine.');
    const five = verseOf(psa, 22, 5)!;
    const words = five.text.split(/\s+/);
    expect(five.supplied.map((i) => words[i])).toEqual(['wine.']);
    const one = verseOf(dan, 3, 1)!;
    expect(one.supplied.map((i) => one.text.split(/\s+/)[i])).toEqual(['his']);
    expect(verseOf(gen, 1, 1)?.supplied).toEqual([]);
  });

  it("reports a Psalm's title as the source has it, out of verse 1", () => {
    const chapter = psa.chapters.find((c) => c.chapter === 22)!;
    expect(chapter.title).toBe('(23) A Psalm of David.');
    expect(verseOf(psa, 22, 1)?.text).toBe('The Lord tends me as a shepherd, and I shall lack nothing.');
    expect(psa.chapters.map((c) => c.chapter)).toEqual([22, 23]);
  });

  it("keeps Esther's bracketed Addition inside its verse", () => {
    const one = verseOf(est, 1, 1)!;
    expect(one.bracketed).toBe(true);
    expect(one.text.startsWith('[In the second year of the reign of Artaxerxes')).toBe(true);
    expect(one.text).toContain('because of the two chamberlains of the king.] And it came to pass after these things');
    expect(verseOf(est, 1, 2)?.bracketed).toBe(false);
  });

  it("says Daniel 3:24-33 of the USFM are the Greek's 3:91-100 (the Song of the Three stands in S3Y)", () => {
    expect(carriedAsGreek('dan', 3, 24)).toEqual({ chapter: 3, verse: 91 });
    expect(carriedAsGreek('dan', 3, 33)).toEqual({ chapter: 3, verse: 100 });
    expect(carriedAsGreek('dan', 3, 23)).toEqual({ chapter: 3, verse: 23 });
    expect(carriedAsGreek('dan', 4, 1)).toEqual({ chapter: 4, verse: 1 });
    expect(carriedAsGreek('gen', 3, 24)).toEqual({ chapter: 3, verse: 24 });
  });
});

describe('TVTMS: the Greek-to-Lampas verse map', () => {
  it('maps Greek Psa 22:1-6 to Lampas psa 23:1-6', () => {
    for (let v = 1; v <= 6; v++) expect(maps.toLampas('psa 22:' + v)).toEqual({ state: 'one', refs: ['psa 23:' + v] });
    expect(maps.toGreek('psa 23:3')).toEqual({ state: 'one', refs: ['psa 22:3'] });
  });

  it('maps Greek Psa 9:22-39 to Lampas psa 10:1-18, and back', () => {
    expect(maps.toLampas('psa 9:22')).toEqual({ state: 'one', refs: ['psa 10:1'] });
    expect(maps.toLampas('psa 9:39')).toEqual({ state: 'one', refs: ['psa 10:18'] });
    expect(maps.toGreek('psa 10:18')).toEqual({ state: 'one', refs: ['psa 9:39'] });
  });

  it("joins a Psalm's title to its verse 1 in Lampas (title merged)", () => {
    expect(maps.toLampas('psa 21:1')).toEqual({ state: 'part', refs: ['psa 22:1'] });
    expect(maps.toLampas('psa 21:2')).toEqual({ state: 'one', refs: ['psa 22:1'] });
    expect(maps.toGreek('psa 22:1')).toEqual({ state: 'range', refs: ['psa 21:1', 'psa 21:2'] });
  });

  it("maps Jeremiah's moved oracles", () => {
    expect(maps.toLampas('jer 26:1')).toEqual({ state: 'one', refs: ['jer 46:1'] });
    expect(maps.toLampas('jer 26:28')).toEqual({ state: 'one', refs: ['jer 46:28'] });
    expect(maps.toGreek('jer 25:15')).toEqual({ state: 'one', refs: ['jer 32:1'] });
    expect(maps.toGreek('jer 25:38')).toEqual({ state: 'one', refs: ['jer 32:24'] });
    expect(maps.toLampas('jer 32:1')).toEqual({ state: 'one', refs: ['jer 25:15'] });
    expect(maps.toGreek('jer 25:14')).toEqual({ state: 'none', refs: [] });
  });

  it('maps Daniel 3 and leaves the Song of the Three without a Lampas verse', () => {
    expect(maps.toLampas('dan 3:91')).toEqual({ state: 'one', refs: ['dan 3:24'] });
    expect(maps.toLampas('dan 3:97')).toEqual({ state: 'one', refs: ['dan 3:30'] });
    expect(maps.toGreek('dan 3:24')).toEqual({ state: 'one', refs: ['dan 3:91'] });
    for (let v = 24; v <= 51; v++) expect(maps.toLampas('dan 3:' + v)).toEqual({ state: 'none', refs: [] });
    // TVTMS gives English 4:1-3 no Greek verse; Swete's Greek has them at 3:98-100 and LXX2012 at its 3:31-33, so the map adds them
    expect(maps.toGreek('dan 4:1')).toEqual({ state: 'one', refs: ['dan 3:98'] });
    expect(maps.toLampas('dan 3:100')).toEqual({ state: 'one', refs: ['dan 4:3'] });
  });

  it("maps Malachi 4's last three verses in the Greek order", () => {
    expect(maps.toLampas('mal 4:5')).toEqual({ state: 'one', refs: ['mal 4:4'] });
    expect(maps.toLampas('mal 4:6')).toEqual({ state: 'one', refs: ['mal 4:5'] });
    expect(maps.toLampas('mal 4:4')).toEqual({ state: 'one', refs: ['mal 4:6'] });
    expect(maps.toLampas('mal 4:2')).toEqual({ state: 'same', refs: ['mal 4:2'] });
  });

  it('maps Exodus 40:9 to Greek 40:7, a verse to a range and a verse with nothing behind it', () => {
    expect(maps.toGreek('exo 40:9')).toEqual({ state: 'one', refs: ['exo 40:7'] });
    expect(maps.toLampas('exo 40:7')).toEqual({ state: 'one', refs: ['exo 40:9'] });
    expect(maps.toGreek('exo 40:10')).toEqual({ state: 'range', refs: ['exo 40:8', 'exo 40:9'] });
    expect(maps.toLampas('exo 40:8')).toEqual({ state: 'part', refs: ['exo 40:10'] });
    expect(maps.toGreek('exo 40:11')).toEqual({ state: 'none', refs: [] });
  });

  it("treats Esther's Additions as having no Lampas verse and keeps verse 1 whole", () => {
    expect(maps.toLampas('est 1:1')).toEqual({ state: 'same', refs: ['est 1:1'] });
    expect(maps.toLampas('est 1:1.3')).toEqual({ state: 'none', refs: [] });
  });

  it("reads LXX2012's own numbering of a Psalm: its title out of verse 1, Brenton's column where the table has one", () => {
    // Ps 21 (English 22): Brenton's verse 1 is the Greek's 2, its title the Greek's verse 1
    expect(maps.lxx2012ToGreek('psa 21:T')).toEqual({ state: 'one', refs: ['psa 21:1'] });
    expect(maps.lxx2012ToGreek('psa 21:1')).toEqual({ state: 'one', refs: ['psa 21:2'] });
    // Ps 22 (English 23): the Greek has no title verse, so Brenton's title is a part of verse 1
    expect(maps.lxx2012ToGreek('psa 22:T')).toEqual({ state: 'part', refs: ['psa 22:1'] });
    expect(maps.lxx2012ToGreek('psa 22:1')).toEqual({ state: 'same', refs: ['psa 22:1'] });
    expect(maps.lxx2012ToGreek('psa 9:21')).toEqual({ state: 'one', refs: ['psa 9:22'] });
    // a title the table does not place is one the Greek added: no Lampas verse
    expect(maps.toLampas('psa 92:T')).toEqual({ state: 'none', refs: [] });
    expect(maps.toLampas('psa 23:T')).toEqual({ state: 'none', refs: [] });
  });

  it('reads the rows it cannot fit as problems for the sweep, and does not let an uneven row spoil a good one', () => {
    expect(maps.toLampas('mal 4:1')).toEqual({ state: 'same', refs: ['mal 4:1'] });
    expect(maps.toLampas('mal 4:20')).toEqual({ state: 'same', refs: ['mal 4:20'] });
    expect(maps.problems.some((p) => p.includes('uneven row ignored') && p.includes('mal 4:1'))).toBe(true);
    expect(parseTvtms('#DataStart(Condensed)\n$Gen.1:1\tEnglish KJV\tGreek\nOneToOne\tGen.1:1\tGen.9:Q\n#DataEnd(Condensed)\n')).toHaveLength(1);
    const odd = buildMaps(parseTvtms('#DataStart(Condensed)\n$Gen.1:1\tEnglish KJV\tGreek\nOneToOne\tGen.1:1\tGen.9:Q\n#DataEnd(Condensed)\n'));
    expect(odd.problems[0]).toContain('unreadable cell');
  });

  it('maps a reference the table lacks one to one with the state same', () => {
    expect(maps.toLampas('gen 1:1')).toEqual({ state: 'same', refs: ['gen 1:1'] });
    expect(maps.toGreek('gen 1:1')).toEqual({ state: 'same', refs: ['gen 1:1'] });
    expect(maps.toLampas('gen 32:5')).toEqual({ state: 'same', refs: ['gen 32:5'] });
  });

  it('is total over the 39 books: every Lampas verse has a Greek counterpart or an explicit none', () => {
    const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as {
      books: Array<{ code: string; verses: number[]; lang?: string }>;
    };
    const ot = index.books.filter((b) => b.lang === 'hbo');
    expect(ot).toHaveLength(39);
    let checked = 0;
    for (const book of ot) {
      book.verses.forEach((count, i) => {
        for (let v = 1; v <= count; v++) {
          const got = maps.toGreek(`${book.code} ${i + 1}:${v}`);
          expect(['same', 'one', 'range', 'part', 'none']).toContain(got.state);
          if (got.state === 'none') expect(got.refs).toEqual([]);
          else expect(got.refs.length).toBeGreaterThan(0);
          checked++;
        }
      });
    }
    expect(checked).toBe(ot.reduce((n, b) => n + b.verses.reduce((a, c) => a + c, 0), 0));
  });
});

describe('npm run lxx:english: a book with each verse, its Lampas reference and the state', () => {
  it('prints Genesis 1 verse by verse, same', () => {
    const lines = bookReport(gen, maps).map(formatLine);
    expect(lines[0]).toBe('gen 1:1 -> gen 1:1 same');
    expect(lines).toHaveLength(5);
  });

  it("prints a Psalm's title as the Greek verse it is part of, and the verse with its Lampas verse", () => {
    const lines = bookReport(psa, maps).map(formatLine);
    expect(lines[0]).toBe('psa 22:T = psa 22:1 -> psa 23:1 part');
    expect(lines[1]).toBe('psa 22:1 -> psa 23:1 one');
  });

  it('prints Daniel 3:24 as the Greek 3:91 it is, and 3:1 as it is', () => {
    const lines = bookReport(dan, maps).map(formatLine);
    expect(lines[0]).toBe('dan 3:1 -> dan 3:1 same');
    expect(lines[1]).toBe('dan 3:24 = dan 3:91 -> dan 3:24 one');
  });

  it('names an Addition of Esther kept inside its verse and a reference the table does not know', () => {
    const lines = bookReport(est, maps).map(formatLine);
    expect(lines[0]).toBe('est 1:1 -> est 1:1 same [bracketed]');
  });
});

// mw-u2w5klk.283: LXX2012 numbers Psalms 113-115 in the Hebrew order (its 114 is the Hebrew 115, its 115 the Hebrew 116) and Ps 10 in neither the Greek's nor
// TVTMS's Brenton columns (it splits the Greek verse 1 in two and has 8 verses to the Greek's 7); TVTMS's sections for them have no column that says so.
describe("LXX2012's Psalms 10, 114 and 115 stand at the Greek verses their text is", () => {
  const psalmMaps = buildMaps(parseTvtms(fixture('tvtms-psalms-slice.txt')));
  const book = parseUsfm(fixture('lxx2012-psa-10-114-115.usfm'));
  const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  it("puts Brenton's Psalm 114 (the Hebrew 115, 18 verses) at the Greek 113:9-26", () => {
    for (const v of range(1, 18)) expect(psalmMaps.lxx2012ToGreek(`psa 114:${v}`)).toEqual({ state: 'one', refs: [`psa 113:${v + 8}`] });
  });

  it("puts Brenton's Psalm 115 (the Hebrew 116, 19 verses) at the Greek 114:1-9 and 115:1-10", () => {
    for (const v of range(1, 9)) expect(psalmMaps.lxx2012ToGreek(`psa 115:${v}`)).toEqual({ state: 'one', refs: [`psa 114:${v}`] });
    for (const v of range(10, 19)) expect(psalmMaps.lxx2012ToGreek(`psa 115:${v}`)).toEqual({ state: 'one', refs: [`psa 115:${v - 9}`] });
  });

  it("puts Brenton's Psalm 10 (8 verses; his verses 1 and 2 are the Greek's verse 1) at the Greek's 7, and 10:8 at the Greek 10:7", () => {
    expect(psalmMaps.lxx2012ToGreek('psa 10:T')).toEqual({ state: 'part', refs: ['psa 10:1'] });
    expect(psalmMaps.lxx2012ToGreek('psa 10:1')).toEqual({ state: 'part', refs: ['psa 10:1'] });
    expect(psalmMaps.lxx2012ToGreek('psa 10:2')).toEqual({ state: 'part', refs: ['psa 10:1'] });
    for (const v of range(3, 8)) expect(psalmMaps.lxx2012ToGreek(`psa 10:${v}`)).toEqual({ state: 'one', refs: [`psa 10:${v - 1}`] });
  });

  it('leaves every verse of the three Psalms at a Greek verse of Swete (Greek Ps 10 has 7 verses, 114 has 9, 115 has 10, 113 has 26)', () => {
    const last: Record<string, number> = { '10': 7, '113': 26, '114': 9, '115': 10 };
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const greek = psalmMaps.lxx2012ToGreek(`psa ${chapter.chapter}:${verse.verse}`).refs;
        expect(greek).toHaveLength(1);
        const m = /^psa (\d+):(\d+)$/.exec(greek[0])!;
        expect(Number(m[2])).toBeGreaterThanOrEqual(1);
        expect(Number(m[2])).toBeLessThanOrEqual(last[m[1]] ?? 0);
      }
    }
  });

  it("weaves Brenton's English at those Greek verses, nothing unplaced and nothing at a verse Swete lacks", () => {
    const { byGreek } = englishByGreekVerse(book, psalmMaps);
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');
    expect(text('psa 10:1')).toMatch(/^For the end, a Psalm of David\. \| In the Lord I have put my trust.* \| Flee to the mountains as a sparrow\?$/);
    expect(text('psa 10:1')).not.toContain('KJV');
    expect(text('psa 10:2')).toMatch(/^For behold the sinners have bent their bow/);
    expect(text('psa 10:7')).toMatch(/^For the Lord is righteous, and loves/);
    expect(text('psa 113:9')).toMatch(/^Not to us, O Lord, not to us/);
    expect(text('psa 113:26')).toMatch(/^But we, the living, will bless the Lord, from henceforth and for ever\.$/);
    expect(text('psa 114:1')).toMatch(/^I am well pleased, because the Lord will listen/);
    expect(text('psa 114:9')).toMatch(/^I shall be well-pleasing before the Lord in the land of the living\./);
    expect(text('psa 115:1')).toMatch(/^I believed, therefore I have spoken/);
    expect(text('psa 115:10')).toMatch(/^in the courts of the Lord's house/);
    const swete = new Set([...range(1, 7).map((v) => `psa 10:${v}`), ...range(9, 26).map((v) => `psa 113:${v}`), ...range(1, 9).map((v) => `psa 114:${v}`), ...range(1, 10).map((v) => `psa 115:${v}`)]);
    expect([...byGreek.keys()].filter((ref) => !swete.has(ref))).toEqual([]);
    expect([...swete].filter((ref) => !byGreek.has(ref))).toEqual([]);
  });

  it("leaves a Psalm whose Brenton numbering is the Greek's where it was", () => {
    expect(maps.lxx2012ToGreek('psa 22:1')).toEqual({ state: 'same', refs: ['psa 22:1'] });
    expect(psalmMaps.lxx2012ToGreek('psa 113:1')).toEqual({ state: 'same', refs: ['psa 113:1'] });
    expect(psalmMaps.lxx2012ToGreek('psa 116:2')).toEqual({ state: 'same', refs: ['psa 116:2'] });
  });
});

// mw-u2w5klk.286: the sweep of every chapter LXX2012 numbers as the Greek does (the map answers 'same') found Genesis 22 and 37 a verse out from where Brenton's text is,
// and Psalm 149's Greek verse 9 with Brenton's text in verse 8. Fixtures are the real LXX2012 chapters.
describe("LXX2012's Genesis 22, 31 and 37 and Psalm 149 stand at the Greek verses their text is", () => {
  const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const refs = (book: string, chapter: number, from: number, to: number, except: number[] = []): string[] =>
    range(from, to).filter((v) => !except.includes(v)).map((v) => `${book} ${chapter}:${v}`);
  const genesis = parseUsfm(fixture('lxx2012-gen-22-31-37.usfm'));
  const genesisMaps = buildMaps(parseTvtms(fixture('tvtms-genesis-slice.txt')));
  const psalm149 = parseUsfm(fixture('lxx2012-psa-149.usfm'));
  const psalmMaps = buildMaps(parseTvtms(fixture('tvtms-psalms-slice.txt')));
  // the fixture holds three chapters of Genesis, so what a test asks about one chapter is cut from the answer for all three
  const swete = [...refs('gen', 22, 1, 24), ...refs('gen', 31, 1, 55, [51]), ...refs('gen', 37, 1, 36)];
  const inChapter = (list: string[], chapter: number): string[] => list.filter((ref) => ref.startsWith(`gen ${chapter}:`));
  const textAt = (byGreek: ReturnType<typeof englishByGreekVerse>['byGreek'], ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');

  it("puts Brenton's Genesis 22:15 at the Greek 22:15-16 and his 22:16-23 at the Greek 22:17-24", () => {
    expect(genesisMaps.lxx2012ToGreek('gen 22:14')).toEqual({ state: 'same', refs: ['gen 22:14'] });
    expect(genesisMaps.lxx2012ToGreek('gen 22:15')).toEqual({ state: 'range', refs: ['gen 22:15', 'gen 22:16'] });
    for (const v of range(16, 23)) expect(genesisMaps.lxx2012ToGreek(`gen 22:${v}`)).toEqual({ state: 'one', refs: [`gen 22:${v + 1}`] });
    const { byGreek } = englishByGreekVerse(genesis, genesisMaps);
    expect(textAt(byGreek, 'gen 22:15')).toMatch(/^And an angel of the Lord called Abraam the second time out of heaven, saying, I have sworn by myself/);
    expect(textAt(byGreek, 'gen 22:17')).toMatch(/^surely blessing I will bless you/);
    expect(textAt(byGreek, 'gen 22:18')).toMatch(/^And in your seed shall all the nations of the earth be blessed/);
    expect(textAt(byGreek, 'gen 22:19')).toMatch(/^And Abraam returned to his servants/);
    expect(textAt(byGreek, 'gen 22:24')).toMatch(/^And his concubine whose name was Rheuma/);
  });

  it('names the one Greek verse of Genesis 22 whose text is in the English of the verse before it, and nothing unplaced', () => {
    const { byGreek, placedAt } = englishByGreekVerse(genesis, genesisMaps);
    expect(inChapter(versesWithoutEnglish(byGreek, swete), 22)).toEqual(['gen 22:16']);
    expect(inChapter(unplacedVerses(placedAt, swete), 22)).toEqual([]);
  });

  it("leaves Genesis 31 as it is: Brenton's verse 51 is the one with no Greek verse, and his 52-55 stand at the Greek 52-55", () => {
    for (const v of [47, 50, 52, 53, 54, 55]) expect(genesisMaps.lxx2012ToGreek(`gen 31:${v}`)).toEqual({ state: 'same', refs: [`gen 31:${v}`] });
    const { byGreek, placedAt } = englishByGreekVerse(genesis, genesisMaps);
    // Swete's file numbers a verse 51 and puts no word under it (mw-u2w5klk.282)
    expect(inChapter(unplacedVerses(placedAt, swete), 31)).toEqual(['gen 31:51']);
    expect(inChapter(versesWithoutEnglish(byGreek, swete), 31)).toEqual([]);
    expect(textAt(byGreek, 'gen 31:52')).toMatch(/^For if I should not cross over to you/);
    expect(textAt(byGreek, 'gen 31:55')).toMatch(/^And Laban rose up in the morning/);
  });

  it("puts Brenton's Genesis 37:1-2 at the Greek 37:2 (his 36:44 is the Greek 37:1), his 37:32 at the Greek 37:32-33 and his 37:33-35 at the Greek 37:34-36", () => {
    expect(genesisMaps.lxx2012ToGreek('gen 37:1')).toEqual({ state: 'one', refs: ['gen 37:2'] });
    expect(genesisMaps.lxx2012ToGreek('gen 37:31')).toEqual({ state: 'same', refs: ['gen 37:31'] });
    expect(genesisMaps.lxx2012ToGreek('gen 37:32')).toEqual({ state: 'range', refs: ['gen 37:32', 'gen 37:33'] });
    for (const v of range(33, 35)) expect(genesisMaps.lxx2012ToGreek(`gen 37:${v}`)).toEqual({ state: 'one', refs: [`gen 37:${v + 1}`] });
    const { byGreek, placedAt } = englishByGreekVerse(genesis, genesisMaps);
    expect(textAt(byGreek, 'gen 37:2')).toMatch(/^And these are the generations of Jacob/);
    expect(textAt(byGreek, 'gen 37:34')).toMatch(/^And Jacob tore his clothes/);
    expect(textAt(byGreek, 'gen 37:36')).toMatch(/^And the Madianites sold Joseph into Egypt/);
    // the Greek 37:1 is Brenton's 36:44 (not in this fixture), the Greek 37:33 is in the English of 37:32
    expect(inChapter(versesWithoutEnglish(byGreek, swete), 37)).toEqual(['gen 37:1', 'gen 37:33']);
    expect(inChapter(unplacedVerses(placedAt, swete), 37)).toEqual([]);
  });

  it("names Psalm 149's Greek verse 9, which Brenton's 149 (eight verses) has inside his verse 8, as a verse with no English", () => {
    expect(psalmMaps.lxx2012ToGreek('psa 149:7')).toEqual({ state: 'same', refs: ['psa 149:7'] });
    expect(psalmMaps.lxx2012ToGreek('psa 149:8')).toEqual({ state: 'range', refs: ['psa 149:8', 'psa 149:9'] });
    expect(psalmMaps.lxx2012ToGreek('psa 149:9').refs).toEqual(['psa 149:9']);
    const { byGreek, placedAt } = englishByGreekVerse(psalm149, psalmMaps);
    const swete149 = refs('psa', 149, 1, 9);
    expect(textAt(byGreek, 'psa 149:8')).toMatch(/^to bind their kings with fetters.*to execute on them the judgment written: this honor have all his saints\.$/);
    expect(versesWithoutEnglish(byGreek, swete149)).toEqual(['psa 149:9']);
    expect(unplacedVerses(placedAt, swete149)).toEqual([]);
    expect(withoutEnglishNote('psa', ['psa 149:9'])).toBe('psa: Greek verses with no English (each is drawn in the English view as one row with the verse before it, whose English holds its text if Brenton has it): psa 149:9');
  });

  it('tells the verses the English view folds into the verse before (a verse with English before them) from those with nothing to join (mw-u2w5klk.307)', () => {
    const chunk = [{ t: 'x', g: [0] }];
    const chapters = [
      { chapter: 37, verses: [{ n: 1, e: [] }, { n: 2, e: chunk }, { n: 3, e: [] }, { n: 4, e: [] }, { n: 5, e: chunk }] },
      { chapter: 38, verses: [{ n: 1, e: [] }] },
    ];
    expect(noEnglishSplit(chapters, 'gen')).toEqual({ joined: ['gen 37:3', 'gen 37:4'], alone: ['gen 37:1', 'gen 38:1'] });
    expect(aloneNote('gen', ['gen 37:1'])).toMatch(/^gen: Verses with nothing to join in the English view/);
    expect(aloneNote('gen', ['gen 37:1'])).not.toMatch(/Greek verses with no English/);
  });

  it('runs the verse-set sweep: after the rows, Genesis 22 and Psalm 149 reach every verse of the verses of Swete, Genesis 37 all but its 1 (the 36:44 of Brenton), and Genesis 31:51 is the numbered verse with no word', () => {
    // Swete's versification and word files in miniature: a line number, the verse, and one word under every numbered verse but Gen 31:51
    const verses = [...refs('gen', 22, 1, 24), ...refs('gen', 31, 1, 55), ...refs('gen', 37, 1, 36), ...refs('psa', 149, 1, 9)].map((r) => r.replace(/^(\w+) /, (_a, b: string) => `${b === 'gen' ? 'Gen' : 'Psa'}.`));
    const versification = verses.map((v, i) => `${i * 2 + 1}\t${v}`).join('\n');
    const words = verses.flatMap((v, i) => (v === 'Gen.31:51' ? [] : [`${i * 2 + 1}\tλόγος`])).join('\n');
    const swete = sweteVerses(versification, words);
    expect(swete.numbered.get('gen 31')?.has(51)).toBe(true);
    expect(swete.withWords.get('gen 31')?.has(51)).toBe(false);
    expect(verseSetGaps(genesis, genesisMaps, swete).map(formatGap)).toEqual([
      'gen 31: Brenton lands where Swete has no verse [], at a numbered verse with no word [51], Swete verses with no English []',
      // the Greek 37:1 is Brenton's 36:44, which the fixture does not hold
      'gen 37: Brenton lands where Swete has no verse [], at a numbered verse with no word [], Swete verses with no English [1]',
    ]);
    expect(verseSetGaps(psalm149, psalmMaps, swete)).toEqual([]);
  });

  it('names a Greek verse no Brenton verse reaches and a Brenton verse that reaches a number Swete lacks', () => {
    const book = { code: 'gen', chapters: [
      { chapter: 98, verses: [1, 2, 3].map((verse) => ({ chapter: 98, verse, text: 'x', supplied: [], bracketed: false })) },
      { chapter: 99, verses: [1, 2, 3].map((verse) => ({ chapter: 99, verse, text: 'x', supplied: [], bracketed: false })) },
    ] };
    const swete = sweteVerses('1\tGen.98:1\n3\tGen.98:2\n5\tGen.99:1\n7\tGen.99:2\n9\tGen.99:3\n11\tGen.99:4', '1\ta\n3\ta\n5\ta\n7\ta\n9\ta\n11\ta');
    expect(verseSetGaps(book, genesisMaps, swete).map(formatGap)).toEqual([
      'gen 98: Brenton lands where Swete has no verse [3], at a numbered verse with no word [], Swete verses with no English []',
      'gen 99: Brenton lands where Swete has no verse [], at a numbered verse with no word [], Swete verses with no English [4]',
    ]);
  });
});

// mw-u2w5klk.349.110: LXX2012 numbers Deuteronomy 5:17 and 5:18 as the English Bible does ('murder', then 'adultery'), Swete the other way round (μοιχεύσεις, then φονεύσεις; TVTMS's section
// Deu.5:17-5:18 has no Brenton column), so each verse's English stood under the other's Greek: 'murder' had no Greek word to open and φονεύσεις no English.
describe("LXX2012's Deuteronomy 5:17 and 5:18 stand at the Greek verses their text is", () => {
  const book = parseUsfm(fixture('lxx2012-deu-5.usfm'));
  const deuMaps = buildMaps(parseTvtms(fixture('tvtms-deu-5-slice.txt')));

  it("puts Brenton's 5:17 at the Greek 5:18 and his 5:18 at the Greek 5:17, and leaves the verses either side", () => {
    expect(deuMaps.lxx2012ToGreek('deu 5:16')).toEqual({ state: 'same', refs: ['deu 5:16'] });
    expect(deuMaps.lxx2012ToGreek('deu 5:17')).toEqual({ state: 'one', refs: ['deu 5:18'] });
    expect(deuMaps.lxx2012ToGreek('deu 5:18')).toEqual({ state: 'one', refs: ['deu 5:17'] });
    expect(deuMaps.lxx2012ToGreek('deu 5:19')).toEqual({ state: 'same', refs: ['deu 5:19'] });
  });

  it("weaves 'adultery' at the Greek 5:17 and 'murder' at the Greek 5:18, nothing unplaced and no verse of the four left without English", () => {
    const { byGreek, placedAt } = englishByGreekVerse(book, deuMaps);
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');
    expect(text('deu 5:17')).toBe('You shall not commit adultery.');
    expect(text('deu 5:18')).toBe('You shall not commit murder.');
    expect(text('deu 5:19')).toBe('You shall not steal.');
    const swete = [16, 17, 18, 19, 20].map((v) => `deu 5:${v}`);
    expect(versesWithoutEnglish(byGreek, swete)).toEqual([]);
    expect(unplacedVerses(placedAt, swete)).toEqual([]);
  });
});

// mw-u2w5klk.349.130: LXX2012's verse numbers differ from Swete's in a handful of places (one shared map, LXX2012_ROWS in scripts/data/tvtms.ts), so its English sat a verse off the Greek: each case reads the
// Brenton verse's own words at the Greek verse their text is (the fixtures are slices of the real LXX2012 and of the TVTMS sections of these chapters).
describe("LXX2012's Deuteronomy 14, Joshua 6, Exodus 25, 35 and 40, Leviticus 6 and 8 and Numbers 9, 21 and 27 stand at the Greek verses their text is", () => {
  const versification = buildMaps(parseTvtms(fixture('tvtms-versification-slice.txt')));
  const bookOf = (code: string) => parseUsfm(fixture(`lxx2012-v130-${code}.usfm`));
  const one = (ref: string): string[] => versification.lxx2012ToGreek(ref).refs;
  const textAt = (code: string, ref: string): string => (englishByGreekVerse(bookOf(code), versification).byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');
  const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  it('Deuteronomy 14: LXX2012 has no 14:14, so its 15 is the Greek 14 and its 29 the Greek 28', () => {
    expect(versification.lxx2012ToGreek('deu 14:13')).toEqual({ state: 'same', refs: ['deu 14:13'] });
    expect(versification.lxx2012ToGreek('deu 14:15')).toEqual({ state: 'one', refs: ['deu 14:14'] });
    for (const v of range(15, 29)) expect(one(`deu 14:${v}`)).toEqual([`deu 14:${v - 1}`]);
    const { byGreek, placedAt } = englishByGreekVerse(bookOf('deu'), versification);
    expect(byGreek.get('deu 14:14')?.[0].text).toMatch(/^and the sparrow, and the owl/);
    expect(byGreek.get('deu 14:28')?.[0].text).toMatch(/^And the Levite shall come/);
    expect(placedAt.get('deu 14:29')).toBe('deu 14:28');
    expect(unplacedVerses(placedAt, range(13, 28).map((v) => `deu 14:${v}`))).toEqual([]);
    expect(versesWithoutEnglish(byGreek, ['deu 14:13', 'deu 14:14', 'deu 14:15', 'deu 14:27', 'deu 14:28'])).toEqual([]);
  });

  it("Joshua 6: LXX2012's 6:7 and 6:8 are the Greek 6:8 and 6:7", () => {
    expect(one('jos 6:6')).toEqual(['jos 6:6']);
    expect(one('jos 6:7')).toEqual(['jos 6:8']);
    expect(one('jos 6:8')).toEqual(['jos 6:7']);
    expect(one('jos 6:9')).toEqual(['jos 6:9']);
    expect(textAt('jos', 'jos 6:7')).toMatch(/^Charge the people to go round/);
    expect(textAt('jos', 'jos 6:8')).toMatch(/^And let seven priests having seven sacred trumpets/);
  });

  it('Exodus 25: the sanctuary ("make me a sanctuary", Greek ποιήσεις μοι ἁγίασμα) is at the Greek 25:7, the oil and incense Swete lacks stand with 25:5, and 25:36 is the Greek 25:36', () => {
    expect(one('exo 25:5')).toEqual(['exo 25:5']);
    expect(one('exo 25:6')).toEqual(['exo 25:5']);
    expect(one('exo 25:7')).toEqual(['exo 25:6']);
    expect(one('exo 25:8')).toEqual(['exo 25:7']);
    expect(one('exo 25:34')).toEqual(['exo 25:33']);
    expect(versification.lxx2012ToGreek('exo 25:35')).toEqual({ state: 'range', refs: ['exo 25:34', 'exo 25:35'] });
    expect(one('exo 25:36')).toEqual(['exo 25:36']);
    expect(textAt('exo', 'exo 25:7')).toBe('And you shall make me a sanctuary, and I will appear among you.');
    expect(textAt('exo', 'exo 25:6')).toMatch(/^and sardius stones/);
    expect(textAt('exo', 'exo 25:5')).toMatch(/^and rams' skins dyed red.* \| and oil for the light, incense/);
    expect(textAt('exo', 'exo 25:34')).toMatch(/^A knop under two branches/);
  });

  it("Exodus 35: LXX2012's 35:8-19 are the Greek 35:8-19 (the table's Brenton column puts them elsewhere), so no verse is left without English", () => {
    for (const v of range(7, 20)) expect(versification.lxx2012ToGreek(`exo 35:${v}`)).toEqual({ state: 'same', refs: [`exo 35:${v}`] });
    expect(textAt('exo', 'exo 35:8')).toMatch(/^and sardine stones/);
    expect(textAt('exo', 'exo 35:9')).toMatch(/^And every man that is wise in heart/);
    expect(textAt('exo', 'exo 35:19')).toMatch(/^and the garments of priesthood/);
    const { byGreek } = englishByGreekVerse(bookOf('exo'), versification);
    expect(versesWithoutEnglish(byGreek, [7, 8, 9, 10, 18, 19, 20].map((v) => `exo 35:${v}`))).toEqual([]);
  });

  it("Exodus 40: LXX2012 joins 6-8, 10-11, 27-28, 29-30 and 31-33, so its 9 is the Greek 7, its 12 the Greek 10 and its 34-38 the Greek 28-32", () => {
    for (const v of [6, 7, 8]) expect(one(`exo 40:${v}`)).toEqual(['exo 40:6']);
    expect(one('exo 40:9')).toEqual(['exo 40:7']);
    expect(one('exo 40:10')).toEqual(['exo 40:8']);
    expect(one('exo 40:11')).toEqual(['exo 40:9']);
    for (const v of range(12, 26)) expect(one(`exo 40:${v}`)).toEqual([`exo 40:${v - 2}`]);
    for (const v of [27, 28]) expect(one(`exo 40:${v}`)).toEqual(['exo 40:25']);
    for (const v of [29, 30]) expect(one(`exo 40:${v}`)).toEqual(['exo 40:26']);
    for (const v of [31, 32, 33]) expect(one(`exo 40:${v}`)).toEqual(['exo 40:27']);
    for (const v of range(34, 38)) expect(one(`exo 40:${v}`)).toEqual([`exo 40:${v - 6}`]);
    expect(textAt('exo', 'exo 40:7')).toMatch(/^And you shall take the anointing oil/);
    expect(textAt('exo', 'exo 40:8')).toMatch(/^And you shall anoint the altar of burnt offerings/);
    expect(textAt('exo', 'exo 40:10')).toMatch(/^And you shall bring Aaron and his sons/);
    expect(textAt('exo', 'exo 40:20')).toMatch(/^And he put the table in the tabernacle/);
    expect(textAt('exo', 'exo 40:28')).toMatch(/^And the cloud covered the tabernacle/);
    const { byGreek, placedAt } = englishByGreekVerse(bookOf('exo'), versification);
    expect(unplacedVerses(new Map([...placedAt].filter(([ref]) => ref.startsWith('exo 40:'))), range(5, 32).map((v) => `exo 40:${v}`))).toEqual([]);
    expect(versesWithoutEnglish(byGreek, range(5, 32).map((v) => `exo 40:${v}`).filter((ref) => ref !== 'exo 40:9'))).toEqual([]);
  });

  it("Leviticus 6: 'the Lord spoke to Moses, saying,' is at the Greek 6:8, 'Charge Aaron' and 'This is the law' at the Greek 6:9", () => {
    expect(versification.lxx2012ToGreek('lev 6:3')).toEqual({ state: 'same', refs: ['lev 6:3'] });
    expect(versification.lxx2012ToGreek('lev 6:4')).toEqual({ state: 'range', refs: ['lev 6:4', 'lev 6:5'] });
    expect(one('lev 6:5')).toEqual(['lev 6:6']);
    expect(one('lev 6:6')).toEqual(['lev 6:7']);
    expect(one('lev 6:7')).toEqual(['lev 6:8']);
    expect(one('lev 6:8')).toEqual(['lev 6:9']);
    expect(one('lev 6:9')).toEqual(['lev 6:9']);
    expect(one('lev 6:10')).toEqual(['lev 6:10']);
    expect(textAt('lev', 'lev 6:8')).toBe('And the Lord spoke to Moses, saying,');
    expect(textAt('lev', 'lev 6:9')).toMatch(/^Charge Aaron and his sons, saying, \| This is the law of whole burnt offering/);
    expect(textAt('lev', 'lev 6:7')).toMatch(/^And the priest shall make atonement for him before the Lord/);
  });

  it("Leviticus 8: LXX2012's 8:18 holds the Greek 18 and 19, its 19-28 are the Greek 20-29 and its 29 and 30 are both in the Greek 30", () => {
    expect(one('lev 8:17')).toEqual(['lev 8:17']);
    expect(versification.lxx2012ToGreek('lev 8:18')).toEqual({ state: 'range', refs: ['lev 8:18', 'lev 8:19'] });
    for (const v of range(19, 28)) expect(one(`lev 8:${v}`)).toEqual([`lev 8:${v + 1}`]);
    expect(one('lev 8:29')).toEqual(['lev 8:30']);
    expect(one('lev 8:30')).toEqual(['lev 8:30']);
    expect(one('lev 8:31')).toEqual(['lev 8:31']);
    expect(textAt('lev', 'lev 8:20')).toMatch(/^And he divided the ram by its limbs/);
    expect(textAt('lev', 'lev 8:29')).toMatch(/^And Moses took the breast/);
    expect(textAt('lev', 'lev 8:30')).toMatch(/^And Moses took of the anointing oil.* \| And he sanctified Aaron/);
  });

  it("Numbers 9: LXX2012's 9:18 holds the Greek 18 and 19 and its 19-22 are the Greek 20-23, so no Greek verse is left without English", () => {
    expect(one('num 9:17')).toEqual(['num 9:17']);
    expect(versification.lxx2012ToGreek('num 9:18')).toEqual({ state: 'range', refs: ['num 9:18', 'num 9:19'] });
    for (const v of range(19, 22)) expect(one(`num 9:${v}`)).toEqual([`num 9:${v + 1}`]);
    expect(textAt('num', 'num 9:23')).toMatch(/^For they shall depart by the command of the Lord/);
    const { byGreek } = englishByGreekVerse(bookOf('num'), versification);
    expect(versesWithoutEnglish(byGreek, ['num 9:17', 'num 9:18', 'num 9:20', 'num 9:21', 'num 9:22', 'num 9:23'])).toEqual([]);
  });

  it("Numbers 21: LXX2012's 21:19 holds the Greek 19 and 20, its 20 is the Greek 21 and its 21 and 22 are both in the Greek 22", () => {
    expect(one('num 21:18')).toEqual(['num 21:18']);
    expect(versification.lxx2012ToGreek('num 21:19')).toEqual({ state: 'range', refs: ['num 21:19', 'num 21:20'] });
    expect(one('num 21:20')).toEqual(['num 21:21']);
    expect(one('num 21:21')).toEqual(['num 21:22']);
    expect(one('num 21:22')).toEqual(['num 21:22']);
    expect(one('num 21:23')).toEqual(['num 21:23']);
    expect(textAt('num', 'num 21:21')).toMatch(/^And Moses sent ambassadors to Seon/);
    expect(textAt('num', 'num 21:22')).toMatch(/^We will pass through your land.* \| We will not drink water/);
  });

  it("Numbers 27: 'The daughters of Salpaad have spoken rightly' is at the Greek 27:7 (Ὀρθῶς θυγατέρες Σαλπαὰδ λελαλήκασιν)", () => {
    expect(one('num 27:2')).toEqual(['num 27:2']);
    expect(versification.lxx2012ToGreek('num 27:3')).toEqual({ state: 'range', refs: ['num 27:3', 'num 27:4'] });
    expect(one('num 27:4')).toEqual(['num 27:5']);
    expect(one('num 27:5')).toEqual(['num 27:6']);
    expect(one('num 27:6')).toEqual(['num 27:7']);
    expect(one('num 27:7')).toEqual(['num 27:8']);
    expect(one('num 27:8')).toEqual(['num 27:8']);
    expect(one('num 27:9')).toEqual(['num 27:9']);
    expect(textAt('num', 'num 27:7')).toMatch(/^The daughters of Salpaad have spoken rightly/);
    expect(textAt('num', 'num 27:6')).toBe('And the Lord spoke to Moses, saying,');
  });
});

// mw-u2w5klk.349.137: LXX2012 numbers Amos 6 with 15 verses (its 6:10 and 6:11 are the Greek's one verse 10), where Swete has 14: from 6:11 its English sat a verse off the Greek and 6:15 was shown nowhere. TVTMS's
// section Amo.6:10-6:14 has no Brenton column. The sweep of the ship's 'no Greek verse to stand at' notes found Judges 5:32 the same way: Swete's 5:31 holds it.
describe("LXX2012's Amos 6 and Judges 5 stand at the Greek verses their text is", () => {
  const maps137 = buildMaps(parseTvtms(fixture('tvtms-v137-slice.txt')));
  const woven = (code: string) => englishByGreekVerse(parseUsfm(fixture(`lxx2012-v137-${code}.usfm`)), maps137);
  const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  it("puts Brenton's Amos 6:10 and 6:11 at the Greek 6:10 and his 6:12-15 at the Greek 6:11-14", () => {
    expect(maps137.lxx2012ToGreek('amo 6:9')).toEqual({ state: 'same', refs: ['amo 6:9'] });
    expect(maps137.lxx2012ToGreek('amo 6:10')).toEqual({ state: 'part', refs: ['amo 6:10'] });
    expect(maps137.lxx2012ToGreek('amo 6:11')).toEqual({ state: 'part', refs: ['amo 6:10'] });
    for (const v of range(12, 15)) expect(maps137.lxx2012ToGreek(`amo 6:${v}`)).toEqual({ state: 'one', refs: [`amo 6:${v - 1}`] });
  });

  it("weaves 'I will raise up against you a nation' at the Greek Amos 6:14, nothing unplaced and no verse of the six left without English", () => {
    const { byGreek, placedAt } = woven('amo');
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' ');
    expect(text('amo 6:10')).toMatch(/^But a remnant shall be left behind.* And he shall say, No one else\./);
    expect(text('amo 6:11')).toMatch(/^For, behold, the Lord commands, and he will strike the great house/);
    expect(text('amo 6:12')).toMatch(/^Will horses run upon rocks\?/);
    expect(text('amo 6:13')).toMatch(/^you⌃ who rejoice at vanity/);
    expect(text('amo 6:14')).toMatch(/I will raise up against you a nation/);
    const swete = range(9, 14).map((v) => `amo 6:${v}`);
    expect(versesWithoutEnglish(byGreek, swete)).toEqual([]);
    expect(unplacedVerses(placedAt, swete)).toEqual([]);
  });

  it("puts Brenton's Judges 5:32 ('And the land had rest forty years') in the Greek 5:31, which ends with it", () => {
    expect(maps137.lxx2012ToGreek('jdg 5:30')).toEqual({ state: 'same', refs: ['jdg 5:30'] });
    for (const v of [31, 32]) expect(maps137.lxx2012ToGreek(`jdg 5:${v}`)).toEqual({ state: 'part', refs: ['jdg 5:31'] });
    const { byGreek, placedAt } = woven('jdg');
    expect((byGreek.get('jdg 5:31') ?? []).map((s) => s.text).join(' ')).toMatch(/^Thus let all your enemies perish.* And the land had rest forty years\.$/);
    expect(unplacedVerses(placedAt, ['jdg 5:30', 'jdg 5:31'])).toEqual([]);
  });
});

// mw-u2w5klk.349.146: LXX2012 numbers Joshua 5 with 16 verses where Swete has 15: his 5:14 and 5:15 ('Joshua fell on his face') are both in the Greek 5:14 and his 5:16 ('Loose your shoe') is the Greek 5:15, so
// 'Joshua fell on his face' stood under 'Λῦσαι τὸ ὑπόδημα' and 'Loose your shoe' was shown nowhere. TVTMS's section Jos.5:14--6:27 has no Brenton column.
describe("LXX2012's Joshua 5 stands at the Greek verses its text is", () => {
  const maps146 = buildMaps(parseTvtms(fixture('tvtms-v146-slice.txt')));
  const woven = () => englishByGreekVerse(parseUsfm(fixture('lxx2012-v146-jos.usfm')), maps146);

  it("puts Brenton's Joshua 5:14 and 5:15 at the Greek 5:14 and his 5:16 at the Greek 5:15", () => {
    expect(maps146.lxx2012ToGreek('jos 5:13')).toEqual({ state: 'same', refs: ['jos 5:13'] });
    for (const v of [14, 15]) expect(maps146.lxx2012ToGreek(`jos 5:${v}`)).toEqual({ state: 'part', refs: ['jos 5:14'] });
    expect(maps146.lxx2012ToGreek('jos 5:16')).toEqual({ state: 'one', refs: ['jos 5:15'] });
  });

  it("weaves 'Loose your shoe' at the Greek Joshua 5:15, nothing unplaced and no verse of the three left without English", () => {
    const { byGreek, placedAt } = woven();
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' ');
    expect(text('jos 5:14')).toMatch(/^And he said to him, I am now come.* And Joshua fell on his face upon the earth.* what command you your servant\?$/);
    expect(text('jos 5:15')).toMatch(/^And the captain of the Lord's host said to Joshua, Loose your shoe off your feet/);
    const swete = [13, 14, 15].map((v) => `jos 5:${v}`);
    expect(versesWithoutEnglish(byGreek, swete)).toEqual([]);
    expect(unplacedVerses(placedAt, swete)).toEqual([]);
  });
});

// mw-u2w5klk.349.147: Swete puts the altar on Mount Ebal (Brenton's 8:30-35) at 9:3-8, after 9:2, so Brenton's 9:3-26 are the Greek 9:9-32 and his 9:27-29 the Greek 9:33. TVTMS's section Jos.8:30--9:27
// has a Brenton column that stands 8:30-35 at 9:2.1-6 (Rahlfs' sub-verses, which Swete does not number), so they were shown nowhere and chapter 9 stood six verses off. LXX2012's 9:30-33 repeat 8:30-35 as an addition.
describe("LXX2012's Joshua 8:30-35 and chapter 9 stand at the Greek verses their text is", () => {
  const maps147 = buildMaps(parseTvtms(fixture('tvtms-v147-slice.txt')));
  const woven = () => englishByGreekVerse(parseUsfm(fixture('lxx2012-v147-jos.usfm')), maps147);

  it("puts Brenton's Joshua 8:30-35 at the Greek 9:3-8 and his 9:3-26 six verses on", () => {
    expect(maps147.lxx2012ToGreek('jos 8:29')).toEqual({ state: 'same', refs: ['jos 8:29'] });
    for (const v of [30, 31, 32, 33, 34, 35]) expect(maps147.lxx2012ToGreek(`jos 8:${v}`)).toEqual({ state: 'one', refs: [`jos 9:${v - 27}`] });
    for (const v of [1, 2]) expect(maps147.lxx2012ToGreek(`jos 9:${v}`)).toEqual({ state: 'same', refs: [`jos 9:${v}`] });
    for (const v of [3, 4, 10, 11, 12, 26]) expect(maps147.lxx2012ToGreek(`jos 9:${v}`)).toEqual({ state: 'one', refs: [`jos 9:${v + 6}`] });
    for (const v of [27, 28, 29]) expect(maps147.lxx2012ToGreek(`jos 9:${v}`)).toEqual({ state: 'part', refs: ['jos 9:33'] });
  });

  it('weaves the altar at the Greek 9:3-8 and the Gabaonites at 9:9 on, nothing unplaced and no Greek verse of them left without English', () => {
    const { byGreek, placedAt } = woven();
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' ');
    expect(text('jos 9:2')).toMatch(/^they came all together/);
    expect(text('jos 9:3')).toMatch(/^Then Joshua built an altar to the Lord God of Israel in mount Gaebal,$/);
    expect(text('jos 9:4')).toMatch(/^as Moses the servant of the Lord commanded/);
    expect(text('jos 9:5')).toMatch(/^And Joshua wrote upon the stones/);
    expect(text('jos 9:6')).toMatch(/^And all Israel, and their elders/);
    expect(text('jos 9:7')).toMatch(/^And afterwards Joshua read/);
    expect(text('jos 9:8')).toMatch(/^There was not a word of all that Moses charged Joshua/);
    expect(text('jos 9:9')).toMatch(/^And the inhabitants of Gabaon heard/);
    expect(text('jos 9:10')).toMatch(/^And they also wrought craftily/);
    expect(text('jos 9:18')).toMatch(/^These .*the loaves/);
    expect(text('jos 9:32')).toMatch(/^And they did so to them/);
    expect(text('jos 9:33')).toMatch(/^And Joshua made them in that day hewers of wood/);
    expect(text('jos 9:33')).not.toMatch(/Then Joshua built an altar/);
    const swete = ['jos 8:29', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 32, 33].map((v) => `jos 9:${v}`)];
    expect(versesWithoutEnglish(byGreek, swete.filter((r) => !['jos 9:16', 'jos 9:17'].includes(r)))).toEqual([]);
    expect(unplacedVerses(placedAt, new Set(swete))).toEqual([]);
  });
});

// mw-u2w5klk.349.150: LXX2012's Obadiah 1:2 ('Arise you, and let us rise up against her to war') is the end of Swete's 1:1 and its 1:3 holds Swete's 2 and 3 (both have 21 verses); the map stood them
// at the Greek 2 and 3, so a tap in 1:2 opened the words of 'Behold, I have made you small'. The table has no section for Obadiah, so these rows stand alone.
describe("LXX2012's Obadiah 1 stands at the Greek verses its text is", () => {
  const obaMaps = buildMaps([]);

  it("puts Brenton's 1:2 at the Greek 1:1 and his 1:3 at the Greek 1:2 (and 1:3), and leaves 1:1 and 1:4 where they were", () => {
    expect(obaMaps.lxx2012ToGreek('oba 1:1')).toEqual({ state: 'same', refs: ['oba 1:1'] });
    expect(obaMaps.lxx2012ToGreek('oba 1:2')).toEqual({ state: 'one', refs: ['oba 1:1'] });
    expect(obaMaps.lxx2012ToGreek('oba 1:3')).toEqual({ state: 'range', refs: ['oba 1:2', 'oba 1:3'] });
    expect(obaMaps.lxx2012ToGreek('oba 1:4')).toEqual({ state: 'same', refs: ['oba 1:4'] });
  });
});

// mw-u2w5klk.349.159: Swete's Joshua 20 numbers 4-6 with no word and has the cities of refuge at 7-9, so Brenton's 20:4-6 stood at three verses with no word and 7-9 had no English; his 21:36-43 are the Greek
// 21:36-45 (his 36 holds the Greek 36-37, his 37 the Greek 38-39), so the Greek 44 and 45 had no English and the end of the chapter stood two verses off.
describe("LXX2012's Joshua 20 and 21 stand at the Greek verses their text is", () => {
  const maps159 = buildMaps(parseTvtms(fixture('tvtms-v159-slice.txt')));
  const woven = () => englishByGreekVerse(parseUsfm(fixture('lxx2012-v159-jos.usfm')), maps159);
  const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const text = (byGreek: ReadonlyMap<string, readonly { text: string }[]>, ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' ');

  it("puts Brenton's Joshua 20:4-6 at the Greek 20:7-9 and his 21:36-43 at the Greek 21:36-45", () => {
    for (const v of [1, 2, 3]) expect(maps159.lxx2012ToGreek(`jos 20:${v}`)).toEqual({ state: 'same', refs: [`jos 20:${v}`] });
    for (const v of [4, 5, 6]) expect(maps159.lxx2012ToGreek(`jos 20:${v}`)).toEqual({ state: 'one', refs: [`jos 20:${v + 3}`] });
    expect(maps159.lxx2012ToGreek('jos 21:35')).toEqual({ state: 'same', refs: ['jos 21:35'] });
    expect(maps159.lxx2012ToGreek('jos 21:36').refs).toEqual(['jos 21:36', 'jos 21:37']);
    expect(maps159.lxx2012ToGreek('jos 21:37').refs).toEqual(['jos 21:38', 'jos 21:39']);
    for (const v of [38, 39, 40, 41, 42, 43]) expect(maps159.lxx2012ToGreek(`jos 21:${v}`)).toEqual({ state: 'one', refs: [`jos 21:${v + 2}`] });
  });

  it('weaves the cities of refuge at the Greek 20:7-9 and the Lord giving rest at 21:44, nothing unplaced and no Greek verse with words left without English but the second of a pair', () => {
    const { byGreek, placedAt } = woven();
    expect(text(byGreek, 'jos 20:3')).toMatch(/until he have stood before the congregation for judgment\.$/);
    expect(text(byGreek, 'jos 20:7')).toMatch(/^And Joshua separated Cades in Galilee/);
    expect(text(byGreek, 'jos 20:8')).toMatch(/^And beyond Jordan he appointed Bosor/);
    expect(text(byGreek, 'jos 20:9')).toMatch(/^These were the cities selected for the sons of Israel/);
    for (const v of [4, 5, 6]) expect(text(byGreek, `jos 20:${v}`)).toBe('');
    expect(text(byGreek, 'jos 21:36')).toMatch(/^And beyond Jordan over against Jericho.* Mapha and its suburbs; four cities\.$/);
    expect(text(byGreek, 'jos 21:38')).toMatch(/^And out of the tribe of Gad.* the cities were four in all\.$/);
    expect(text(byGreek, 'jos 21:40')).toMatch(/^All these cities were given to the sons of Merari/);
    expect(text(byGreek, 'jos 21:41')).toMatch(/^All the cities of the Levites in the midst of the possession.* forty-eight cities,$/);
    expect(text(byGreek, 'jos 21:42')).toMatch(/^and their suburbs round about these cities.* put them in Thamnasachar\.$/);
    expect(text(byGreek, 'jos 21:43')).toMatch(/^So the Lord gave to Israel all the land/);
    expect(text(byGreek, 'jos 21:44')).toMatch(/^And the Lord gave them rest round about/);
    expect(text(byGreek, 'jos 21:45')).toMatch(/^There failed not one of the good things/);
    const swete20 = [1, 2, 3, 7, 8, 9].map((v) => `jos 20:${v}`);
    const swete21 = range(35, 45).map((v) => `jos 21:${v}`);
    expect(versesWithoutEnglish(byGreek, [...swete20, ...swete21])).toEqual(['jos 21:37', 'jos 21:39']);
    expect(unplacedVerses(placedAt, new Set([...range(1, 9).map((v) => `jos 20:${v}`), ...range(1, 45).map((v) => `jos 21:${v}`)]))).toEqual([]);
  });
});

// mw-u2w5klk.349.157: Brenton's Jonah 2:7 begins 'to the clefts of the mountains;', which ends Swete's 2:6 (εἰς σχισμὰς ὀρέων): LXX2012_SPLITS cuts those words off the verse and stands them at the Greek verse they render.
describe("LXX2012's Jonah 2:7 begins with the last words of the Greek 2:6", () => {
  const jonah = parseUsfm(fixture('lxx2012-jon-2.usfm'));
  const maps = buildMaps([]);
  it('stands "to the clefts of the mountains;" at the end of the Greek 2:6 and the rest of the verse at the Greek 2:7', () => {
    const { byGreek, placedAt } = englishByGreekVerse(jonah, maps);
    const text = (ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');
    expect(text('jon 2:6')).toBe('Water was poured around me to the soul: the lowest deep compassed me, my head went down | to the clefts of the mountains;');
    expect(text('jon 2:7')).toMatch(/^I went down into the earth, whose bars are the everlasting barriers:/);
    expect(text('jon 2:7')).not.toMatch(/clefts/);
    expect(placedAt.get('jon 2:7')).toBe('jon 2:7');
    expect(placedAt.get('jon 2:6')).toBe('jon 2:6');
  });
  it('keeps the positions of the supplied words of the part left in the verse', () => {
    const { byGreek } = englishByGreekVerse(jonah, maps);
    // 2:7 has no supplied word; 2:11's ('land') and 2:10's ('my') are as the USFM has them
    expect(byGreek.get('jon 2:7')?.[0].supplied).toEqual([]);
    expect(byGreek.get('jon 2:10')?.[0].supplied).toEqual(jonah.chapters[0].verses.find((v) => v.verse === 10)!.supplied);
  });
});

// mw-u2w5klk.349.200: Brenton's Hosea 6:3 ends 'and shall know him:' and his 6:10 ends 'in the house of Israel.', which are the first words of Swete's 6:3 (καὶ γνωσόμεθα) and 6:10 (ἐν τῷ οἴκῳ τοῦ Ἰσραήλ): a tail in
// LXX2012_SPLITS cuts those words off the end of the verse and stands them at the start of the Greek verse they render.
describe("LXX2012's Hosea 6:3 and 6:10 end with the first words of the next Greek verse", () => {
  const hosea = parseUsfm(fixture('lxx2012-hos-6.usfm'));
  const maps = buildMaps(parseTvtms(fixture('tvtms-v200-slice.txt')));
  const woven = () => englishByGreekVerse(hosea, maps);
  const text = (byGreek: ReturnType<typeof englishByGreekVerse>['byGreek'], ref: string): string => (byGreek.get(ref) ?? []).map((s) => s.text).join(' | ');

  it('stands "and shall know him:" at the start of the Greek 6:3 and "in the house of Israel." at the start of the Greek 6:10, after nothing of the verse before', () => {
    const { byGreek } = woven();
    expect(text(byGreek, 'hos 6:2')).toBe('After two days he will heal us: in the third day we shall arise, and live before him,');
    expect(text(byGreek, 'hos 6:3')).toBe('and shall know him: | let us follow on to know the Lord: we shall find him ready as the morning, and he will come to us as the early and latter rain to the earth.');
    expect(text(byGreek, 'hos 6:9')).toBe('And your strength is that of a robber: the priests have hid the way, they have murdered the people of Sicima; for they have wrought iniquity');
    expect(text(byGreek, 'hos 6:10')).toBe('in the house of Israel. | I have seen horrible things there, even the fornication of Ephraim: Israel and Juda are defiled;');
  });
  it('keeps the places of the supplied words on each side of the cut', () => {
    const { byGreek } = woven();
    // 'him' (the last word of 'and shall know him:') is supplied in the tail; 'is that' (words 3 and 4) and 'the people of' (17 to 19) stay in the part left
    expect(byGreek.get('hos 6:3')?.[0].supplied).toEqual([3]);
    expect(byGreek.get('hos 6:2')?.[0].supplied).toEqual([]);
    expect(byGreek.get('hos 6:10')?.[0].supplied).toEqual([]);
    expect(byGreek.get('hos 6:9')?.[0].supplied).toEqual([3, 4, 17, 18, 19]);
  });
  it('leaves each cut verse standing at the Greek verse the map puts it at', () => {
    const { placedAt } = woven();
    expect(placedAt.get('hos 6:3')).toBe('hos 6:2');
    expect(placedAt.get('hos 6:10')).toBe('hos 6:9');
    expect(placedAt.get('hos 6:4')).toBe('hos 6:3');
  });
  it('throws when the verse does not end with the words of the tail', () => {
    const other = parseUsfm(fixture('lxx2012-hos-6.usfm').replace('and shall know \\add him\\add*:', 'and shall know:'));
    expect(() => englishByGreekVerse(other, maps)).toThrow(/LXX2012_SPLITS expects the verse to end/);
  });
});
