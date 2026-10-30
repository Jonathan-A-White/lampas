// scripts/data/variantAlign.ts — the word-by-word pairing of a variant reading's English with its Greek (`VariantEnglish.align`, docs/data.md 'Variant English', mw-9ji6ek0.37).
// A reading's English is one free string and its Greek is the words the build tagged (`VariantReading.g`); the Weave draws a chip word by word like the text, so each
// English word must say which Greek word it is, or none. Deterministic, no model: an English word is paired with a Greek word of the reading when
//   1. (tier 1) it shares its stem with a word of the Greek word's lexicon gloss ('in' with ἐν, whose gloss is 'in/on/among'), or
//   2. (tier 2) it shares its stem with the verse's own English of that same Greek form (the MSB chunk of a verse word with the same letters), a supplied word of the chunk excepted,
// each English word and each Greek word once (a neighbour the same gloss or chunk also has joins the word: 'away from' is ἀπό), the nearest in position first (a word of a reading in another order is paired by its words, not by its place). A word left over stays
// unpaired and is drawn in English: a wrong pairing would put the wrong Greek on the screen, which is worse than none.
import type { Chapter, GreekWord, LexEntry, VariantEnglish, VariantUnit, Verse } from '../../src/data/chapter';
import { letterKey } from './variants';

/** The English words of a reading as the brace draws them: split at white space. */
export const englishTokens = (english: string): string[] => english.split(/\s+/).filter(Boolean);

/** What two spellings of one English word share: its letters, lower case. */
const letters = (token: string): string => token.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** forms of a verb that share no stem with it ('be' and 'were', 'say' and 'said') */
const FORMS: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'], have: ['has', 'had', 'having'], do: ['did', 'done', 'does'], go: ['went', 'gone', 'goes'], come: ['came', 'comes'], see: ['saw', 'seen'],
  give: ['gave', 'given'], take: ['took', 'taken'], say: ['said', 'says'], speak: ['spoke', 'spoken'], know: ['knew', 'known'], find: ['found'], stand: ['stood'], die: ['died'], rise: ['rose', 'risen'],
  write: ['wrote', 'written'], bring: ['brought'], hear: ['heard'], send: ['sent'], eat: ['ate', 'eaten'], drink: ['drank', 'drunk'], sit: ['sat'], lead: ['led'], leave: ['left'], bear: ['bore', 'borne'],
};
const IRREGULAR = new Map<string, string>(Object.entries(FORMS).flatMap(([stem, forms]) => [stem, ...forms].map((f): [string, string] => [f, stem])));

/** Small words of English: they are paired only by the gloss of a small word of Greek (the 'the' of ὁ), never by what the verse's chunk says, and they do not count as a word left over. */
const SMALL = new Set(
  'the a an of to in on at by for with from and or but nor he she it they we i you his her their our my your its him them us me be am is are was were been being have has had will would shall should may might can could not no that this these who which as if so do did does there then about over under upon into through before after between against around toward towards until among also now even only because when while'.split(' '),
);

/** Two English words of one stem: the same word (or a listed form of one verb), or the shorter (4 letters or more) the start of the longer by at most three letters ('Cenchrea' and 'Cenchreae', 'brother' and 'brothers'). */
function sameStem(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if ((IRREGULAR.get(a) ?? a) === (IRREGULAR.get(b) ?? b)) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.length - short.length <= 3 && long.startsWith(short);
}

/** The English words of a lexicon gloss ('in/on/among', 'the/this/who', 'to keep, watch', 'to ascend (aorist ἀνέβην)'): the 'to' of a verb's gloss is left off. */
const glossWords = (gloss: string): string[] => {
  const plain = gloss.replace(/\([^)]*\)/g, ' ').replace(/^\s*to\s+(?=\S+\s*[,/;]?\s*\S)/i, '');
  return plain.split(/[^\p{L}]+/u).map(letters).filter(Boolean);
};

/** The English words the verse's chunks give the Greek words of the verse spelled like `w` (letters only), leaving out the words the translators supplied and the small words of English. */
function chunkWords(verse: Verse | undefined, w: GreekWord): string[] {
  if (!verse) return [];
  const key = letterKey(w.t);
  const out: string[] = [];
  for (const v of verse.g) {
    if (letterKey(v.t) !== key || v.e === undefined) continue;
    const chunk = verse.e[v.e];
    if (!chunk) continue;
    const supplied = new Set(Array.isArray(chunk.s) ? chunk.s : []);
    englishTokens(chunk.t).forEach((token, k) => {
      if (!supplied.has(k)) out.push(letters(token));
    });
  }
  return out.filter((x) => x && !SMALL.has(x));
}

/** A Greek word that is a small word of its language (the article, a conjunction, a preposition, a particle): it is paired by its gloss only, never as the one word left over. */
const FUNCTION_WORD = /^(?:T|CONJ|PREP|PRT|COND|ADV|INJ)\b/;

