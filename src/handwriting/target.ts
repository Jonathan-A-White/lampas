// src/handwriting/target.ts — what a Write it card writes (mw-5r3p30.913): a Greek letter's small form, or a Hebrew letter in its ordinary shape or, in the letter drill, its final form. The card,
// the lesson's part and the drill ask this one place for the glyph, the script it is written in, the name it is shown by and the sound the scheme gives it.
import type { GrammarIdea } from '../data/grammar/ladder';
import { ideaChoice } from '../data/grammar/lessons';
import { hebrewLetterOf } from '../data/grammar/hebrew/letters';
import { hebrewPronunciationOf } from '../speech/pronunciation';
import type { WriteScript } from './glyphs';

/** The shape of a Hebrew letter that is written: its ordinary shape, or the form at the end of a word for the five that have one. */
export type WriteForm = 'small' | 'final';

export interface WriteTarget {
  /** the letter written, and the key its progress is kept under: 'ο', 'א', 'ך' */
  glyph: string;
  lang: WriteScript;
  /** what the card calls it: 'Omicron', 'Alef', 'Kaf, final form' */
  title: string;
  /** the sound the scheme in hand gives it ('o, as in “not”'), or none (alef) */
  sound: string | undefined;
}

/** What `idea` writes, or undefined for an idea that is no letter. A form the letter does not have is its ordinary shape. */
export function writeTargetOf(idea: GrammarIdea, form: WriteForm = 'small'): WriteTarget | undefined {
  const hebrew = hebrewLetterOf(idea.id);
  if (hebrew) {
    const final = form === 'final' && hebrew.final !== undefined;
    return { glyph: final ? hebrew.final! : hebrew.letter, lang: 'hbo', title: final ? `${idea.title}, final form` : idea.title, sound: ideaChoice(idea, hebrewPronunciationOf()) };
  }
  const glyph = idea.glyphs?.[0];
  return glyph ? { glyph, lang: 'grc', title: idea.title, sound: ideaChoice(idea) } : undefined;
}
