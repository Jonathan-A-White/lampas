// src/data/grammar/hebrew/wordQuestions.ts — the questions about the Hebrew words of a verse (mw-gdcyf98.21), pure: which words of a verse use a Hebrew idea (read from the parsing the data build decoded,
// by the terms of terms.ts), tap the word that has an idea, and, where a passage gives no word, which idea a paragraph is. Review asks them of a due Hebrew idea (buildHebrewIdeaQuestion) and Drill it
// on a Hebrew idea draws the same. A word is the pointed form the Reader shows (no cantillation); a word with a maqaf or an inseparable prefix is one word, as the data writes it.
import { wordParse, type Chapter, type GreekWord, type Verse } from '../../chapter';
import { choicesOf } from '../../choices';
import { hebrewParseSegments } from '../../parseCode';
import { shuffle, type Random } from '../../quiz';
import { hebrewPointedForm, type Pronunciation } from '../../../speech/pronunciation';
import type { GrammarIdea } from '../ladder';
import { MEANING, SPOT, blankOut, type GrammarQuestion } from '../questions';
import { HEBREW_LADDER, isHebrewIdeaId } from './ladder';
import { buildHebrewLetter, buildHebrewName, buildHebrewSound } from './letterQuestions';
import { HEBREW_FINALS, HEBREW_LETTERS, hebrewLetterOf } from './letters';
import { HEBREW_TERM_IDEA } from './terms';

/** A Hebrew word as the Reader and the tutor show it: pointed, no cantillation, in NFC. */
export const hebrewFormOf = (word: GreekWord): string => hebrewPointedForm(word.t).normalize('NFC');

/** The ids of the Hebrew ideas a word uses: those its parsing's terms belong to (hebrew/terms.ts), once each, in the order the parsing says them. None for a word with no parsing. */
export function hebrewIdeasOfWord(chapter: Chapter, word: GreekWord): string[] {
  const decoded = wordParse(chapter, word);
  if (!decoded) return [];
  const ids = hebrewParseSegments(decoded).flatMap((s) => (s.term !== undefined && Object.hasOwn(HEBREW_TERM_IDEA, s.term) ? [HEBREW_TERM_IDEA[s.term]] : []));
  return [...new Set(ids)];
}

/** The words of a verse that use the idea. */
export const hebrewWordsUsing = (chapter: Chapter, verse: Verse, ideaId: string): GreekWord[] => verse.g.filter((w) => hebrewIdeasOfWord(chapter, w).includes(ideaId));

/** Whether an idea is one a verse's words can be asked about: a grammar idea of the nouns to joiners tiers (the letters, sounds and marks are asked from the ladder's own items). */
export const isHebrewWordIdea = (idea: GrammarIdea): boolean => isHebrewIdeaId(idea.id) && ['nouns', 'pronouns', 'prepositions', 'verbs', 'joiners'].includes(idea.tier);

/** What the idea is called in 'Tap a word that shows ...': the title's first part, and a few ideas named by what they show. */
const SHOWN: Readonly<Record<string, string>> = {
  'he-prep-inseparable': 'a prefixed preposition (in, like or to)',
  'he-prep-min': 'the preposition מִן, “from”',
  'he-object-marker': 'the object marker',
  'he-vav': 'the vav, “and”',
  'he-pronoun-relative': 'the relative pronoun',
};

const shownOf = (idea: GrammarIdea): string => {
  if (SHOWN[idea.id]) return SHOWN[idea.id];
  const first = idea.title.split(':')[0];
  return first.replace(/^The /, 'the ').replace(/^([A-Z])(?![A-Z])/, (c) => c.toLowerCase());
};

/** The prompt of a tap-the-word question on an idea. */
export const hebrewTapPrompt = (idea: GrammarIdea): string => `Tap a word that shows ${shownOf(idea)}`;

/**
 * Tap the word: a verse of the Hebrew chapters of the passage with a word that uses the idea and three words that do not, all four different, as the Reader writes them. Null when the passage
 * has no such verse (a passage of Greek chapters has none).
 */
