// src/data/readingDrill.ts — the reading drill (mw-neuq78.5, docs/reading-ladder.md 'Drills'), pure: when the miss tally (mw-neuq78.3) shows a sound (Greek) or a word (English)
// missed in DRILL_MISSES of his last readings, the reading panel offers a drill of it. A Greek drill is the sounds tier's rule (src/data/grammar/ladder.ts) and DRILL_WORDS short
// New Testament words heavy in that sound, easiest first by the ladder's own score (src/data/ladderScore.ts); an English or a Hebrew (mw-gdcyf98.14) drill is the words he misread. Each word is read aloud
// with the verse-read grist at word size. A drilled unit goes on the schedule as a review of kind `sound` (src/data/repositories/reviews.ts scheduleSounds).
import type { MissCount } from './db';
import type { FrequencyEntry } from './frequency';
import { chosenPronunciation } from '../speech/greek';
import type { Pronunciation } from '../speech/pronunciation';
import { ideaOf, type GrammarIdea } from './grammar/ladder';
import { ideaSound } from './grammar/lessons';
import { lettersOf } from './grammar/readingMisses';
import { scoreWords } from './ladderScore';

/** PROVISIONAL (the Governor to confirm): a unit is offered a drill when it was missed in this many of his last five readings. */
export const DRILL_MISSES = 2;

/** How many practice words a drill has. */
export const DRILL_WORDS = 5;

/** A word must be this common in the New Testament to be a practice word, unless there are too few of them. */
const COMMON_COUNT = 5;

export type DrillOffer =
  | { kind: 'sound'; lang: string; unit: string; glyphs: string; rule: string }
  | { kind: 'words'; lang: string; words: string[] };

/** The sound's idea on the sounds tier, or undefined for a unit the ladder does not have (a pair or diphthong has `pair`). */
function soundIdea(unit: string, scheme: Pronunciation = chosenPronunciation()): GrammarIdea | undefined {
  try {
    const idea = ideaOf(unit);
    return idea.pair && ideaSound(idea, scheme) ? idea : undefined;
  } catch {
    return undefined;
  }
}

/** The one thing to remember about a sound, in the chosen pronunciation's own words: 'ου says oo, as in “food”'. */
export const ruleOf = (idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation()): string => `${idea.pair ?? ''} says ${ideaSound(idea, scheme) ?? ''}`;

/**
 * The drill the tally calls for, or null: in Greek the most missed sound that was missed in DRILL_MISSES readings or more; in English
 * the words he misread, the most missed first (at most DRILL_WORDS), once any was missed in that many readings. `tally` is getMissTally's, most missed first.
 */
export function drillOffer(lang: string, tally: readonly MissCount[], scheme: Pronunciation = chosenPronunciation()): DrillOffer | null {
  const rows = tally.filter((row) => row.lang === lang).sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit));
  if (!rows.length || rows[0].count < DRILL_MISSES) return null;
  if (lang === 'en' || lang === 'he') return { kind: 'words', lang, words: rows.slice(0, DRILL_WORDS).map((row) => row.unit) };
  for (const row of rows) {
    if (row.count < DRILL_MISSES) break;
    const idea = soundIdea(row.unit, scheme);
    if (idea) return { kind: 'sound', lang, unit: row.unit, glyphs: idea.pair ?? '', rule: ruleOf(idea, scheme) };
  }
  return null;
}

/** What the panel's button says. */
export const drillButtonLabel = (offer: DrillOffer): string => (offer.kind === 'sound' ? 'Drill this sound' : 'Drill these words');

/** The line under the button: what the tally found. */
export function drillWhy(offer: DrillOffer): string {
  return offer.kind === 'sound'
    ? `You missed ${offer.glyphs} in ${DRILL_MISSES} of your last 5 readings.`
    : `You missed these in ${DRILL_MISSES} of your last 5 readings: ${offer.words.join(', ')}.`;
}

/** The id of a drilled unit on the schedule: 'el:diphthong-ou', 'en:blessed', 'he:יוֹנָה'. */
export const soundReviewId = (lang: string, unit: string): string => `${lang}:${unit}`;

/** The ids the offer puts on the schedule when its drill is finished. */
export const reviewIdsOf = (offer: DrillOffer): string[] =>
  offer.kind === 'sound' ? [soundReviewId(offer.lang, offer.unit)] : offer.words.map((word) => soundReviewId(offer.lang, word));

/** Splits a review id back into its language and unit; undefined for an id this drill did not make. */
export function parseReviewId(id: string): { lang: string; unit: string } | undefined {
  const at = id.indexOf(':');
  return at > 0 && at < id.length - 1 ? { lang: id.slice(0, at), unit: id.slice(at + 1) } : undefined;
}

/**
 * Up to DRILL_WORDS dictionary words of the New Testament that hold the sound, the ones most made of it first (the sound's letters as a share of the word's), then the
 * commoner; shown easiest first by the ladder's score. A name is not a practice word. Words rarer than COMMON_COUNT are used only when too few common ones hold the sound.
 */
export function drillWords(idea: GrammarIdea, frequency: readonly FrequencyEntry[]): string[] {
  const pair = idea.pair ?? '';
  if (!pair) return [];
  const held = frequency
    .filter((entry) => !entry.proper)
    .flatMap((entry) => {
      const letters = lettersOf(entry.lemma).replace(/·/g, '');
      const times = letters.split(pair).length - 1;
      return times > 0 && letters.length > 0 ? [{ word: entry.lemma.normalize('NFC'), count: entry.count, share: (times * pair.length) / letters.length }] : [];
    });
  const common = held.filter((w) => w.count >= COMMON_COUNT);
  const pool = common.length >= DRILL_WORDS ? common : held;
  // words that differ only by their marks (οὐ, οὗ) are one practice word: the commoner is kept
  const seen = new Set<string>();
  const picked = [...pool]
    .sort((a, b) => b.share - a.share || b.count - a.count || a.word.localeCompare(b.word))
    .filter((w) => {
      const bare = lettersOf(w.word);
      if (seen.has(bare)) return false;
      seen.add(bare);
      return true;
    })
    .slice(0, DRILL_WORDS);
  return picked
    .map((w) => ({ ...w, score: scoreWords([w.word]).score }))
    .sort((a, b) => a.score - b.score || b.share - a.share || b.count - a.count || a.word.localeCompare(b.word))
    .map((w) => w.word);
}

/** The idea for a Greek unit, for the sheet (rule, glyphs, speaker). */
export const ideaOfSound = soundIdea;
