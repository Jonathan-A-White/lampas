// scripts/data/drillAnswers.ts — the answer a drill gives for a Greek word (mw-5r3p30.1000, docs/data.md 'Drill answers'). TBESG's gloss is one thin word for
// half the lexicon ('woman') and his seed list's is up to five ('man, mankind, person, people, human being'); neither is what a learner can hold. The rule:
// a drill answer gives at most MAX_MEANINGS meanings, the commonest first, and a meaning only when the MSB's English uses it for at least SHARE_LINE of the
// word's uses, counted on the Greek-English alignment already in the chapters. Where the alignment cannot settle it TBESG's gloss stays (capped at the same
// three), and a hand reading of the commonest words may correct the result (drill-corrections.ts, each with its reason).
import { ownEnglish, type Chapter } from '../../src/data/chapter';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { meaningsOf, shareMeaning, stemsOf } from '../../src/data/meanings';

/** THE line: a meaning is in a drill answer only when the MSB's English uses it for at least this share of the word's aligned uses (about 15 percent). */
export const SHARE_LINE = 0.15;
/** The most meanings an answer gives. */
export const MAX_MEANINGS = 3;
/** Fewer aligned uses than this cannot settle a word: TBESG's gloss stays. */
export const MIN_USES = 8;
/** When the possible meanings explain fewer than this share of the aligned uses, the English is something else (a pronoun's many forms): TBESG's gloss stays. */
export const MIN_COVERAGE = 0.5;

export type DrillSource = 'alignment' | 'tbesg' | 'correction';

/** What the build knew of one lemma: [meaning, uses of it] in the order of the answer, and the uses the alignment gave. */
export interface LemmaDrill {
  source: DrillSource;
  /** the uses with a chunk of English of the word's own */
  uses: number;
  /** the meanings at or over the line, commonest first, with the uses that gave each */
  meanings: [string, number][];
  /** every other meaning that was looked for and its uses, commonest first, when below the line */
  below?: [string, number][];
  /** the uses that one of the looked-for meanings explains */
  covered?: number;
  answer: string;
  /** why TBESG's gloss stayed ('few uses', 'unsettled'), or the reason of a hand correction */
  reason?: string;
}

export interface DrillReport {
  line: number;
  cap: number;
  lemmas: Record<string, LemmaDrill>;
}

export interface Correction {
  answer: string;
  reason: string;
}

export interface DrillInputs {
  chapters: readonly Chapter[];
  lexicon: LemmaLexicon;
  /** the other meanings TBESG gives a Strong's number ('soul: life' on a second line gives 'life') */
  senses?: (strongs: string) => string[];
  /** his seed list's gloss by lemma: more meanings to look for, never changed */
  seeds?: ReadonlyMap<string, string>;
  corrections?: Readonly<Record<string, Correction>>;
}

interface Candidate {
  /** the meaning as it is shown ('wife'), without a verb's 'to' */
  text: string;
  stems: string[];
}

const NOTE = /\s*\([^)]*\)\s*$/;

/** TBESG's gloss held to the cap: its first MAX_MEANINGS meanings, unchanged when it has no more. */
export function cappedGloss(gloss: string): string {
  if (meaningsOf(gloss).length <= MAX_MEANINGS) return gloss;
  const note = NOTE.exec(gloss)?.[0].trim();
  const pieces = gloss.replace(NOTE, '').split(/\s*[,;/]\s*/).filter((p) => p !== '');
  return `${pieces.slice(0, MAX_MEANINGS).join(', ')}${note ? ` ${note}` : ''}`;
}

function candidatesOf(gloss: string, senses: readonly string[], seed: string | undefined): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const meaning of [...meaningsOf(gloss), ...senses.flatMap(meaningsOf), ...(seed ? meaningsOf(seed) : [])]) {
    const key = shareMeaning(meaning);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    out.push({ text: meaning.replace(/^to /, ''), stems: stemsOf(meaning) });
  }
  return out;
}

const hasRun = (haystack: readonly string[], run: readonly string[]): boolean => {
  for (let i = 0; i + run.length <= haystack.length; i++) if (run.every((s, k) => haystack[i + k] === s)) return true;
  return false;
};

/** The answer for every lemma of the lexicon, and the report of how each was made. */
export function drillAnswers(inputs: DrillInputs): DrillReport {
  const { chapters, lexicon, senses = () => [], seeds = new Map(), corrections = {} } = inputs;
  // the lemma's chunks of English, each as stems, from the chunks that render that one Greek word alone
  const chunks = new Map<string, string[][]>();
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const chunk of verse.e ?? []) {
        if (chunk.g.length !== 1) continue;
        const word = verse.g[chunk.g[0]];
        if (!word) continue;
        const stems = stemsOf(ownEnglish(chunk));
        if (stems.length === 0) continue;
        const lemma = word.l.normalize('NFC');
        const held = chunks.get(lemma);
        if (held) held.push(stems);
        else chunks.set(lemma, [stems]);
      }
    }
  }

  const lemmas: Record<string, LemmaDrill> = {};
  for (const [lemma, entry] of Object.entries(lexicon)) {
    const own = chunks.get(lemma) ?? [];
    const candidates = candidatesOf(entry.g, senses(entry.s), seeds.get(lemma));
    const counts = candidates.map((c) => own.filter((stems) => hasRun(stems, c.stems)).length);
    const covered = own.filter((stems) => candidates.some((c) => hasRun(stems, c.stems))).length;
    const ranked = candidates.map((c, i) => [c.text, counts[i], i] as const).sort((a, b) => b[1] - a[1] || a[2] - b[2]);
    const atLine = ranked.filter(([, n]) => own.length > 0 && n / own.length >= SHARE_LINE).slice(0, MAX_MEANINGS);
    const settled = own.length >= MIN_USES && covered / own.length >= MIN_COVERAGE && atLine.length > 0;
    const below = ranked.filter(([text, n]) => n > 0 && !atLine.some(([t]) => t === text)).map(([text, n]): [string, number] => [text, n]);
    let drill: LemmaDrill;
    if (settled) {
      const note = NOTE.exec(entry.g)?.[0].trim();
      const verb = entry.g.startsWith('to ');
      const shown = atLine.map(([text], i) => (verb && i === 0 ? `to ${text}` : text));
      drill = { source: 'alignment', uses: own.length, meanings: atLine.map(([text, n]): [string, number] => [text, n]), ...(below.length ? { below } : {}), covered, answer: `${shown.join(', ')}${note ? ` ${note}` : ''}` };
    } else {
      drill = {
        source: 'tbesg',
        uses: own.length,
        meanings: [],
        ...(below.length ? { below } : {}),
        covered,
        answer: cappedGloss(entry.g),
        reason: own.length < MIN_USES ? 'few uses' : 'unsettled',
      };
    }
    const fix = corrections[lemma];
    if (fix) drill = { ...drill, source: 'correction', answer: fix.answer, reason: fix.reason };
    lemmas[lemma] = drill;
  }
  return { line: SHARE_LINE, cap: MAX_MEANINGS, lemmas };
}
