// src/data/grammar/hebrew/drillSteps.ts — the steps of Drill it on a Hebrew letter (mw-gdcyf98.11), pure: see a letter and pick its name; pick the letter from its name; hear it, or pick its sound (the Israeli
// scheme's lesson); find the letter in a word of the goal's chapters. The ideas are the 22 letters (the alphabet has the letter drill). A word is asked in its dictionary form (the lemma
// of the chapter's word, without cantillation), the Governor's rule for a word shown and quizzed; where the chapters have none the drill's fixed words of Genesis 1 and Jonah 1 fill in.
import type { Chapter } from '../../chapter';
import { collect, type DrillContext, type RawStep } from '../drillItems';
import { buildHebrewLetter, buildHebrewName, buildHebrewSound, buildHebrewSoundOf, buildHebrewWord, hebrewFacet, wordHolds, type HebrewAsk } from './letterQuestions';
import { HEBREW_DRILL_WORDS, hebrewBare, hebrewLetterOf, type HebrewLetter } from './letters';

/** The lemmas of the Hebrew chapters of the passage, pointed and with no cantillation, short first, then common first. */
export function hebrewPassageWords(passage: readonly Chapter[]): string[] {
  const count = new Map<string, number>();
  for (const chapter of passage) {
    if (chapter.lang !== 'hbo') continue;
    for (const verse of chapter.verses) for (const word of verse.g) if (word.l) count.set(hebrewBare(word.l), (count.get(hebrewBare(word.l)) ?? 0) + 1);
  }
  return [...count.keys()].sort((a, b) => a.length - b.length || count.get(b)! - count.get(a)! || (a < b ? -1 : 1));
}

/** The words a letter is asked in: those of the passage first (a letter's own words, a few others for company), the fixed words after, none twice. */
export function wordsFor(letter: HebrewLetter, passage: readonly Chapter[]): string[] {
  const own = hebrewPassageWords(passage);
  const holding = own.filter((w) => wordHolds(w, letter)).slice(0, 6);
  const rest = own.filter((w) => !wordHolds(w, letter)).slice(0, 12);
  const fixedHolding = HEBREW_DRILL_WORDS.filter((w) => wordHolds(w, letter));
  const fixedRest = HEBREW_DRILL_WORDS.filter((w) => !wordHolds(w, letter));
  return [...new Set([...holding, ...fixedHolding.slice(0, holding.length === 0 ? 2 : 0), ...rest, ...fixedRest])];
}

/** The steps of a Hebrew letter idea, or null for any other idea. */
export function hebrewLetterSteps(ctx: DrillContext): RawStep[] | null {
  const { idea, scheme, passage } = ctx;
  const letter = hebrewLetterOf(idea.id);
  if (!letter) return null;
  const asks: HebrewAsk[] = [{ letter, form: 'small' }];
  const each = (make: (ask: HebrewAsk, random: Parameters<Parameters<typeof collect>[1]>[0]) => ReturnType<Parameters<typeof collect>[1]>, tries: number): RawStep['questions'] =>
    asks.flatMap((ask, i) => collect(ctx, (random) => make(ask, random), tries, 100 * i));
  const spoken = each((ask, random) => (ask.form === 'small' && random() < 0.5 ? buildHebrewSoundOf(ask, random, scheme) ?? buildHebrewSound(ask, random, scheme) : buildHebrewSound(ask, random, scheme)), 8);
  const inWords = asks
    .filter((ask) => ask.form === 'small')
    .flatMap((ask, i) => collect(ctx, (random) => buildHebrewWord(ask, wordsFor(ask.letter, passage), random), 8, 1000 + 100 * i));
  return [
    { title: 'See a letter and pick its name', questions: each((ask, random) => buildHebrewName(ask, random), 6) },
    { title: 'Pick a letter from its name or its sound', questions: each((ask, random) => buildHebrewLetter({ ...ask, byName: random() < 0.5 }, random, scheme), 8) },
    { title: 'Hear a letter, or pick its sound', questions: spoken },
    { title: 'Find the letter in a word', questions: inWords, words: true },
  ];
}

export { hebrewFacet };