/**
 * For each English word of `english` (englishTokens), the index of the Greek word of `g` it is, or null. A Greek word is paired with one English word, or with the run of
 * neighbouring words of the verse's chunk for it ('went up' for ἀνέβη: both point at it). The one content word of English left over with the one Greek word left over (a name or a form the
 * lexicon has no gloss for: 'Prisca', Πρίσκα) are each other's.
 */
export function alignReading(english: string, g: readonly GreekWord[], verse: Verse | undefined, lex: Readonly<Record<string, LexEntry>>): Array<number | null> {
  const tokens = englishTokens(english).map(letters);
  const out: Array<number | null> = tokens.map(() => null);
  const greek = g.map((w) => letterKey(w.t));
  const gloss = g.map((w) => glossWords(lex[w.s]?.g ?? ''));
  const chunk = g.map((w) => chunkWords(verse, w));
  const edges: Array<{ e: number; g: number; tier: number; dist: number }> = [];
  g.forEach((_, gi) => {
    if (!greek[gi]) return;
    tokens.forEach((token, ei) => {
      if (!token) return;
      const tier = gloss[gi].some((x) => sameStem(token, x)) ? 1 : !SMALL.has(token) && chunk[gi].some((x) => sameStem(token, x)) ? 2 : 0;
      if (tier) edges.push({ e: ei, g: gi, tier, dist: Math.abs(ei / tokens.length - gi / g.length) });
    });
  });
  edges.sort((a, b) => a.tier - b.tier || a.dist - b.dist || a.g - b.g || a.e - b.e);
  const taken = new Set<number>();
  for (const edge of edges) {
    if (out[edge.e] !== null || taken.has(edge.g)) continue;
    out[edge.e] = edge.g;
    taken.add(edge.g);
  }
  // the words beside a paired word that its gloss or the verse's chunk for that Greek word also has join it ('went' beside 'up', 'from' beside 'away')
  for (let again = true; again; ) {
    again = false;
    tokens.forEach((token, ei) => {
      if (out[ei] !== null || !token) return;
      for (const near of [ei - 1, ei + 1]) {
        const gi = out[near];
        if (gi !== null && gi !== undefined && (gloss[gi].some((x) => sameStem(token, x)) || (!SMALL.has(token) && chunk[gi].some((x) => sameStem(token, x))))) {
          out[ei] = gi;
          again = true;
          return;
        }
      }
    });
  }
  // one content word of English and one Greek word left over, in a reading of any length: they are each other's
  const loose = tokens.flatMap((token, ei) => (out[ei] === null && token && !SMALL.has(token) ? [ei] : []));
  const left = g.flatMap((_, gi) => (greek[gi] && !taken.has(gi) ? [gi] : []));
  if (loose.length === 1 && left.length === 1 && !gloss[left[0]].length && !FUNCTION_WORD.test(g[left[0]].p)) out[loose[0]] = left[0];
  return out;
}

/** The pairing of every reading of a unit's English, in the order of `unit.alts` ([] for a reading with no words of its own or no tagged Greek). */
export function alignUnit(unit: Pick<VariantUnit, 'alts'> & { v: number; english: VariantEnglish }, verse: Verse | undefined, lex: Readonly<Record<string, LexEntry>>): Array<Array<number | null>> {
  return unit.alts.map((alt, i) => (alt.g?.length ? alignReading(unit.english.alts[i] ?? '', alt.g, verse, lex) : []));
}

/** Lays the pairing on every unit of `chapter` (after the readings' words are tagged); true when a unit's pairing changed. */
export function layAlign(chapter: Pick<Chapter, 'variants' | 'verses' | 'lex'>): boolean {
  let changed = false;
  for (const unit of chapter.variants ?? []) {
    const align = alignUnit(unit, chapter.verses.find((v) => v.n === unit.v), chapter.lex);
    if (JSON.stringify(unit.english.align) === JSON.stringify(align)) continue;
    unit.english.align = align;
    changed = true;
  }
  return changed;
}

/** How completely the readings of `units` are paired, by the source of their English: `full` every English word paired, `partly` some, `none` none (a reading with no English is not counted). */
export interface AlignStats {
  full: number;
  partly: number;
  none: number;
}
export const alignStats = (units: readonly VariantUnit[]): Record<VariantEnglish['source'], AlignStats> => {
  const stats: Record<VariantEnglish['source'], AlignStats> = { msb: { full: 0, partly: 0, none: 0 }, lampas: { full: 0, partly: 0, none: 0 } };
  for (const u of units) {
    u.english.alts.forEach((english, i) => {
      const n = englishTokens(english).length;
      if (!n) return;
      const paired = (u.english.align?.[i] ?? []).filter((x) => x !== null).length;
      stats[u.english.source][paired === 0 ? 'none' : paired === n ? 'full' : 'partly']++;
    });
  }
  return stats;
};
