// tests/unit/lxx-english.test.ts — Lampas Septuagint R1 (mw-u2w5klk.9): Brenton's English per verse (LXX2012, scripts/data/lxx2012.ts) and the
// Greek-to-Lampas verse map (STEPBible TVTMS, scripts/data/tvtms.ts), read by scripts/lxx/english.ts. Fixtures under tests/fixtures/lxx/ are
// slices of the real sources; no test touches the network.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { carriedAsGreek, parseUsfm } from '../../scripts/data/lxx2012';
import { buildMaps, parseTvtms, type TvtmsMaps } from '../../scripts/data/tvtms';
import { bookReport, formatLine } from '../../scripts/lxx/english';
import { sweteVerses, verseSetGaps, formatGap } from '../../scripts/lxx/versesets';
import { englishByGreekVerse, unplacedVerses, versesWithoutEnglish, withoutEnglishNote } from '../../scripts/data/lxxChapter';

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
    expect(withoutEnglishNote('psa', ['psa 149:9'])).toBe('psa: Greek verses with no English (their text, if Brenton has it, stands in the English of the verse before): psa 149:9');
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
