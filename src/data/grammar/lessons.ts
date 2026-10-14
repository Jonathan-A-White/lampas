// src/data/grammar/lessons.ts — the sound-bearing ideas of the grammar ladder, said in the chosen Greek pronunciation (mw-5r3p30.229): a letter, a
// vowel pair, a consonant pair, a breathing and the groups that hold them. The ladder (ladder.ts) keeps what is true in every pronunciation (the
// spelling); how an idea SOUNDS is the scheme's own lesson (src/speech/pronunciation.ts `lessons`, Modern Greek's in schemes/modernLessons.ts).
// A scheme with no lesson for an idea gets the ladder's neutral text, which names no sound, and no sound: never another scheme's.
import { chosenPronunciation } from '../../speech/greek';
import type { Pronunciation } from '../../speech/pronunciation';
import type { GrammarIdea } from './ladder';

const GROUPS: readonly string[] = ['diphthongs', 'consonant-pairs', 'breathings', 'words-sound-alike'];

/** An idea whose text or question is about how something sounds: a letter, a pair or a breathing, the group of pairs or of breathings, or the words a scheme says alike. */
export const bearsSound = (idea: GrammarIdea): boolean => idea.glyphs !== undefined || idea.parent !== undefined || GROUPS.includes(idea.id);

const NO_LESSON = ' How it sounds depends on the Greek pronunciation you chose, and it has no lesson for this sound yet.';

/**
 * The idea's text in `scheme` (the chosen pronunciation when none is given; `null` is no scheme at all, the neutral text): the scheme's whole lesson,
 * else the ladder's spelling facts with 'In <label> it sounds like <sound>.' when the scheme gives the sound, else the facts with a line saying there is
 * no lesson. An idea about no sound is its own text, whatever the scheme.
 */
export function ideaText(idea: GrammarIdea, scheme: Pronunciation | null = chosenPronunciation()): string {
  if (!bearsSound(idea)) return idea.text;
  const lesson = scheme?.lessons?.[idea.id];
  if (lesson?.text) return lesson.text;
  if (lesson?.sound) return `${idea.text} In ${scheme?.label} it sounds like ${lesson.sound}.`;
  return `${idea.text}${NO_LESSON}`;
}

/** How the idea sounds in `scheme` (the chosen pronunciation when none is given): 'v, as in “vase”'; undefined when the scheme does not say. */
export function ideaSound(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation()): string | undefined {
  return scheme.lessons?.[idea.id]?.sound;
}

/**
 * How a sound-bearing idea sounds, for the idea sheet's 'How it sounds' (mw-5r3p30.234): the scheme's whole lesson, else 'In <label> it sounds like
 * <sound>.', else the line saying the scheme has no lesson for it; undefined for an idea about no sound. The card's own teaching (teach/) says what
 * the idea is and how to see it, and never how it sounds.
 */
export function soundLesson(idea: GrammarIdea, scheme: Pronunciation | null = chosenPronunciation()): string | undefined {
  if (!bearsSound(idea)) return undefined;
  const lesson = scheme?.lessons?.[idea.id];
  if (lesson?.text) return lesson.text;
  if (lesson?.sound) return `In ${scheme?.label} it sounds like ${lesson.sound}.`;
  return NO_LESSON.trim();
}
