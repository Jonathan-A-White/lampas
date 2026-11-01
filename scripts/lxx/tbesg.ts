// scripts/lxx/tbesg.ts — STEPBible's TBESG (CC BY 4.0) as the parser's list of lemmas (docs/lxx-derivation.md, 'Layer 2').
// TBESG gives each Strong's number a row: 'G0746\tG0746 =\tG0746\tἀρχή\tarchē\tG:N-F\tbeginning\t...'. The fourth column is the lemma, the sixth its
// part of speech and, for a noun, its gender ('G:N-F', 'G:V', 'G:A / G:ADV', 'N:N-M-P' for a name). The parser proposes only a lemma that is here, as
// one word, and only a parsing that fits what the row says of it.
import { STEP } from './sources';
import { bareOf } from './swete';

/** The pinned TBESG file, one of STEPBible's (sources.ts). */
export const TBESG_FILE = STEP.files[2];

export interface LexEntry {
  /** NFC */
  lemma: string;
  /** TBESG's part of speech as written ('G:N-F'), or '' when the row gives none */
  pos: string;
}

/** bareOf(lemma) -> every one-word lemma TBESG has with those letters */
export type Lexicon = Map<string, LexEntry[]>;

const ROW = /^G\d{4,5}[A-Za-z]?\t/;

/** Every one-word lemma of the TBESG file, keyed by its bare letters; a lemma written with a space is left out. */
export function readTbesg(text: string): Lexicon {
  const byBare: Lexicon = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!ROW.test(line)) continue;
    const c = line.split('\t');
    const lemma = (c[3] ?? '').trim().normalize('NFC');
    if (!lemma || /\s/.test(lemma)) continue;
    const key = bareOf(lemma);
    let entries = byBare.get(key);
    if (!entries) byBare.set(key, (entries = []));
    entries.push({ lemma, pos: (c[5] ?? '').trim() });
  }
  return byBare;
}

/** How many lemmas the lexicon holds (a lemma on two rows counts twice, as the probe counted it). */
export const lemmaCount = (lexicon: Lexicon): number => [...lexicon.values()].reduce((n, es) => n + es.length, 0);

/** A parsing's part of speech: 'N-ASF' -> 'N', 'V-AAI-3S' -> 'V', 'PREP' -> 'PREP'. */
export const posOf = (morph: string): string => morph.split('-')[0];

/** What the New Testament shows a lemma as: its part of speech, and a noun's gender ('N:F'); an indeclinable noun (N-PRI) is 'N'. */
export const posKey = (morph: string): string => (morph.startsWith('N-') && morph !== 'N-PRI' ? `N:${morph.split('-')[1].slice(-1)}` : posOf(morph));

/**
 * Whether a parsing fits a lemma. When the New Testament has the lemma with this part of speech (and, for a noun, this gender) it fits. Otherwise TBESG
 * decides: a noun's gender must be one its row gives ('N-M/F'; none given, or an indeclinable N-PRI parsing, fits any), an adjective's row ('A') takes an
 * adjective or an adverb, any other part of speech must match. A lemma TBESG gives no part of speech fits a parsing whose part of speech the New Testament
 * shows it with, or any parsing when the New Testament does not have it.
 */
export function fits(morph: string, entries: readonly LexEntry[], ntPos: ReadonlySet<string> | undefined): boolean {
  const p = posOf(morph);
  if (ntPos?.has(posKey(morph))) return true;
  if (entries.length === 0 || entries.every((e) => !e.pos)) return !ntPos || [...ntPos].some((k) => k.split(':')[0] === p);
  return entries.some(({ pos }) => {
    if (!pos) return true;
    return pos
      .replace(/^[GN]:/, '')
      .split(' / ')
      .some((one) => {
        const [lp, lg] = one.split('-');
        if (lp === 'N' && p === 'N') {
          if (!lg || morph === 'N-PRI') return true;
          return lg.split('/').includes(morph.split('-')[1]?.slice(-1) ?? '');
        }
        if (lp === 'A') return p === 'A' || p === 'ADV';
        return lp === p;
      });
  });
}
