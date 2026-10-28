// The English of every variant unit (docs/data.md 'Variant English', mw-9ji6ek0.3): the MSB footnote's where one matches, data/variant-english.json's
// for the rest; whether a unit changes the English; whose reading it is. On small fixtures and the committed public/data; never the network.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildData, parseLexicon } from '../../scripts/data-build';
import { alignChapter, parseVariantsCsv } from '../../scripts/data/variants';
import {
  changesEnglish,
  englishStats,
  layEnglish,
  parseFootnote,
  plainEnglish,
  unitKey,
  witnessOf,
  type LampasEnglishFile,
} from '../../scripts/data/variantEnglish';
import { COLUMNS } from '../../scripts/data/bereanTable';
import type { Chapter, VariantCode, VariantPlace, VariantUnit, Verse } from '../../src/data/chapter';

describe('an MSB footnote', () => {
  it('reads the critical text’s own words from "CT <i>…</i>", with the entity written out', () => {
    expect(parseFootnote('CT <i>King Herod</i>')).toEqual({ kind: 'replace', text: 'King Herod' });
    expect(parseFootnote('CT <i>Am&#333;s</i>, a variant spelling of <i>Amon</i>; twice in this verse; see 1 Chronicles 3:14.')).toEqual({ kind: 'replace', text: 'Amōs' });
  });

  it('takes only the first <i>, and only up to the witnesses beside CT', () => {
    expect(parseFootnote('CT <i>they went</i>; GOC and TR <i>His disciples went</i>')).toEqual({ kind: 'replace', text: 'they went' });
    expect(parseFootnote('CT and TR <i>brothers</i>')).toEqual({ kind: 'replace', text: 'brothers' });
    expect(parseFootnote('CT literal <i>The tempter came and said to Him</i>')).toEqual({ kind: 'replace', text: 'The tempter came and said to Him' });
    expect(parseFootnote('CT <i>Go away</i> or <i>Be gone</i>')).toEqual({ kind: 'replace', text: 'Go away' });
  });

  it('tells a reading the CT leaves out and one it has', () => {
    expect(parseFootnote('CT does not include <i>lamentation and</i>.')).toEqual({ kind: 'omit', text: 'lamentation and' });
    expect(parseFootnote('CT and TR do not include <i>X</i>.')).toEqual({ kind: 'omit', text: 'X' });
    expect(parseFootnote('CT includes <i>raise the dead</i>; TR includes <i>raise the dead</i> after <i>cleanse the lepers</i>.')).toEqual({ kind: 'include', text: 'raise the dead' });
  });

  it('is null for a footnote that is not a CT reading', () => {
    expect(parseFootnote('Literally <i>he did not know her</i>')).toBeNull();
    expect(parseFootnote('CT reverses the order of verses 16 and 17.')).toBeNull();
    expect(parseFootnote('CT does not include verse 4.')).toBeNull();
    expect(parseFootnote('')).toBeNull();
  });
});

// Revelation 17:8's last words as a verse of the chapter file has them: g indexes 0-5, English chunks over them.
const verse = (n: number, chunks: Array<{ t: string; g: number[] }>): Verse => ({ n, g: [], e: chunks });
const V8 = verse(8, [
  { t: 'the beast', g: [0, 1] },
  { t: 'was', g: [2] },
  { t: 'and will come up', g: [3, 4, 5] },
]);
const CT_UNIT: VariantPlace = { v: 8, w: [3], base: 'ἀναβαίνειν', alts: [{ code: 'N', text: 'ἀναβαίνει' }] };
const BYZ_UNIT: VariantPlace = { v: 8, w: [0, 1], base: 'τὸ θηρίον', alts: [{ code: 'B', text: 'θηρίον' }] };
const input = (notes: Array<{ w: number; note: string }>, lampas: LampasEnglishFile = {}) => ({
  book: 'Revelation',
  code: 'rev',
  chapter: 17,
  verses: [V8],
  notes: new Map([[8, notes]]),
  lampas,
});

describe('a CT footnote', () => {
  it('attaches to the unit whose words hold its word, with the MSB’s English of the unit as the base', () => {
    const { units, missing } = layEnglish([CT_UNIT], input([{ w: 3, note: 'CT <i>he is coming up</i>' }]));
    expect(missing).toEqual([]);
    expect(units[0].english).toEqual({ source: 'msb', base: 'and will come up', alts: ['he is coming up'] });
  });

  it('on a reading that leaves the base out ("does not include") gives the base the footnote’s English and the reading nothing', () => {
    const omit: VariantPlace = { v: 8, w: [2], base: 'ἦν', alts: [{ code: 'N', text: '' }] };
    const { units } = layEnglish([omit], input([{ w: 2, note: 'CT does not include <i>was</i>.' }]));
    expect(units[0].english).toEqual({ source: 'msb', base: 'was', alts: [''] });
  });

  it('goes to the narrowest unit that holds its word, and to one unit only', () => {
    const wide: VariantPlace = { v: 8, w: [3, 4, 5], base: 'a b c', alts: [{ code: 'N', text: 'a b' }] };
    const { units } = layEnglish([wide, CT_UNIT], input([{ w: 3, note: 'CT <i>he comes</i>' }]));
    expect(units.map((u) => u.english?.source)).toEqual([undefined, 'msb']);
  });

  it('does not attach to a Byzantine split, nor to a unit with several readings (the footnote speaks for one)', () => {
    const many: VariantPlace = { ...CT_UNIT, alts: [{ code: 'B', text: 'x' }, { code: 'N', text: 'y' }] };
    const { units, missing } = layEnglish([BYZ_UNIT, many], input([{ w: 0, note: 'CT <i>a</i>' }, { w: 3, note: 'CT <i>b</i>' }]));
    expect(units.every((u) => u.english === undefined)).toBe(true);
    expect(missing.map((m) => m.unit.base)).toEqual(['τὸ θηρίον', 'ἀναβαίνειν']);
  });
});

