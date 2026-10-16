// src/data/grammar/lessons.ts — the sound-bearing ideas of the grammar ladder, said in the chosen Greek pronunciation (mw-5r3p30.229): a letter, a
// vowel pair, a consonant pair, a breathing, the groups that hold them, and the accents and the marks that change a word (how an accent is said and
// whether a mark is heard, mw-5r3p30.312). The ladder (ladder.ts) keeps what is true in every pronunciation (the
// spelling); how an idea SOUNDS is the scheme's own lesson (src/speech/pronunciation.ts `lessons`, Modern Greek's in schemes/modernLessons.ts).
// A scheme with no lesson for an idea gets the ladder's neutral text, which names no sound, and no sound: never another scheme's. Each sound is said
// in the reader's English accent (src/speech/accents/, mw-5r3p30.352), through pronunciation.ts lessonsOf.
import { chosenAccent, type EnglishAccent } from '../../speech/accents';
import { chosenPronunciation } from '../../speech/greek';
import { lessonsOf, type Pronunciation, type SoundLesson } from '../../speech/pronunciation';
import type { GrammarIdea } from './ladder';

const GROUPS: readonly string[] = ['diphthongs', 'consonant-pairs', 'breathings', 'words-sound-alike', 'accents', 'marks-change-word'];

/** An idea whose text or question is about how something sounds: a letter, a pair or a breathing, the group of pairs or of breathings, the words a scheme says
 * alike, the accents (how the stress is said) or the marks that change a word (whether the mark is heard). */
export const bearsSound = (idea: GrammarIdea): boolean => idea.glyphs !== undefined || idea.parent !== undefined || GROUPS.includes(idea.id);

/** The lesson `scheme` gives the idea, its sounds said in `accent` (mw-5r3p30.352: the one way a sheet, a tile or a question reads a sound's hint). */
const lessonOf = (idea: GrammarIdea, scheme: Pronunciation | null, accent: EnglishAccent): SoundLesson | undefined =>
  scheme ? lessonsOf(scheme, accent)[idea.id] : undefined;

/** The lesson's added sentence (SoundLesson.also), with the space that joins it. */
const also = (lesson: SoundLesson): string => (lesson.also ? ` ${lesson.also}` : '');

const NO_LESSON = ' How it sounds depends on the Greek pronunciation you chose, and it has no lesson for this sound yet.';

/**
 * The idea's text in `scheme` (the chosen pronunciation when none is given; `null` is no scheme at all, the neutral text): the scheme's whole lesson,
 * else the ladder's spelling facts with 'In <label> it sounds like <sound>.' when the scheme gives the sound, else the facts with the lesson's `also`
 * when it gives only that (the accents, mw-5r3p30.312), else the facts with a line saying there is no lesson. An idea about no sound is its own text, whatever the scheme.
 */
export function ideaText(idea: GrammarIdea, scheme: Pronunciation | null = chosenPronunciation(), accent: EnglishAccent = chosenAccent()): string {
  if (!bearsSound(idea)) return idea.text;
  const lesson = lessonOf(idea, scheme, accent);
  if (lesson?.text) return lesson.text;
  if (lesson?.sound) return `${idea.text} In ${scheme?.label} it sounds like ${lesson.sound}.${also(lesson)}`;
  if (lesson?.also) return `${idea.text}${also(lesson)}`;
  return `${idea.text}${NO_LESSON}`;
}

/** How the idea sounds in `scheme` (the chosen pronunciation when none is given), said in `accent` (the chosen English accent): 'v, as in “vase”';
 * undefined when the scheme does not say. */
export function ideaSound(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation(), accent: EnglishAccent = chosenAccent()): string | undefined {
  return lessonOf(idea, scheme, accent)?.sound;
}

/** How the idea sounds as ONE choice of a quiz (mw-5r3p30.355): the lesson's short label ('o, as in “or”, short'), else its sound up to the first semicolon;
 * never a rule ('before a, o, ou'), an aside or a bracket, which stay on the sheet and the Hint. Undefined when the scheme does not say. */
export function ideaChoice(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation(), accent: EnglishAccent = chosenAccent()): string | undefined {
  const lesson = lessonOf(idea, scheme, accent);
  return lesson?.choice ?? lesson?.sound?.split(';')[0].trim();
}

/**
 * How a sound-bearing idea sounds, for the idea sheet's 'How it sounds' (mw-5r3p30.234): the scheme's whole lesson, else 'In <label> it sounds like
 * <sound>.', else the lesson's `also` alone, else the line saying the scheme has no lesson for it; undefined for an idea about no sound. The card's own teaching (teach/) says what
 * the idea is and how to see it, and never how it sounds.
 */
export function soundLesson(idea: GrammarIdea, scheme: Pronunciation | null = chosenPronunciation(), accent: EnglishAccent = chosenAccent()): string | undefined {
  if (!bearsSound(idea)) return undefined;
  const lesson = lessonOf(idea, scheme, accent);
  if (lesson?.text) return lesson.text;
  if (lesson?.sound) return `In ${scheme?.label} it sounds like ${lesson.sound}.${also(lesson)}`;
  if (lesson?.also) return lesson.also;
  return NO_LESSON.trim();
}
