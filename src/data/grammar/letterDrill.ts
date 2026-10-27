// src/data/grammar/letterDrill.ts — the letter drill that Got it on The Greek alphabet starts (mw-86e9r1.11, docs/grammar.md 'The letter drill', PROVISIONAL), pure.
// All 24 letters, each asked in its small form and its capital (48 targets), by ear (hear a letter, tap it) or by name ('Which letter is Beta?'), in rounds of
// ROUND_SIZE questions. A target is right once he has answered it right; a round asks what is not right yet first and fills a short last round from what is, and a
// target answered wrong again later is not right any more. The drill is over when every target is right. Nothing here touches the store or the screen
// (src/LetterDrillScreen.tsx draws it; src/data/repositories/inference.ts noteDrillAnswer keeps what each answer shows, and never makes a letter solid).
// The drill takes the letters of the ladder in hand (mw-gdcyf98.11, `LetterSet`): Greek's 24 letters, small and capital, as above, or Hebrew's 27 glyphs (the 22 letters and the 5 final forms, one target each),
// asked from the Israeli scheme's lessons (hebrew/letterQuestions.ts); every function takes the set last and means the Greek one when it is left out. Hebrew has no Say it and no Write it yet.
import { mulberry32, shuffle, type Random } from '../random';
import { chosenPronunciation } from '../../speech/greek';
import type { Pronunciation } from '../../speech/pronunciation';
import { hebrewPronunciationOf } from '../../speech/pronunciation';
import { LADDER, itemsOf, type GrammarIdea } from './ladder';
import type { LadderLang } from './ladders';
import { HEBREW_FINALS, HEBREW_LETTERS } from './hebrew/letters';
import { buildHebrewLetter, buildHebrewSound, type HebrewForm } from './hebrew/letterQuestions';
import { buildLetter, buildSay, buildSound, type GrammarQuestion, type LetterForm } from './questions';

/** Where a drill gets its seed (src/LetterDrillScreen.tsx): a new one each time it opens. A seam: a feature step fixes it, so it knows the questions. */
export const letterDrillSeed = { next: (): number => (Math.random() * 0x100000000) >>> 0 };

/** The random source of one drill, from the seam. */
export const newDrillRandom = (): Random => mulberry32(letterDrillSeed.next());

/** Questions in a round. */
export const ROUND_SIZE = 8;

/** Where in a round the one Say it question stands (the third), while the phone can hear him. PROVISIONAL. */
export const SAY_AT = 2;

/** One thing the drill asks: a letter in a form. */
export interface LetterTarget {
  /** the letter's ladder id, 'letter-beta' or 'he-letter-alef' */
  letter: string;
  /** a Greek letter's small form or capital; a Hebrew letter's ordinary shape ('small') or its final form */
  form: LetterForm | HebrewForm;
}

/** Heard (Tap to hear, then tap the glyph), named ('Which letter is Beta?') or said (Say it: the letter is shown and he says its name or its sound, mw-86e9r1.12). */
export type LetterMode = 'hear' | 'name' | 'say';

const ALPHABET = LADDER.find((i) => i.id === 'alphabet')!;
const LETTERS = itemsOf('alphabet');

/** Every target, alpha to omega, the small letter then the capital. */
export const TARGETS: readonly LetterTarget[] = LETTERS.flatMap((l): LetterTarget[] => [
  { letter: l.id, form: 'small' },
  { letter: l.id, form: 'capital' },
]);

const keyOf = (t: LetterTarget): string => `${t.letter}:${t.form}`;

/** The letters a drill asks, in one language: the ladder idea it is about, its targets and the scheme its sounds are read in. */
export interface LetterSet {
  lang: LadderLang;
  /** the ladder idea the drill is about: 'alphabet', 'he-alphabet' */
  alphabetId: string;
  targets: readonly LetterTarget[];
  /** the scheme the sounds are read in: the chosen Greek pronunciation, the Hebrew scheme */
  scheme(): Pronunciation;
}

/** The Greek 24 letters, small and capital (48 targets). */
export const GREEK_SET: LetterSet = { lang: 'grc', alphabetId: 'alphabet', targets: TARGETS, scheme: chosenPronunciation };

/** The Hebrew 27 glyphs: each of the 22 letters, then each of the 5 final forms (27 targets). */
export const HEBREW_SET: LetterSet = {
  lang: 'hbo',
  alphabetId: 'he-alphabet',
  targets: [...HEBREW_LETTERS.map((l): LetterTarget => ({ letter: l.id, form: 'small' })), ...HEBREW_FINALS.map((l): LetterTarget => ({ letter: l.id, form: 'final' }))],
  scheme: () => hebrewPronunciationOf(),
};

/** The set of the language in hand. */
export const letterSetOf = (lang: LadderLang): LetterSet => (lang === 'hbo' ? HEBREW_SET : GREEK_SET);

/** What the drill has so far: the targets answered right and the ones last answered wrong (their keys). */
export interface LetterDrillState {
  right: readonly string[];
  /** a target whose last answer was wrong: the next round asks it again */
  missed: readonly string[];
}

