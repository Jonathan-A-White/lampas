// scripts/lxx/tagnt.ts — STEPBible's TAGNT (CC BY 4.0) as the form index of layer 1 (docs/lxx-derivation.md, 'Layer 1').
// TAGNT gives every word of the Greek New Testament a row: 'Jhn.1.1#02=NKO\tἀρχῇ (archē)\tbeginning\tG0746=N-DSF\tἀρχή=beginning\tNA28+...'.
// The index maps a form, as keyOf in swete.ts writes it (lower case, grave as acute, an enclitic's second accent dropped, NFC), to each
// (lemma, parsing) the New Testament gives it and how often; a second map does the same with every mark dropped, for Swete's capitals.
import { bareOf, keyOf } from './swete';

export interface TagntRow {
  /** TAGNT's book, as it writes it ('Jhn', '1Co') */
  book: string;
  chapter: number;
  verse: number;
  /** TAGNT's number of the word in its verse (the #02 of Jhn.1.1#02); unique among the NA28 words of a verse */
  word: number;
  /** TAGNT's edition code after the '=' ('NKO', 'N(k)O', 'k'): which editions have the word; an N, capital or lower case (bracketed), is NA28 */
  editions: string;
  form: string;
  /** NFC */
  lemma: string;
  /** TAGNT's code, a noun's semantic tags dropped (N-NSM-T -> N-NSM) */
  morph: string;
  /** TAGNT tags the word a proper name: a person or a place (N-NSM-P, N-GSF-L), or a title whose lemma it writes with a capital (Χριστός, N-NSM-T) */
  name: boolean;
}

/** Strips TAGNT's semantic tags from a noun (N-NSM-T -> N-NSM, N-GSF-L -> N-GSF): they say what a name refers to, not how it is inflected. */
export function normMorph(morph: string): string {
  return morph.startsWith('N-') ? morph.split('-').slice(0, 2).join('-') : morph;
}

/**
 * Whether TAGNT's row makes the word a proper name (the agreement check's name rule, agreement.ts): a person or a place (-P, -L), or a title (-T) whose
 * lemma is written with a capital. TAGNT tags every θεός and κύριος a title too: those are common nouns Swete writes in lower case, and stay in layer 1.
 */
export const isName = (morph: string, lemma: string): boolean => {
  if (!morph.startsWith('N-')) return false;
  const tag = morph.split('-')[2] ?? '';
  return tag === 'P' || tag === 'L' || (tag === 'T' && lemma !== lemma.toLowerCase());
};

const ROW = /^([1-3A-Z][A-Za-z]{2})\.(\d+)\.(\d+)#(\d+)=(\S+)\t/;

/** Whether NA28 has the word (the probe's known-answer words): an N in the edition code, capital or lower case (the edition has it in brackets). */
export const inNa28 = (row: Pick<TagntRow, 'editions'>): boolean => /n/i.test(row.editions);

/** Every word row of the TAGNT files; header and note lines are skipped. With `hide` ('jhn', any case), that book's rows are left out. */
export function readTagnt(texts: readonly string[], hide?: string): TagntRow[] {
  const hidden = hide?.toLowerCase();
  const rows: TagntRow[] = [];
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const m = ROW.exec(line);
      if (!m) continue;
      if (hidden && m[1].toLowerCase() === hidden) continue;
      const c = line.split('\t');
      const form = (c[1] ?? '').split(' (')[0].trim();
      const grammar = (c[3] ?? '').split('=')[1]?.trim();
      const lemma = (c[4] ?? '').split('=')[0].trim();
      if (!form || !grammar || !lemma) continue;
      rows.push({ book: m[1], chapter: Number(m[2]), verse: Number(m[3]), word: Number(m[4]), editions: m[5], form, lemma: lemma.normalize('NFC'), morph: normMorph(grammar), name: isName(grammar, lemma) });
    }
  }
  return rows;
}

/** One analysis of a form: its lemma, its parsing, how many New Testament words have it, and its share of the form's words. */
export interface Analysis {
  lemma: string;
  morph: string;
  support: number;
  share: number;
}

type Counts = Map<string, number>;

export interface FormIndex {
  /** keyOf(form) -> 'lemma|morph' -> count */
  byKey: Map<string, Counts>;
  /** bareOf(form) -> 'lemma|morph' -> count */
  byBare: Map<string, Counts>;
  /** every keyOf(form) whose New Testament words are all tagged proper names (Χλόης, 1 Cor 1:11) */
  names: Set<string>;
  /** how many rows went in */
  rows: number;
}

export function formIndex(rows: readonly TagntRow[]): FormIndex {
  const byKey = new Map<string, Counts>();
  const byBare = new Map<string, Counts>();
  const add = (map: Map<string, Counts>, key: string, analysis: string): void => {
    let counts = map.get(key);
    if (!counts) map.set(key, (counts = new Map()));
    counts.set(analysis, (counts.get(analysis) ?? 0) + 1);
  };
  const names = new Set<string>();
  const common = new Set<string>();
  for (const row of rows) {
    const analysis = `${row.lemma}|${row.morph}`;
    const key = keyOf(row.form);
    add(byKey, key, analysis);
    add(byBare, bareOf(row.form), analysis);
    (row.name ? names : common).add(key);
  }
  for (const key of common) names.delete(key);
  return { byKey, byBare, names, rows: rows.length };
}

const byCode = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A form's analyses, the most frequent first (then by lemma and parsing, so the order never depends on the files' order). */
export function analysesOf(counts: Counts): Analysis[] {
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  return [...counts]
    .map(([k, support]) => {
      const [lemma, morph] = k.split('|');
      return { lemma, morph, support, share: support / total };
    })
    .sort((a, b) => b.support - a.support || byCode(a.lemma, b.lemma) || byCode(a.morph, b.morph));
}

/** Layer 1 takes a form's first analysis when it is the only one, or when it has at least 95% of 20 or more New Testament words. */
export const DOMINANT = 0.95;
export const DOMINANT_MIN = 20;

export interface Settled {
  analysis: Analysis;
  confidence: number;
}

const round = (x: number): number => Math.round(x * 100) / 100;

/**
 * Whether layer 1 settles a form with these analyses, and how sure it is: 0.97 for one analysis seen three times or more, 0.90 for one seen
 * once or twice, the share x 0.97 for a dominant one. Undefined when the candidates stay for a later layer.
 */
export function settle(analyses: readonly Analysis[]): Settled | undefined {
  const top = analyses[0];
  if (!top) return undefined;
  const total = analyses.reduce((s, a) => s + a.support, 0);
  if (analyses.length === 1) return { analysis: top, confidence: total >= 3 ? 0.97 : 0.9 };
  if (top.share >= DOMINANT && total >= DOMINANT_MIN) return { analysis: top, confidence: round(top.share * 0.97) };
  return undefined;
}
