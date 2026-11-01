// tests/unit/lxx-english.test.ts — Lampas Septuagint R1 (mw-u2w5klk.9): Brenton's English per verse (LXX2012, scripts/data/lxx2012.ts) and the
// Greek-to-Lampas verse map (STEPBible TVTMS, scripts/data/tvtms.ts), read by scripts/lxx/english.ts. Fixtures under tests/fixtures/lxx/ are
// slices of the real sources; no test touches the network.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { carriedAsGreek, parseUsfm } from '../../scripts/data/lxx2012';
import { buildMaps, parseTvtms, type TvtmsMaps } from '../../scripts/data/tvtms';
import { bookReport, formatLine } from '../../scripts/lxx/english';

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
