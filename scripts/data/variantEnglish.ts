// scripts/data/variantEnglish.ts — the English of every variant unit (docs/data.md 'Variant English', mw-9ji6ek0.3). Two sources:
// the MSB's own footnote on a word of the unit ('CT <i>King Herod</i>': what the critical text reads there), and data/variant-english.json,
// which `npm run variants:english` fills with English made by the tutor's model. A unit with neither stops the build, naming the verse.
// Also the two things a reader filters units by: whether the English changes, and whose reading the unit is.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { LexEntry, VariantCode, VariantEnglish, VariantEnglishSource, VariantPlace, VariantUnit, VariantWitness, Verse } from '../../src/data/chapter';
import { plainEnglish, sameInVerse, wordOrderOnly } from '../../src/data/variantVerse';
import type { PlacedUnit } from './rp2026';
import { alignUnit } from './variantAlign';

export { plainEnglish };

/** where the English made by the model is committed */
export const VARIANT_ENGLISH_FILE = 'data/variant-english.json';

/** One entry of data/variant-english.json: the base and each reading in English, the same order as the unit's alts. */
export interface LampasEnglish {
  source: 'lampas';
  base: string;
  alts: string[];
}
export type LampasEnglishFile = Record<string, LampasEnglish>;

export function readLampasEnglish(path: string = VARIANT_ENGLISH_FILE): LampasEnglishFile {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as LampasEnglishFile) : {};
}

// ---------------------------------------------------------------- the MSB footnote

export interface Footnote {
  /** 'does not include <i>X</i>': the CT leaves X out; 'includes <i>X</i>': the CT has X the MSB lacks; otherwise the CT reads X where the MSB reads its own words */
  kind: 'replace' | 'omit' | 'include';
  /** the English in the footnote's first <i>…</i> */
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string): string =>
  s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (all, dec: string, hex: string, name: string) =>
    dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : (ENTITIES[name.toLowerCase()] ?? all),
  );

/**
 * What a footnote of the MSB table says about the critical text, or null for one that is not about a reading ('CT reverses the order of
 * verses 16 and 17', a note on the Greek, 'Literally …'). Only the first <i>…</i> is read: later ones are other witnesses (`; GOC and TR <i>…</i>`)
 * or other renderings (`or <i>…</i>`).
 */
export function parseFootnote(note: string): Footnote | null {
  if (!/^CT\b/.test(note)) return null;
  const m = /<i>(.*?)<\/i>/s.exec(note);
  if (!m) return null;
  const before = note.slice(0, m.index);
  const text = decode(m[1].replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:]+$/, '')
    .trim();
  if (!text) return null;
  const kind = /\b(?:do|does) not include\b/.test(before) ? 'omit' : /\bincludes?\b/.test(before) ? 'include' : 'replace';
  return { kind, text };
}

/** A footnote of the table on one word of a verse: the word's place among the verse's `g`. */
export interface WordNote {
  w: number;
  note: string;
}

