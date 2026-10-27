// src/data/grammar/hebrew/letterQuestions.ts — the questions about a Hebrew letter (mw-gdcyf98.11), pure: which letter is Alef, which letter sounds like b (the Israeli scheme's lesson, never a sound of
// this file's), hear a letter and tap it, and which word holds a letter. They take the same shape as the Greek ones (questions.ts buildLetter, buildSound): four glyphs, the right one among them, the near
// misses (a look-alike letter) first, and `lang: 'hbo'` so the card draws the glyphs right to left in the Hebrew face. The letter drill (letterDrill.ts) and Drill it on a letter (drillHebrew.ts) ask them.
import { OPTION_COUNT, choicesOf } from '../../choices';
import type { Random } from '../../quiz';
import { ideaChoice } from '../lessons';
import type { GrammarIdea, Facet } from '../ladder';
import { lessonsOf, type Pronunciation } from '../../../speech/pronunciation';
import type { GrammarQuestion } from '../questions';
import { HEBREW_FINALS, HEBREW_LETTERS, hebrewConsonants, hebrewLetterOfGlyph, hebrewLookAlikesOf, type HebrewLetter } from './letters';
import { HEBREW_LADDER } from './ladder';

/** The shape of a letter a question asks: its ordinary shape or, for the five that have one, its form at the end of a word. */
export type HebrewForm = 'small' | 'final';

/** A letter and the shape of it a question asks; `byName` asks it by its name, never by its sound. */
export interface HebrewAsk {
  letter: HebrewLetter;
  form: HebrewForm;
  byName?: boolean;
}

/** The glyph of a letter in a shape. */
export const hebrewGlyphOf = (letter: HebrewLetter, form: HebrewForm = 'small'): string => (form === 'final' ? (letter.final ?? letter.letter) : letter.letter);

const ideaOf = (letter: HebrewLetter): GrammarIdea => HEBREW_LADDER.find((i) => i.id === letter.id)!;

/** What a letter is asked as in Drill it and the letter drill's facets: its glyph and its name ('א (Alef)'). */
export const hebrewFacet = (letter: HebrewLetter, form: HebrewForm = 'small'): Facet => ({ id: letter.id + (form === 'final' ? ':final' : ''), label: `${hebrewGlyphOf(letter, form)} (${letter.name}${form === 'final' ? ', final' : ''})` });

/** The letters a question may offer beside `ask`: those of its shape (a final form is offered only beside final forms), and for a question by sound none that says the sound asked. */
function others(ask: HebrewAsk, scheme: Pronunciation, symbol: string | undefined): HebrewLetter[] {
  const pool = ask.form === 'final' ? HEBREW_FINALS : HEBREW_LETTERS;
  return pool.filter((o) => o.id !== ask.letter.id && (symbol === undefined || !soundsOf(o, scheme).includes(symbol)));
}

/** The sounds the scheme's lesson gives a letter, as the respelling writes them ('b' and 'v' for bet); none for a letter it says nothing for (alef, ayin). */
export function soundsOf(letter: HebrewLetter, scheme: Pronunciation): readonly string[] {
  return lessonsOf(scheme)[letter.lesson]?.sounds ?? [];
}

/** Four glyphs: `right`, its look-alikes among `pool` first, then others at random. */
function glyphChoices(ask: HebrewAsk, pool: readonly HebrewLetter[], random: Random): Pick<GrammarQuestion, 'options' | 'near'> {
  const near = hebrewLookAlikesOf(ask.letter.id).flatMap((id) => pool.filter((o) => o.id === id).map((o) => hebrewGlyphOf(o, ask.form)));
  return choicesOf({ right: hebrewGlyphOf(ask.letter, ask.form), near, fillers: pool.map((o) => hebrewGlyphOf(o, ask.form)) }, random);
}

/**
 * Which letter: 'Which letter is Alef?' or 'Which letter sounds like b, as in “bed”?' (the scheme's lesson; a letter it says nothing for is asked by name), over four glyphs. A letter that
 * says the sound asked is never offered beside it. A final form is asked 'Which letter is Mem, at the end of a word?' over four final forms.
 */
export function buildHebrewLetter(ask: HebrewAsk, random: Random, scheme: Pronunciation): GrammarQuestion {
  const { letter, form } = ask;
  const choice = ideaChoice(ideaOf(letter), scheme);
  const symbol = soundsOf(letter, scheme)[0];
  const bySound = !ask.byName && form === 'small' && choice !== undefined && symbol !== undefined && random() < 0.5;
  const where = form === 'final' ? ', at the end of a word' : '';
  return {
    kind: 'letter',
    ideaId: 'he-alphabet',
    prompt: bySound ? `Which letter sounds like ${choice}?` : `Which letter is ${letter.name}${where}?`,
    ...glyphChoices(ask, others(ask, scheme, bySound ? symbol : undefined), random),
    right: hebrewGlyphOf(letter, form),
    facet: hebrewFacet(letter, form),
    lang: 'hbo',
  };
}

