// The MSB table's '. . .' English on a pronoun row (mw-5r3p30.997, found by mw-5r3p30.993; docs/sources/msb-chunk-pairs.md):
// scripts/data/chapterWriter.ts buildVerse joined a '. . .' word to the NEXT chunk with English, but a pronoun's English is already inside
// the chunk BEFORE it ('to hand Him over' holds αὐτὸν). Rows are the published table's own (tests/fixtures/data/msb-dots.tsv).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMsb } from '../../scripts/data-build';
import { buildVerse } from '../../scripts/data/chapterWriter';
import type { Verse } from '../../src/data/chapter';

const table = parseMsb(readFileSync('tests/fixtures/data/msb-dots.tsv', 'utf8'));
function built(book: string, chapter: number, n: number, dotsBefore = true): Verse {
  const v = table.find((x) => x.book === book && x.chapter === chapter && x.n === n);
  if (!v) throw new Error(`no ${book} ${chapter}:${n} in the fixture`);
  return buildVerse(v, (w) => ({ t: w.text, tr: w.translit, s: w.strongs, l: w.text, p: w.parse }), { dotsBefore });
}
const wordsOf = (v: Verse, i: number) => v.e[i].g.map((k) => v.g[k].t);

describe("a '. . .' pronoun whose English is in the chunk before", () => {
  const luke = built('Luke', 20, 20);
  const at = luke.e.findIndex((c) => c.t.startsWith('to hand Him over'));

  it("Luke 20:20: αὐτὸν joins 'to hand Him over', and 'to the' holds τῇ alone", () => {
    expect(at).toBe(12);
    expect(wordsOf(luke, 12)).toEqual(['παραδοῦναι', 'αὐτὸν']);
    expect(luke.e[13].t).toBe('to the');
    expect(wordsOf(luke, 13)).toEqual(['τῇ']);
  });

  it('every word still points at the chunk that lists it', () => {
    luke.g.forEach((w, i) => {
      if (w.e !== undefined) expect(luke.e[w.e].g).toContain(i);
    });
    luke.e.forEach((c, j) => c.g.forEach((i) => expect(luke.g[i].e).toBe(j)));
  });
});

describe("a '. . .' reflexive pronoun (F-) goes the same way", () => {
  it("Ephesians 4:19: ἑαυτοὺς joins 'have given themselves over', and 'to' holds τῇ alone", () => {
    const eph = built('Ephesians', 4, 19);
    const at = eph.e.findIndex((c) => c.t.startsWith('have given themselves over'));
    expect(wordsOf(eph, at)).toEqual(['ἑαυτοὺς', 'παρέδωκαν']);
    expect(wordsOf(eph, at + 1)).toEqual(['τῇ']);
  });
});

describe("a '. . .' pronoun after a chunk of function words only waits for the chunk after", () => {
  it("Luke 12:37: 'and' + αὐτούς: αὐτούς joins 'will have them recline at the table', not 'and'", () => {
    const luke = built('Luke', 12, 37);
    const and = luke.e.findIndex((c) => c.t === 'and');
    expect(and).toBeGreaterThan(-1);
    expect(wordsOf(luke, and)).toEqual(['καὶ']);
    expect(wordsOf(luke, and + 1)).toEqual(['ἀνακλινεῖ', 'αὐτούς']);
  });
});

describe("a '. . .' pronoun at the head of a verse has no chunk before it", () => {
  it('joins the first chunk with English, as any other word does', () => {
    const v = {
      book: 'Luke', chapter: 1, n: 1, heading: '',
      words: [
        { sourceSort: 1, englishSort: 1, text: 'αὐτῷ', translit: '', parse: 'P-DSM', strongs: 'G846', english: '. . .', begQ: '', tail: '', par: '', note: '' },
        { sourceSort: 2, englishSort: 2, text: 'εἶπεν', translit: '', parse: 'V-2AAI-3S', strongs: 'G3004', english: 'said', begQ: '', tail: '', par: '', note: '' },
      ],
    };
    const verse = buildVerse(v, (w) => ({ t: w.text, tr: w.translit, s: w.strongs, l: w.text, p: w.parse }), { dotsBefore: true });
    expect(wordsOf(verse, 0)).toEqual(['αὐτῷ', 'εἶπεν']);
    const noun = { ...v, words: [{ ...v.words[0], text: 'λόγος', parse: 'N-NSM' }, v.words[1]] };
    expect(wordsOf(buildVerse(noun, (w) => ({ t: w.text, tr: w.translit, s: w.strongs, l: w.text, p: w.parse }), { dotsBefore: true }), 0)).toEqual(['λόγος', 'εἶπεν']);
  });
});

