// src/data/grammar/readingMisses.ts — what a misread word stands for in the miss tally (mw-neuq78.3): in a Greek reading the
// diphthongs and consonant pairs (the sounds tier of ladder.ts, ideas with a `pair`) found in the word's chunks, in an English
// one the word itself. Pure; the repository (repositories/readings.ts) keeps the counts.
import type { FixWord } from '../db';
import { LADDER } from './ladder';

const ACCENTS = /[̀́͂]/;
const DIAERESIS = '̈';

/** The sounds that are two letters: 'αι' -> 'diphthong-ai', 'γγ' -> 'pair-gg', the ladder's combination items under the sounds tier, but not the breathings. */
const SOUNDS = LADDER.filter((idea) => idea.tier === 'sounds' && idea.pair && idea.parent).map((idea) => ({ id: idea.id, pair: idea.pair ?? '' }));

/**
 * The word as bare letters in lower case with a '·' where two letters that would pair are two sounds: a vowel pair whose
 * first vowel carries a stress mark, or whose second has the two dots (ἀΐ, προΐστημι), is not a diphthong.
 */
export function lettersOf(text: string): string {
  const out: string[] = [];
  let vowelBefore = false;
  let accentedBefore = false;
  for (const mark of text.normalize('NFD').toLowerCase().match(/[^̀-ͯ][̀-ͯ]*/gu) ?? []) {
    const base = mark[0] ?? '';
    const accented = ACCENTS.test(mark);
    // a breaking mark puts a stop between this letter and the one before, so no pair spans it
    if (vowelBefore && (accentedBefore || mark.includes(DIAERESIS)) && /[ιυ]/.test(base)) out.push('·');
    out.push(base === 'ς' ? 'σ' : base);
    vowelBefore = /[αεηιουω]/.test(base);
    accentedBefore = vowelBefore && accented;
  }
  return out.join('');
}

/** The sounds of the ladder a Greek word's chunks hold, each once. Chunks are joined: a pair like γγ may fall across two. */
export function soundsOf(chunks: string[]): string[] {
  const letters = lettersOf(chunks.join(''));
  return SOUNDS.filter((sound) => letters.includes(sound.pair)).map((sound) => sound.id);
}

/** An English word as the tally names it: lower case, no punctuation round it. */
export const englishUnit = (word: string): string => word.normalize('NFC').toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/**
 * The units a reading's focus words stand for, one for each word that holds the unit. `lang` 'en' is English, anything else a
 * Greek pronunciation (readingLang: 'el').
 */
export function missUnits(lang: string, words: FixWord[]): string[] {
  const units: string[] = [];
  for (const word of words) {
    if (lang === 'en') {
      const unit = englishUnit(word.word);
      if (unit) units.push(unit);
    } else units.push(...soundsOf(word.chunks));
  }
  return units;
}