/** Which letter he hears: Tap to hear says it in the Hebrew voice, and no letter that says the same is among the four glyphs. */
export function buildHebrewSound(ask: HebrewAsk, random: Random, scheme: Pronunciation): GrammarQuestion {
  const { letter, form } = ask;
  const symbols = soundsOf(letter, scheme);
  const pool = ask.form === 'final' ? HEBREW_FINALS : HEBREW_LETTERS;
  const alike = (o: HebrewLetter): boolean => (symbols.length === 0 ? soundsOf(o, scheme).length === 0 : soundsOf(o, scheme).some((s) => symbols.includes(s)));
  const rest = pool.filter((o) => o.id !== letter.id && !alike(o));
  return {
    kind: 'sound',
    ideaId: 'he-alphabet',
    prompt: 'Tap to hear a letter, then tap it',
    ...glyphChoices(ask, rest, random),
    right: hebrewGlyphOf(letter, form),
    say: hebrewGlyphOf(letter, form),
    facet: hebrewFacet(letter, form),
    lang: 'hbo',
  };
}

/** The sound of a letter as ONE choice of a question ('b, as in “bed”'), or undefined for a letter the scheme says nothing for. */
export const hebrewSoundChoice = (letter: HebrewLetter, scheme: Pronunciation): string | undefined => ideaChoice(ideaOf(letter), scheme);

/** What is this letter called: the glyph is shown, its name is one of four. */
export function buildHebrewName(ask: HebrewAsk, random: Random): GrammarQuestion {
  const { letter, form } = ask;
  const pool = ask.form === 'final' ? HEBREW_FINALS : HEBREW_LETTERS;
  const near = hebrewLookAlikesOf(letter.id).flatMap((id) => pool.filter((o) => o.id === id).map((o) => o.name));
  return {
    kind: 'letter',
    ideaId: 'he-alphabet',
    prompt: 'What is this letter called?',
    ...choicesOf({ right: letter.name, near, fillers: pool.filter((o) => o.id !== letter.id).map((o) => o.name) }, random),
    right: letter.name,
    form: hebrewGlyphOf(letter, form),
    say: hebrewGlyphOf(letter, form),
    facet: hebrewFacet(letter, form),
    lang: 'hbo',
  };
}

/** What a letter sounds like: the glyph is shown and the scheme's sound for it is one of four, over letters that say something else. Undefined for a letter the scheme says nothing for. */
export function buildHebrewSoundOf(ask: HebrewAsk, random: Random, scheme: Pronunciation): GrammarQuestion | null {
  const { letter, form } = ask;
  const right = hebrewSoundChoice(letter, scheme);
  const symbol = soundsOf(letter, scheme)[0];
  if (right === undefined || symbol === undefined) return null;
  const rest = others(ask, scheme, symbol).map((o) => hebrewSoundChoice(o, scheme)).filter((s): s is string => s !== undefined);
  const options = choicesOf({ right, fillers: [...new Set(rest)] }, random);
  if (options.options.length < OPTION_COUNT) return null;
  return { kind: 'letter', ideaId: 'he-alphabet', prompt: 'What does this letter sound like?', ...options, right, form: hebrewGlyphOf(letter, form), say: hebrewGlyphOf(letter, form), facet: hebrewFacet(letter, form), lang: 'hbo' };
}

/** Whether a word holds a letter, in either of its shapes. */
export const wordHolds = (word: string, letter: HebrewLetter): boolean => hebrewConsonants(word).includes(letter.letter);

/**
 * Which word holds the letter: four Hebrew words (the dictionary forms of the goal's chapters, a few fixed words of Genesis 1 and Jonah 1 where they lack), one that holds it. Null when there
 * are not enough words to ask it.
 */
export function buildHebrewWord(ask: HebrewAsk, words: readonly string[], random: Random): GrammarQuestion | null {
  const { letter } = ask;
  const holds = words.filter((w) => wordHolds(w, letter));
  const lacks = words.filter((w) => !wordHolds(w, letter));
  if (holds.length === 0 || lacks.length < OPTION_COUNT - 1) return null;
  const right = holds[Math.floor(random() * holds.length)];
  const near = lacks.filter((w) => hebrewLookAlikesOf(letter.id).some((id) => wordHolds(w, HEBREW_LETTERS.find((l) => l.id === id)!)));
  const options = choicesOf({ right, near, fillers: lacks }, random);
  return {
    kind: 'letter',
    ideaId: 'he-alphabet',
    prompt: `Which of these words has the letter ${letter.name}, ${letter.letter}?`,
    ...options,
    right,
    facet: hebrewFacet(letter),
    lang: 'hbo',
  };
}

export { hebrewLetterOfGlyph };
