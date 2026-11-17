// mw-5r3p30.1166: the Greek tab breaks a poetry verse into lines, the New Testament's borrowed from the English lines (the word each English line starts at, by the word alignment), the Septuagint's from the Hebrew
// verse's lines (by proportion, docs/data.md 'Poetry lines').
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { fillChapter, type Chapter, type EnglishChunk, type GreekWord, type Verse } from '../../src/data/chapter';
import { greekLineStarts, hebrewLinesOf, septuagintLineStarts } from '../../src/data/poetry';
import { withSeptuagintLines } from '../../src/data/lxxChapter';
import { VerseText } from '../../src/reader/VerseText';

afterEach(cleanup);
const chapterOf = (path: string): Chapter => fillChapter(JSON.parse(readFileSync(path, 'utf8')) as Chapter);
const verseOf = (path: string, n: number): Verse => chapterOf(`public/data/${path}.json`).verses.find((v) => v.n === n)!;
const textsOf = (verse: Verse): string[] | undefined => hebrewLinesOf(verse)?.map((l) => verse.g.slice(l.from, l.to).map((w) => w.t).join(' '));
const none = (): void => undefined;

describe('the Greek lines of a New Testament verse of poetry, borrowed from the English lines', () => {
  it('lists the lines of Luke 1:46-55 (the Magnificat): each starts at the Greek word its English line starts with, the lead-in apart, a verse of one line as running text', () => {
    const lines = Object.fromEntries(Array.from({ length: 10 }, (_, k) => [46 + k, textsOf(verseOf('luk/1', 46 + k)) ?? null]));
    expect(lines).toEqual({
      46: ['Καὶ εἶπεν Μαριάμ', 'Μεγαλύνει ἡ ψυχή μου τὸν κύριον'],
      47: null,
      48: ['Ὅτι ἐπέβλεψεν ἐπὶ τὴν ταπείνωσιν τῆς δούλης αὐτοῦ', 'Ἰδοὺ γάρ ἀπὸ τοῦ νῦν μακαριοῦσίν με πᾶσαι αἱ γενεαί'],
      49: ['Ὅτι ἐποίησέν μοι μεγαλεῖα ὁ δυνατός', 'καὶ ἅγιον τὸ ὄνομα αὐτοῦ'],
      50: ['Καὶ τὸ ἔλεος αὐτοῦ εἰς', 'γενεὰς γενεῶν τοῖς φοβουμένοις αὐτόν'],
      51: ['Ἐποίησεν κράτος ἐν βραχίονι αὐτοῦ', 'διεσκόρπισεν ὑπερηφάνους', 'διανοίᾳ καρδίας αὐτῶν'],
      52: ['Καθεῖλεν δυνάστας ἀπὸ θρόνων', 'καὶ ὕψωσεν ταπεινούς'],
      53: ['Πεινῶντας ἐνέπλησεν ἀγαθῶν', 'καὶ πλουτοῦντας ἐξαπέστειλεν κενούς'],
      54: ['Ἀντελάβετο Ἰσραὴλ παιδὸς αὐτοῦ', 'μνησθῆναι ἐλέους'],
      55: ['καθὼς ἐλάλησεν πρὸς τοὺς πατέρας ἡμῶν', 'τῷ Ἀβραὰμ καὶ τῷ σπέρματι αὐτοῦ εἰς τὸν αἰῶνα'],
    });
  });

  it('sets the words before the first line apart as a lead-in of indent 0, and every other line one level in', () => {
    const spans = hebrewLinesOf(verseOf('luk/1', 46))!;
    expect(spans.map((s) => [s.indent, s.continued])).toEqual([[0, true], [1, false]]);
    expect(hebrewLinesOf(verseOf('luk/1', 48))!.map((s) => [s.indent, s.continued])).toEqual([[1, false], [1, false]]);
  });

  it('breaks Philippians 2:6-11, and the quotation of the Psalm in Romans 3:13 (the Old Testament quoted as poetry)', () => {
    expect(textsOf(verseOf('php/2', 6))!.length).toBeGreaterThan(1);
    expect(textsOf(verseOf('rom/3', 13))!.length).toBeGreaterThan(1);
  });

  it('gives the lines the words of the verse, in order, none twice and none left out, in every poetry verse of the New Testament it has them for', () => {
    for (const [path, n] of [['luk/1', 46], ['luk/1', 51], ['luk/1', 68], ['php/2', 6], ['php/2', 7]] as const) {
      const verse = verseOf(path, n);
      const spans = hebrewLinesOf(verse)!;
      expect(spans[0].from).toBe(0);
      expect(spans.at(-1)!.to).toBe(verse.g.length);
      spans.slice(1).forEach((s, k) => expect(s.from).toBe(spans[k].to));
    }
  });

  const word = (i: number): GreekWord => ({ t: `w${i}`, tr: '', s: '', l: '', p: '', e: 0 });
  const chunk = (g: number[]): EnglishChunk => ({ t: 'x', g });
  const six = [0, 1, 2, 3, 4, 5].map(word);

  it('falls back to the previous line for a line whose Greek cannot be placed: a line of chunks with no Greek word is not a break', () => {
    const e = [chunk([0, 1]), chunk([]), chunk([2, 3]), chunk([4, 5])];
    expect(greekLineStarts({ g: six, e, l: [[0, 1], [1, 1], [2, 1], [3, 1]] })).toEqual({ starts: [0, 2, 4], lead: false });
  });

  it('falls back too for a line that would start at or before the line before it (the Greek runs the other way)', () => {
    const e = [chunk([0, 1]), chunk([3, 4, 5]), chunk([2])];
    // line 3 starts at Greek 2, which is not after line 2's 3: its words stay in line 2
    expect(greekLineStarts({ g: six, e, l: [[0, 1], [1, 1], [2, 1]] })).toEqual({ starts: [0, 3], lead: false });
    expect(greekLineStarts({ g: six, e: [chunk([0, 1]), chunk([0, 1])], l: [[0, 1], [1, 1]] })).toBeNull();
  });

  it('has no lines for a verse that is prose, or whose English lines fall into one line in Greek', () => {
    expect(greekLineStarts({ g: six, e: [chunk([0, 1, 2]), chunk([3, 4, 5])] })).toBeNull();
    expect(greekLineStarts({ g: six, e: [chunk([0, 1, 2]), chunk([3, 4, 5])], l: [[0, 1]] })).toBeNull();
  });

  it('draws the Greek tab of Luke 1:48 as two lines, the Weave and the English tab as they were', () => {
    const verse = verseOf('luk/1', 48);
    const { container } = render(<VerseText verse={verse} view="greek" source="grc" woven={null} onLook={none} poetry />);
    expect([...container.querySelectorAll<HTMLElement>('[data-line]')].map((l) => l.textContent?.trim().split(/\s+/)[0])).toEqual(['Ὅτι', 'Ἰδοὺ']);
    const english = render(<VerseText verse={verse} view="english" source="grc" woven={null} onLook={none} poetry />);
    expect(english.container.querySelectorAll('[data-line]').length).toBe(2);
  });
});