// mw-5r3p30.1001: every OTHER '. . .' row (not only P-, F-) means the English is in the chunk before; the sweep's wrong verses, one word kind each.
describe("a '. . .' word of any kind whose English is in the chunk before", () => {
  it("Matthew 1:23: the preposition ἐν and the noun γαστρὶ join 'will be with child' (ἕξει)", () => {
    const v = built('Matthew', 1, 23);
    const at = v.e.findIndex((c) => c.t.startsWith('will be with child'));
    expect(wordsOf(v, at)).toEqual(['ἐν', 'γαστρὶ', 'ἕξει']);
  });

  it("Luke 4:8: the verb εἶπεν (and the pronoun αὐτῷ) join 'answered', and 'Get' holds ὕπαγε alone", () => {
    const v = built('Luke', 4, 8);
    const at = v.e.findIndex((c) => c.t.startsWith('answered'));
    expect(wordsOf(v, at)).toEqual(['ἀποκριθεὶς', 'αὐτῷ', 'εἶπεν']);
    expect(wordsOf(v, at + 1)).toEqual(['Ὕπαγε']);
  });

  it("Acts 16:13: the noun ἡμέρᾳ joins 'Sabbath', not 'we went'", () => {
    const v = built('Acts', 16, 13);
    const at = v.e.findIndex((c) => c.t.startsWith('Sabbath'));
    expect(wordsOf(v, at)).toEqual(['ἡμέρᾳ', 'σαββάτων']);
    expect(wordsOf(v, at + 1)).toEqual(['ἐξήλθομεν']);
  });

  it("Galatians 5:14: the second ἐν joins the first ἐν's 'in', and 'a single' holds ἑνὶ alone", () => {
    const v = built('Galatians', 5, 14);
    const at = v.e.findIndex((c) => c.t === 'in');
    expect(wordsOf(v, at)).toEqual(['ἐν', 'ἐν']);
    expect(wordsOf(v, at + 1)).toEqual(['ἑνὶ']);
  });

  it("Revelation 4:3: the noun λίθῳ joins 'carnelian' (σαρδίῳ), not 'and'", () => {
    const v = built('Revelation', 4, 3);
    const at = v.e.findIndex((c) => c.t.startsWith('carnelian'));
    expect(wordsOf(v, at)).toEqual(['λίθῳ', 'σαρδίῳ']);
  });
});

describe("a '. . .' word after a chunk of function words only", () => {
  it("Galatians 5:14: a preposition joins the chunk before even when that holds only a preposition ('in')", () => {
    const gal = built('Galatians', 5, 14);
    expect(wordsOf(gal, gal.e.findIndex((c) => c.t === 'in'))).toEqual(['ἐν', 'ἐν']);
  });
});

describe("the Old Testament's build (no dotsBefore): only a pronoun goes before, every other '. . .' word still joins the NEXT chunk", () => {
  it("Matthew 1:23 read that way: ἐν γαστρὶ join 'and'; Luke 20:20 αὐτὸν still goes before", () => {
    const mt = built('Matthew', 1, 23, false);
    const and = mt.e.findIndex((c) => c.t === 'and');
    expect(wordsOf(mt, and)).toEqual(['ἐν', 'γαστρὶ', 'καὶ']);
    expect(wordsOf(mt, and - 1)).toEqual(['ἕξει']);
    expect(wordsOf(built('Luke', 20, 20, false), 12)).toEqual(['παραδοῦναι', 'αὐτὸν']);
  });
});