describe('a unit without a footnote', () => {
  const lampas: LampasEnglishFile = { [unitKey('rev', 17, BYZ_UNIT)]: { source: 'lampas', base: 'the beast', alts: ['beast'] } };

  it('takes the data/variant-english.json entry for its key', () => {
    const { units, missing } = layEnglish([BYZ_UNIT], input([], lampas));
    expect(missing).toEqual([]);
    expect(units[0].english).toEqual({ source: 'lampas', base: 'the beast', alts: ['beast'] });
  });

  it('is missing, naming its verse, when the file has no entry, or one of another reading (the key holds a hash of the readings)', () => {
    const changed: VariantPlace = { ...BYZ_UNIT, alts: [{ code: 'B', text: 'θηρίον τὸ' }] };
    const { units, missing } = layEnglish([changed], input([], lampas));
    expect(units[0].english).toBeUndefined();
    expect(missing).toEqual([{ key: unitKey('rev', 17, changed), ref: 'Revelation 17:8', code: 'rev', chapter: 17, unit: changed }]);
  });
});

describe('the English of a unit changing', () => {
  const english = (base: string, ...alts: string[]) => ({ source: 'lampas' as const, base, alts });

  it('is true when the base and a reading differ in their English', () => {
    expect(changesEnglish(english('in the Jordan River', 'in the Jordan'))).toBe(true);
    expect(changesEnglish(english('the beast', 'the beast', 'a beast'))).toBe(true);
    expect(changesEnglish(english('was', ''))).toBe(true);
  });

  it('is false when the English is the same after case, punctuation and white space', () => {
    expect(changesEnglish(english('He said,', 'he  said'))).toBe(false);
    expect(changesEnglish(english('the Lord', 'the lord'))).toBe(false);
    expect(plainEnglish('  Jesus’  Christ! ')).toBe('jesus christ');
  });
});

describe('the witness of a unit', () => {
  const alts = (...codes: VariantCode[]) => codes.map((code) => ({ code }));

  it('is byz for B, na for N, C, S and E, ecm for M', () => {
    expect(witnessOf(alts('B'))).toBe('byz');
    expect(witnessOf(alts('N'))).toBe('na');
    expect(witnessOf(alts('C'))).toBe('na');
    expect(witnessOf(alts('S'))).toBe('na');
    expect(witnessOf(alts('E'))).toBe('na');
    expect(witnessOf(alts('M'))).toBe('ecm');
  });

  it('takes the first class in the order byz, na, ecm when a unit has several codes', () => {
    expect(witnessOf(alts('N', 'B'))).toBe('byz');
    expect(witnessOf(alts('M', 'N'))).toBe('na');
    expect(witnessOf(alts('M', 'C', 'E'))).toBe('na');
    expect(witnessOf(alts('M', 'B'))).toBe('byz');
  });
});