/** The English of the MSB chunks that hold the unit's words, in English order, joined: the MSB's English for the base. */
function chunkEnglish(verse: Verse | undefined, unit: VariantPlace): string {
  if (!verse) return '';
  const words = new Set(unit.w);
  return verse.e
    .filter((c) => c.g.some((i) => words.has(i)))
    .map((c) => c.t)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- the units' English

/** A short stable name for a unit: its book, place, words and readings, so a changed apparatus makes a stale entry rather than a wrong one. */
export function unitKey(code: string, chapter: number, unit: VariantPlace): string {
  const hash = createHash('sha256')
    .update([unit.base, ...unit.alts.map((a) => `${a.code}:${a.text}`)].join('\n'))
    .digest('hex')
    .slice(0, 8);
  return `${code} ${chapter}:${unit.v} w${unit.w[0]}-${unit.w[unit.w.length - 1]} ${hash}`;
}

/** A unit the build found no English for, for `npm run variants:english` to render (also: a unit that took an entry of data/variant-english.json). */
export interface MissingEnglish {
  key: string;
  ref: string;
  /** the chapter's book code and number, to find its verse */
  code: string;
  chapter: number;
  unit: PlacedUnit;
}

export interface EnglishInput {
  /** the book's name and code, and the chapter, for the reference and the key */
  book: string;
  code: string;
  chapter: number;
  verses: Verse[];
  /** the MSB footnotes of each verse (by its number) */
  notes: Map<number, WordNote[]>;
  lampas: LampasEnglishFile;
}

/**
 * Lays English on a chapter's units. A unit with one other reading that the critical text holds (not a Byzantine split) takes the English of the
 * MSB footnote on its words when there is one ('CT <i>King Herod</i>': the CT's reading is "King Herod", the base's is the MSB's own English of the
 * unit's words; 'CT does not include <i>X</i>' on a reading that leaves the base out: the base is X, the reading nothing; 'CT <i>they all</i>' on a unit the CT leaves out is kept as `ctReads`, the reading's English stays nothing); a footnote that is
 * about a whole unit goes to the narrowest unit that holds its word. Every other unit takes its entry of data/variant-english.json, and a unit
 * with no entry is returned in `missing`.
 */
export function layEnglish(units: VariantPlace[], input: EnglishInput): { units: PlacedUnit[]; missing: MissingEnglish[]; used: MissingEnglish[] } {
  const verse = new Map(input.verses.map((v) => [v.n, v]));
  const given = new Map<VariantPlace, VariantEnglish>();
  const usable = (u: VariantPlace): boolean => u.alts.length === 1 && u.alts[0].code !== 'B';
  for (const [n, list] of input.notes) {
    for (const { w, note } of list) {
      const fn = parseFootnote(note);
      if (!fn) continue;
      const here = units
        .filter((u) => u.v === n && u.w.includes(w) && usable(u) && !given.has(u))
        .filter((u) => (fn.kind === 'omit' ? u.alts[0].text === '' : fn.kind === 'replace'))
        .sort((a, b) => a.w.length - b.w.length || a.w[0] - b.w[0]);
      const unit = here[0];
      if (!unit) continue;
      const base = fn.kind === 'omit' ? fn.text : chunkEnglish(verse.get(unit.v), unit);
      // A 'replace' footnote is the MSB's English of the critical text's sentence, not of a reading of this unit: where the unit's reading is nothing (an omission) it is kept apart as `ctReads`, never as the reading's own English (mw-9ji6ek0.36)
      if (fn.kind === 'replace' && unit.alts[0].text === '') given.set(unit, { source: 'msb', base, alts: [''], ctReads: fn.text });
      else given.set(unit, { source: 'msb', base, alts: [fn.kind === 'omit' ? '' : fn.text] });
    }
  }
  const missing: MissingEnglish[] = [];
  const used: MissingEnglish[] = [];
  const out = units.map((unit): PlacedUnit => {
    const english = given.get(unit);
    if (english) return { ...unit, english };
    const key = unitKey(input.code, input.chapter, unit);
    const made = input.lampas[key];
    if (made && made.alts.length === unit.alts.length) {
      const placed: PlacedUnit = { ...unit, english: { source: 'lampas', base: made.base, alts: made.alts } };
      used.push({ key, ref: `${input.book} ${input.chapter}:${unit.v}`, code: input.code, chapter: input.chapter, unit: placed });
      return placed;
    }
    const placed: PlacedUnit = { ...unit };
    missing.push({ key, ref: `${input.book} ${input.chapter}:${unit.v}`, code: input.code, chapter: input.chapter, unit: placed });
    return placed;
  });
  return { units: out, missing, used };
}

/**
 * Whether any reading of a unit changes the English. With the unit's verse and word places the compare is in the verse (src/data/variantVerse.ts): a reading
 * whose snippet differs ('that' / 'that I') but whose verse reads the same ('… that I love you') does not change it; without them, the snippets alone. With the unit's Greek (`greek`),
 * a reading that is the base's words in another order (wordOrderOnly) does not change it either (mw-9ji6ek0.31).
 */
export function changesEnglish(english: VariantEnglish, verse?: Pick<Verse, 'e'>, unitWords: readonly number[] = [], greek?: Pick<VariantUnit, 'base' | 'alts'>): boolean {
  return english.alts.some((alt, i) => !(greek && greek.alts[i] && wordOrderOnly(greek.base, greek.alts[i].text)) && !sameInVerse(verse, unitWords, english.base, alt));
}

const WITNESS: Record<VariantCode, VariantWitness> = { B: 'byz', N: 'na', C: 'na', S: 'na', E: 'na', M: 'ecm' };
const WITNESS_ORDER: readonly VariantWitness[] = ['byz', 'na', 'ecm'];

/** Whose reading the unit is: the first class, in the order byz, na, ecm, any of its codes belongs to. */
export function witnessOf(alts: ReadonlyArray<{ code: VariantCode }>): VariantWitness {
  const classes = new Set(alts.map((a) => WITNESS[a.code]));
  return WITNESS_ORDER.find((w) => classes.has(w)) ?? 'byz';
}

/** A unit with its English laid, as a chapter file keeps it (`verse` is the unit's, for changesEnglish and the pairing of its words, `lex` the chapter's lexicon for the pairing, mw-9ji6ek0.37). */
export function finishUnit(unit: PlacedUnit & { english: VariantEnglish }, verse?: Verse, lex: Readonly<Record<string, LexEntry>> = {}): VariantUnit {
  const english: VariantEnglish = { ...unit.english, align: alignUnit({ ...unit, english: unit.english }, verse, lex) };
  return { v: unit.v, w: unit.w, base: unit.base, alts: unit.alts, english, changesEnglish: changesEnglish(english, verse, unit.w, unit), witness: witnessOf(unit.alts) };
}

// ---------------------------------------------------------------- what the build prints

export interface EnglishStats {
  units: number;
  bySource: Record<VariantEnglishSource, number>;
  changes: number;
  byWitness: Record<VariantWitness, number>;
}

export function englishStats(units: readonly VariantUnit[]): EnglishStats {
  const stats: EnglishStats = { units: units.length, bySource: { msb: 0, lampas: 0 }, changes: 0, byWitness: { byz: 0, na: 0, ecm: 0 } };
  for (const u of units) {
    stats.bySource[u.english.source]++;
    if (u.changesEnglish) stats.changes++;
    stats.byWitness[u.witness]++;
  }
  return stats;
}

export const englishReport = (s: EnglishStats): string[] => [
  `variant English: ${s.units} units: msb ${s.bySource.msb}, lampas ${s.bySource.lampas}`,
  `variants that change the English: ${s.changes} of ${s.units}`,
  `variant witness: byz ${s.byWitness.byz}, na ${s.byWitness.na}, ecm ${s.byWitness.ecm}`,
];