export function buildHebrewTapForm(idea: GrammarIdea, passage: readonly Chapter[], random: Random, only?: string): GrammarQuestion | null {
  if (!isHebrewWordIdea(idea)) return null;
  const places = passage.flatMap((chapter) =>
    chapter.lang !== 'hbo'
      ? []
      : chapter.verses.flatMap((verse) => {
          const key = `${chapter.code}.${chapter.chapter}.${verse.n}`;
          return only !== undefined && only !== key ? [] : [{ chapter, verse, key }];
        }),
  );
  for (const { chapter, verse } of shuffle(places, random)) {
    const using = hebrewWordsUsing(chapter, verse, idea.id);
    const forms = (words: readonly GreekWord[]): string[] => [...new Set(words.map(hebrewFormOf))];
    // the form of a using word must be the only one of its spelling in the verse that uses the idea or not: a spelling that appears on both sides leaves two right answers
    const others = verse.g.filter((w) => !using.includes(w));
    const wrong = forms(others).filter((f) => !forms(using).includes(f));
    const right = shuffle(forms(using).filter((f) => !forms(others).includes(f)), random)[0];
    if (right === undefined || wrong.length < 3) continue;
    const chosen = shuffle(wrong, random).slice(0, 3);
    const word = using.find((w) => hebrewFormOf(w) === right) as GreekWord;
    return {
      kind: 'tap-form',
      ideaId: idea.id,
      prompt: hebrewTapPrompt(idea),
      options: shuffle([right, ...chosen], random),
      right,
      ref: `${chapter.book} ${chapter.chapter}:${verse.n}`,
      code: word.p,
      facet: SPOT,
      lang: 'hbo',
    };
  }
  return null;
}

/** Which idea this is, from what it says of itself with its own name taken out, over the titles of the Hebrew ladder (the idea's own tier first): for an idea the passage gives no word of. */
export function buildHebrewConcept(idea: GrammarIdea, random: Random): GrammarQuestion {
  const others = HEBREW_LADDER.filter((o) => o.id !== idea.id && o.title !== idea.title);
  const near = shuffle(others.filter((o) => o.tier === idea.tier), random).map((o) => o.title);
  const far = others.filter((o) => o.tier !== idea.tier).map((o) => o.title);
  return {
    kind: 'concept',
    ideaId: idea.id,
    prompt: `Which idea is this? ${blankOut(idea, idea.text)}`,
    ...choicesOf({ right: idea.title, near, fillers: far }, random),
    right: idea.title,
    facet: MEANING,
  };
}

/**
 * A question that drills a Hebrew idea over a passage (Review asks it of a due Hebrew idea): a letter by name or glyph, the alphabet or the final forms by a letter at random, a word idea by tapping
 * a word of the passage that shows it, and any idea the passage gives no word of by what it says. The Greek ideas' own questions (the sound rule, the movable letters, the breathing) are never asked of
 * a Hebrew idea: see refuseHebrew.
 */
export function buildHebrewIdeaQuestion(idea: GrammarIdea, passage: readonly Chapter[], random: Random, scheme: Pronunciation): GrammarQuestion {
  const letter = hebrewLetterOf(idea.id);
  if (letter) return random() < 0.5 ? buildHebrewName({ letter, form: 'small' }, random) : buildHebrewSound({ letter, form: 'small' }, random, scheme);
  if (idea.id === 'he-alphabet') {
    const any = shuffle(HEBREW_LETTERS, random)[0];
    return random() < 0.5 ? buildHebrewLetter({ letter: any, form: 'small' }, random, scheme) : buildHebrewName({ letter: any, form: 'small' }, random);
  }
  if (idea.id === 'he-final-forms') {
    const any = shuffle(HEBREW_FINALS, random)[0];
    return buildHebrewLetter({ letter: any, form: 'final' }, random, scheme);
  }
  return buildHebrewTapForm(idea, passage, random) ?? buildHebrewConcept(idea, random);
}