describe('the build', () => {
  const msb = readFileSync('tests/fixtures/data/msb-slice.tsv', 'utf8');
  const lexicon = parseLexicon(readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8'));
  // Revelation 17:8, the one verse of Revelation in the slice: three units, a Byzantine split, an NA reading and a verse the NA leaves out.
  const REV_17_8 =
    '17,8,"Τὸ θηρίον, ὃ εἶδες, ἦν, καὶ οὐκ ἔστιν, καὶ μέλλει ἀναβαίνειν ἐκ τῆς ἀβύσσου, καὶ εἰς ἀπώλειαν ὑπάγειν. {NA ὑπάγειν > ὑπάγει } Καὶ θαυμάσονται {NA θαυμάσονται > θαυμασθήσονται } οἱ κατοικοῦντες ἐπὶ {Byz ἐπὶ τῆς γῆς > τὴν γῆν } τῆς γῆς, ὧν οὐ γέγραπται."';
  const apparatus = new Map([['rev', parseVariantsCsv(`chapter,verse,text\n${REV_17_8}\n`)]]);

  const units = (book: Chapter | undefined): VariantUnit[] => book?.variants ?? [];

  it('fails on a unit with no English, naming the verse', () => {
    expect(() => buildData(msb, lexicon, apparatus)).toThrow(/Revelation 17:8.*no English/);
  });

  it('(not strict) lists the units with no English instead, with their keys', () => {
    const built = buildData(msb, lexicon, apparatus, undefined, { lampas: {}, strict: false });
    expect(built.missingEnglish.map((m) => m.ref)).toEqual(['Revelation 17:8', 'Revelation 17:8', 'Revelation 17:8']);
    expect(built.chapters.find((c) => c.path === 'rev/17.json')?.chapter.variants ?? []).toEqual([]);
  });

  it('gives every unit English of source msb or lampas, changesEnglish and a witness, a footnote’s English first', () => {
    const lines = msb.split('\n');
    const at = lines.findIndex((l) => l.split('\t')[COLUMNS.text] === 'ὑπάγειν');
    expect(at).toBeGreaterThan(0);
    const cells = lines[at].split('\t');
    cells[COLUMNS.footnotes] = 'CT <i>goes away</i>';
    lines[at] = cells.join('\t');
    const probe = buildData(msb, lexicon, apparatus, undefined, { lampas: {}, strict: false });
    const lampas: LampasEnglishFile = Object.fromEntries(
      probe.missingEnglish
        .filter((m) => m.unit.base !== 'ὑπάγειν')
        .map((m) => [m.key, { source: 'lampas' as const, base: `base of ${m.unit.base}`, alts: m.unit.alts.map(() => 'something else') }]),
    );
    const built = buildData(lines.join('\n'), lexicon, apparatus, undefined, { lampas, strict: true });
    const rev = units(built.chapters.find((c) => c.path === 'rev/17.json')?.chapter);
    expect(rev).toHaveLength(3);
    const go = rev.find((u) => u.base === 'ὑπάγειν')!;
    expect(go.english).toEqual({ source: 'msb', base: 'go', alts: ['goes away'] });
    expect(go).toMatchObject({ changesEnglish: true, witness: 'na' });
    expect(rev.map((u) => u.english.source).sort()).toEqual(['lampas', 'lampas', 'msb']);
    expect(rev.every((u) => typeof u.changesEnglish === 'boolean' && ['byz', 'na', 'ecm'].includes(u.witness))).toBe(true);
    expect(englishStats(rev)).toMatchObject({ units: 3, bySource: { msb: 1, lampas: 2 }, changes: 3 });
  });
});

describe('the committed data', () => {
  const books = existsSync('public/data') ? readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && !['ladder'].includes(d.name)) : [];
  const all: Array<{ ref: string; unit: VariantUnit }> = [];
  for (const dir of books) {
    for (const file of readdirSync(`public/data/${dir.name}`)) {
      const chapter = JSON.parse(readFileSync(`public/data/${dir.name}/${file}`, 'utf8')) as Chapter;
      for (const unit of chapter.variants ?? []) all.push({ ref: `${chapter.book} ${chapter.chapter}:${unit.v}`, unit });
    }
  }

  it('has English of source msb or lampas on every unit, a reading’s English for each reading, and no unit without', () => {
    expect(all.length).toBeGreaterThan(7000);
    const bad = all.filter(({ unit }) => !['msb', 'lampas'].includes(unit.english?.source) || unit.english.alts.length !== unit.alts.length);
    expect(bad.map((b) => b.ref)).toEqual([]);
  });

  it('has changesEnglish on every unit and a witness byz, na or ecm that agrees with its codes', () => {
    const bad = all.filter(({ unit }) => typeof unit.changesEnglish !== 'boolean' || unit.witness !== witnessOf(unit.alts) || unit.changesEnglish !== changesEnglish(unit.english));
    expect(bad.map((b) => b.ref)).toEqual([]);
  });

  it('keeps every Lampas-made reading to 0-6 words (0 only for a reading that leaves the base out)', () => {
    const long: string[] = [];
    for (const { ref, unit } of all) {
      if (unit.english.source !== 'lampas') continue;
      const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
      if (words(unit.english.base) < 1 || words(unit.english.base) > 6) long.push(`${ref} base`);
      unit.english.alts.forEach((a, i) => {
        if (words(a) > 6 || (words(a) === 0 && unit.alts[i].text !== '')) long.push(`${ref} alt ${i}`);
      });
    }
    expect(long).toEqual([]);
  });
});

// keep the alignment import honest: the units a footnote attaches to are the ones alignChapter yields
describe('alignChapter units', () => {
  it('are places only: the English is laid after, by layEnglish', () => {
    const rp = parseVariantsCsv('chapter,verse,text\n3,3,"Μνημόνευε οὖν {Byz οὖν > γὰρ } πῶς"\n');
    const r = alignChapter('Revelation', 3, [{ n: 3, words: ['Μνημόνευε', 'οὖν', 'πῶς'] }], rp);
    expect(Object.keys(r.units[0]).sort()).toEqual(['alts', 'base', 'v', 'w']);
  });
});