describe('the Septuagint lines of a verse of poetry, from its Hebrew verse', () => {
  const greek = JSON.parse(readFileSync('tests/fixtures/data-lxx/psa/22.json', 'utf8')) as Chapter;
  const hebrew = chapterOf('public/data/psa/23.json');
  const laid = withSeptuagintLines(greek, hebrew, 'psa', 23);
  const lines = (n: number): string[] | undefined => textsOf(laid.verses.find((v) => v.n === n)!);

  it('breaks Psalm 23 (Greek 22) where the Hebrew verse breaks, snapped to the Greek stops', () => {
    expect(lines(1)).toEqual(['Ψαλμὸς τῷ Δαυείδ.', 'Κύριος ποιμαίνει με, καὶ οὐδέν με ὑστερήσει.']);
    expect(lines(2)).toEqual(['εἰς τόπον χλόης, ἐκεῖ με κατεσκήνωσεν·', 'ἐπὶ ὕδατος ἀναπαύσεως ἐξέθρεψέν με·']);
    expect(lines(3)).toEqual(['τὴν ψυχήν μου ἐπέστρεψεν.', 'ὡδήγησέν με ἐπὶ τρίβους δικαιοσύνης ἕνεκεν τοῦ ὀνόματος αὐτοῦ.']);
  });

  it('gives each verse as many lines as its Hebrew verse has, the words in order and none left out', () => {
    for (const v of laid.verses) {
      const hv = hebrew.verses.find((h) => h.n === (v.ref === 'none' || v.ref === undefined ? -1 : v.ref.verse))!;
      const spans = hebrewLinesOf(v);
      if (!hv.hl) {
        expect(spans).toBeNull();
        continue;
      }
      expect(spans!.length).toBeLessThanOrEqual(hv.hl.length);
      expect(spans![0].from).toBe(0);
      expect(spans!.at(-1)!.to).toBe(v.g.length);
    }
  });

  it('leaves the Greek as running text when its Hebrew verse is prose, or when there is no Hebrew chapter', () => {
    expect(withSeptuagintLines(greek, null, 'psa', 23)).toBe(greek);
    const prose = { ...hebrew, verses: hebrew.verses.map((v) => ({ ...v, l: undefined, hl: undefined })) };
    expect(withSeptuagintLines(greek, prose, 'psa', 23).verses.every((v) => v.hl === undefined)).toBe(true);
  });

  it('puts the breaks by proportion of the Hebrew letters, a stop within a few letters of the place winning', () => {
    // 3 Hebrew lines of 10, 10 and 10 letters over 6 Greek words of 5 letters: the breaks fall at 2 and 4 words when no word carries a stop
    const words = ['aaaaa', 'bbbbb', 'ccccc', 'ddddd', 'eeeee', 'fffff'].map((t) => ({ t }));
    expect(septuagintLineStarts(words, [10, 10, 10])).toEqual([0, 2, 4]);
    // a stop after the third word is nearer a natural break than the proportional second
    expect(septuagintLineStarts([{ t: 'aaaaa' }, { t: 'bbbbb' }, { t: 'ccccc,' }, { t: 'ddddd' }, { t: 'eeeee' }, { t: 'fffff' }], [15, 15])).toEqual([0, 3]);
    expect(septuagintLineStarts(words, [30])).toBeNull();
  });
});
