// src/ipa/course.ts — the optional course 'Learn the IPA sounds' (mw-5r3p30.356, his words: "an optional exercise ... a drill and everything like that and how to
// get to The Standard ... make sure that it's rigorous"): what it teaches, from the standard in the middle (src/speech/sounds.ts). Each sound the chosen Greek scheme
// writes (Pronunciation.sounds) has a lesson: its IPA symbol, the reader's English accent's key word, the Greek letters that make it and a Greek word the voice says
// (Pronunciation.soundGuide). Nothing here names a Greek sound or an English key word: the scheme and the accent tables do. The drills are ./drill.ts, what is kept is
// ./progress.ts, the screens are ./IpaCourse.tsx.
import { accentOf, AMERICAN_ID, chosenAccent, soundHint, type EnglishAccent } from '../speech/accents';
import { chosenPronunciation } from '../speech/greek';
import type { Pronunciation } from '../speech/pronunciation';
import { CONFUSABLE, SOUND_IDS, type SoundId } from '../speech/sounds';
import { shuffle, type Random } from '../data/random';
import { buildQuestion, type Direction, type IpaQuestion } from './drill';

/** One sound of the course. */
export interface CourseSound {
  /** the standard id, which is also the symbol shown: '/o/' */
  id: SoundId;
  /** the key word in the card's form: 'as in “or”, short' */
  keyWord: string;
  /** the key word as one choice of a quiz */
  choice: string;
  /** the Greek letters that make it */
  letters: readonly string[];
  /** a Greek word the voice says that has it */
  word: string;
  at: 'start' | 'inside';
  confusables: readonly SoundId[];
}

/** The accent whose key words the course shows: the chosen one, but IPA has no English key word (its hint is the symbol itself), so a reader who has chosen it is shown
 * American English's. */
export function courseAccent(chosen: EnglishAccent = chosenAccent()): EnglishAccent {
  return chosen.id === 'ipa' ? accentOf(AMERICAN_ID) : chosen;
}

/** Every sound `scheme` writes, in the inventory's order, as a lesson of the course; throws, naming the sound, when the scheme has no lesson for one it writes. */
export function courseSounds(scheme: Pronunciation = chosenPronunciation(), accent: EnglishAccent = courseAccent()): CourseSound[] {
  const written = new Set(Object.values(scheme.sounds));
  return SOUND_IDS.filter((id) => written.has(id)).map((id) => {
    const guide = scheme.soundGuide?.[id];
    if (!guide) throw new Error(`${scheme.label} has no lesson for ${id} in the course Learn the IPA sounds`);
    const hint = soundHint(id, accent);
    return { id, keyWord: hint.card, choice: hint.choice, letters: guide.letters, word: guide.word, at: guide.at, confusables: (CONFUSABLE[id] ?? []).filter((p) => written.has(p)) };
  });
}

/** What the pass check needs to pass: at least this share of its questions right (PROVISIONAL, the Governor to confirm; 56 of 62 for Modern Greek). */
export const PASS_FRACTION = 0.9;

/** The pass check's questions: every sound both ways, once each, in a shuffled order, with no hint (a question carries none and the screen shows none). */
export function passCheckQuestions(sounds: readonly CourseSound[], random: Random, scheme: Pronunciation = chosenPronunciation()): IpaQuestion[] {
  const all = sounds.map((s) => s.id);
  const items = sounds.flatMap((s) => (['hear', 'see'] as Direction[]).map((direction) => ({ sound: s.id, direction })));
  return shuffle(items, random).map((item) => buildQuestion(item.sound, item.direction, all, random, sounds, scheme));
}

/** One answer of the pass check. */
export interface CheckAnswer {
  sound: SoundId;
  direction: Direction;
  right: boolean;
}

export interface CheckResult {
  passed: boolean;
  rights: number;
  total: number;
  /** the sounds with an answer wrong, in the inventory's order, each once */
  toPractise: SoundId[];
}

/** How the pass check went: a pass at PASS_FRACTION right; whatever the result, the symbols that were missed are named. */
export function checkResult(answers: readonly CheckAnswer[]): CheckResult {
  const rights = answers.filter((a) => a.right).length;
  const missed = new Set(answers.filter((a) => !a.right).map((a) => a.sound));
  return { passed: answers.length > 0 && rights / answers.length >= PASS_FRACTION, rights, total: answers.length, toPractise: SOUND_IDS.filter((id) => missed.has(id)) };
}
