// scripts/data/variantAlign.ts — the English of a variant reading, word by word, paired to the Greek words of the reading (mw-9ji6ek0.37, docs/data.md 'Variant English').
// The Reader weaves a brace's English as it weaves the text: a word whose Greek the reader has solid stands in Greek. That needs to know which Greek word each English word is, and a reading's
// English is one free string (`english.alts[i]`). The pairing is made once at build time, by no model and with no network: from the text itself, every chunk of the MSB's English that
// renders one to three Greek words says what those words are in English ('in' for ἐν, 'head' for κεφαλή), and an English word of a reading is paired to the unpaired Greek word of the reading
// whose lemma says it best. A word that no Greek word says (the 'might' of a subjunctive, the 'of' of a genitive) is left null and stays English in the weave.
import { ownEnglish, type Chapter, type GreekWord, type VariantUnit } from '../../src/data/chapter';

/** An English word as the pairing compares it: lower case, letters only. */
const norm = (token: string): string => token.toLowerCase().replace(/[^\p{L}]+/gu, '');

/** The tokens of a reading's English as the brace draws them: split at white space, a mark with no letter kept (it pairs to nothing). */
export const englishTokens = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** How well two English words are one: 1 for the same, 0.8 for the same stem (sail, sailed; Cenchrea, Cenchreae) or a plural (son, sons), else 0. */
function likeness(a: string, b: string): number {
  if (a === b) return 1;
  const n = Math.min(a.length, b.length);
  if (n >= 3 && (a === `${b}s` || b === `${a}s`)) return 0.8;
  if (n < 4) return 0;
  let k = 0;
  while (k < n && a[k] === b[k]) k++;
  return k >= Math.max(4, Math.ceil(0.75 * n)) ? 0.8 : 0;
}

/** What the text says each lemma is in English: lemma -> English word -> weight, and the lemma's own total weight. */
export interface AlignIndex {
  said: Map<string, Map<string, number>>;
  total: Map<string, number>;
}

const lemmaOf = (w: GreekWord): string => w.l.normalize('NFC');

/** The index of `chapters`' chunks that render one to three Greek words: each English word of such a chunk counts for each of its Greek lemmas, 1 over the number of words. */
export function alignIndex(chapters: readonly Chapter[]): AlignIndex {
  const index: AlignIndex = { said: new Map(), total: new Map() };
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const chunk of verse.e) {
        if (chunk.g.length < 1 || chunk.g.length > 3) continue;
        const lemmas = chunk.g.map((i) => verse.g[i]).filter((w): w is GreekWord => w !== undefined && w.l !== '').map(lemmaOf);
        const tokens = englishTokens(ownEnglish(chunk)).map(norm).filter(Boolean);
        if (!lemmas.length || !tokens.length) continue;
        const weight = 1 / chunk.g.length;
        for (const l of lemmas) {
          index.total.set(l, (index.total.get(l) ?? 0) + weight);
          const said = index.said.get(l) ?? new Map<string, number>();
          index.said.set(l, said);
          for (const t of new Set(tokens)) said.set(t, (said.get(t) ?? 0) + weight);
        }
      }
    }
  }
  return index;
}

/** The weakest score that pairs an English word to a Greek one. */
const FLOOR = 0.15;

/** How well Greek word `w` (whose gloss in the chapter's lexicon is `gloss`) says English word `token` (already normalised): the share of the text's chunks of its lemma that say it, or the gloss. */
function score(index: AlignIndex, w: GreekWord, gloss: string, token: string): number {
  const total = index.total.get(lemmaOf(w));
  let best = 0;
  if (total) for (const [said, weight] of index.said.get(lemmaOf(w)) ?? []) best = Math.max(best, likeness(token, said) * (weight / total));
  for (const g of gloss.split(/\s+/).map(norm).filter(Boolean)) best = Math.max(best, likeness(token, g) * 0.6);
  return best;
}

/**
 * The pairing of one reading: for each token of `english` (split at white space), the index into `g` of the Greek word it renders, or null. One to one; the best pairs first, and between
 * equals the pair nearest in position. A reading with no words (or no English) pairs to nothing: [].
 */
export function alignReading(english: string, g: readonly GreekWord[], gloss: (w: GreekWord) => string, index: AlignIndex): (number | null)[] {
  const tokens = englishTokens(english);
  if (!g.length || !tokens.length) return [];
  const pairs: Array<{ t: number; w: number; score: number; near: number }> = [];
  tokens.forEach((token, t) => {
    const key = norm(token);
    if (!key) return;
    g.forEach((w, k) => {
      if (w.l === '') return;
      const s = score(index, w, gloss(w), key);
      if (s >= FLOOR) pairs.push({ t, w: k, score: s, near: Math.abs(t / tokens.length - k / g.length) });
    });
  });
  pairs.sort((a, b) => b.score - a.score || a.near - b.near || a.t - b.t);
  const out: (number | null)[] = tokens.map(() => null);
  const taken = new Set<number>();
  for (const p of pairs) {
    if (out[p.t] !== null || taken.has(p.w)) continue;
    out[p.t] = p.w;
    taken.add(p.w);
  }
  return out.some((x) => x !== null) ? out : [];
}

/** How a reading is paired: every word of its English (those with a letter) to a Greek word, some, or none. */
export type Pairing = 'full' | 'partly' | 'none';

export function pairingOf(english: string, align: readonly (number | null)[] | undefined): Pairing {
  const letters = englishTokens(english).flatMap((t, i) => (norm(t) ? [i] : []));
  const paired = letters.filter((i) => align?.[i] !== undefined && align[i] !== null).length;
  return paired === 0 ? 'none' : paired === letters.length ? 'full' : 'partly';
}

/** What laying the pairing counted, by the unit's English source. */
export interface AlignTally {
  msb: Record<Pairing, number>;
  lampas: Record<Pairing, number>;
}

/** Lays `english.align` on every unit of `chapters` (their readings tagged: VariantReading.g), in place, and counts how well the readings are paired. A unit whose reading has no words keeps `[]` there. */
export function alignUnits(chapters: readonly Chapter[], index: AlignIndex = alignIndex(chapters)): AlignTally {
  const tally: AlignTally = { msb: { full: 0, partly: 0, none: 0 }, lampas: { full: 0, partly: 0, none: 0 } };
  for (const chapter of chapters) {
    for (const unit of (chapter.variants ?? []) as VariantUnit[]) {
      const gloss = (w: GreekWord): string => chapter.lex[w.s]?.g ?? '';
      const align = unit.alts.map((alt, i) => alignReading(unit.english.alts[i] ?? '', alt.g ?? [], gloss, index));
      unit.english = { ...unit.english, align };
      unit.alts.forEach((alt, i) => {
        if (alt.text !== '') tally[unit.english.source][pairingOf(unit.english.alts[i] ?? '', align[i])]++;
      });
    }
  }
  return tally;
}

export const alignReport = (t: AlignTally): string[] =>
  (['msb', 'lampas'] as const).map((s) => `variant English paired word by word (${s}): ${t[s].full} readings fully, ${t[s].partly} partly, ${t[s].none} not at all`);