export const startLetterDrill = (): LetterDrillState => ({ right: [], missed: [] });

/** The targets not right yet, in the order of TARGETS. */
export const remainingTargets = (state: LetterDrillState, set: LetterSet = GREEK_SET): LetterTarget[] => set.targets.filter((t) => !state.right.includes(keyOf(t)));

/** True when every letter is right in both forms. */
export const isComplete = (state: LetterDrillState, set: LetterSet = GREEK_SET): boolean => remainingTargets(state, set).length === 0;

/** How many of the targets (48 Greek, 27 Hebrew) are right. */
export const rightCount = (state: LetterDrillState, set: LetterSet = GREEK_SET): number => set.targets.length - remainingTargets(state, set).length;

/** The state after an answer: a right answer makes the target right, a wrong one takes it back. */
export function answerTarget(state: LetterDrillState, target: LetterTarget, right: boolean): LetterDrillState {
  const [key, others] = [keyOf(target), (list: readonly string[]) => list.filter((k) => k !== keyOf(target))];
  return right ? { right: [...others(state.right), key], missed: others(state.missed) } : { right: others(state.right), missed: [...others(state.missed), key] };
}

/** One question of a round: what it is about, how it is asked and the question itself. */
export interface RoundItem {
  target: LetterTarget;
  mode: LetterMode;
  question: GrammarQuestion;
}

const letterOf = (id: string): GrammarIdea => LETTERS.find((l) => l.id === id)!;

/**
 * The question for a target in a mode: heard (buildSound), named (buildLetter, by name) or said (buildSay). A Hebrew target is heard, or asked by its name or, by chance, by its sound
 * (the Israeli scheme's lesson); Hebrew has no Say it yet, so a 'say' is heard.
 */
export function questionFor(target: LetterTarget, mode: LetterMode, random: Random, scheme?: Pronunciation, set: LetterSet = GREEK_SET): GrammarQuestion {
  const read = scheme ?? set.scheme();
  if (set.lang === 'hbo') {
    const ask = { letter: HEBREW_LETTERS.find((l) => l.id === target.letter)!, form: target.form as HebrewForm };
    return mode === 'name' ? buildHebrewLetter(ask, random, read) : buildHebrewSound(ask, random, read);
  }
  const ask = { letter: letterOf(target.letter), form: target.form as LetterForm };
  if (mode === 'say') return buildSay(ALPHABET, ask);
  return mode === 'hear' ? buildSound(ALPHABET, random, read, ask) : buildLetter(ALPHABET, random, read, { ...ask, byName: true });
}

/**
 * The next round: ROUND_SIZE questions in a random order. The ones he missed come first, then the ones not asked yet, and targets already right only fill a round when fewer
 * than a round are left, so a round is always a full one. Each is heard or named by chance, the two modes alternating from a random start so a round is never all of one.
 * With `say` (the phone can hear him, mw-86e9r1.12) the question at SAY_AT is Say it instead; without it the round is the same as it always was.
 */
export function drawRound(state: LetterDrillState, random: Random, scheme?: Pronunciation, say = false, set: LetterSet = GREEK_SET): RoundItem[] {
  const missed = shuffle(set.targets.filter((t) => state.missed.includes(keyOf(t))), random);
  const fresh = shuffle(remainingTargets(state, set).filter((t) => !state.missed.includes(keyOf(t))), random);
  const done = shuffle(set.targets.filter((t) => state.right.includes(keyOf(t))), random);
  const targets = [...missed, ...fresh, ...done].slice(0, ROUND_SIZE);
  const start = random() < 0.5 ? 0 : 1;
  return shuffle(targets, random).map((target, i) => {
    const mode: LetterMode = say && i === SAY_AT && set.lang === 'grc' ? 'say' : (i + start) % 2 === 0 ? 'hear' : 'name';
    return { target, mode, question: questionFor(target, mode, random, scheme, set) };
  });
}

/** Write it questions mixed into a round while Handwriting drills is on (mw-86e9r1.51). PROVISIONAL. */
export const WRITE_PER_ROUND = 2;

/** What the screen asks next: a question of the round, or Write it on a letter (its ladder id) the round has just asked. */
export type DrillStep = { kind: 'choice'; item: RoundItem } | { kind: 'write'; letter: string };

/**
 * The round as it is asked: with `writing`, a Write it after every third question, on the letter that question asked, WRITE_PER_ROUND at most; without
 * it, the round alone. Write it is a memory aid: it is not one of the round's questions, its score or its targets, and a skip moves on with nothing lost.
 */
export function withWriting(round: readonly RoundItem[], writing: boolean): DrillStep[] {
  let written = 0;
  return round.flatMap((item, i): DrillStep[] => {
    const choice: DrillStep = { kind: 'choice', item };
    if (!writing || written >= WRITE_PER_ROUND || (i + 1) % 3 !== 0) return [choice];
    written += 1;
    return [choice, { kind: 'write', letter: item.target.letter }];
  });
}
