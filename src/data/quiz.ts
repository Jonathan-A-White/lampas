// src/data/quiz.ts — the pure parts of the Quick test: the state rule, the drawing of a round, the option
// builder and the question. Nothing here touches the store or the screen; the random source is passed in.
import { isGuess, sourceLanguage, wordLemma, type Chapter, type GreekWord, type SourceLanguage } from './chapter';
import type { Word, WordState } from './db';
import { holdsLemma, lemmaKeyOf, normaliseLemma } from './lemma';
import { SEED_WORDS } from './seed-words';
import { SEED_WORDS_HBO } from './seed-words-hbo';
import { choicesOf } from './choices';
import { cardForm } from '../reader/septuagint';
import type { LemmaLexicon } from './lexicon';
import { meaningsOf, shareMeaning } from './meanings';
import { shuffle, type Random } from './random';

export { mulberry32, shuffle, type Random } from './random';

export const ROUND_SIZE = 10;
/** A round asks this many learning words, or all it has when it has fewer: the bias towards what he is learning. */
const LEARNING_SHARE = 5;

/**
 * The state rule. `answers` are the word's answers since it last got its state, oldest first, the one just
 * given last. Two misses in a row move a solid word to learning; two rights in a row move a learning word to
 * solid; a dropped word never moves.
 */
export function nextState(state: WordState, answers: readonly boolean[]): WordState {
  const [prev, last] = answers.slice(-2);
  if (state === 'solid' && prev === false && last === false) return 'learning';
  if (state === 'learning' && prev === true && last === true) return 'solid';
  return state;
}

/** Draws a round: different words, never a dropped one, at least 3 learning when he has that many. */
export function drawWords(words: readonly Word[], random: Random, size = ROUND_SIZE): Word[] {
  const learning = shuffle(words.filter((w) => w.state === 'learning'), random);
  const solid = shuffle(words.filter((w) => w.state === 'solid'), random);
  // never more than the places asked for: a round with fewer than LEARNING_SHARE places left (mw-hqd5bz.30) has no room for the full share
  const fromLearning = Math.min(learning.length, LEARNING_SHARE, size);
  const fromSolid = Math.min(solid.length, size - fromLearning);
  // When the solid words run short, learning ones fill the rest.
  const extra = Math.min(learning.length - fromLearning, size - fromLearning - fromSolid);
  return shuffle([...learning.slice(0, fromLearning + extra), ...solid.slice(0, fromSolid)], random);
}

/** A seed word offered as a wrong gloss. */
export interface Distractor {
  lemma: string;
  gloss: string;
  pos: string;
}

const seedPools: Partial<Record<SourceLanguage, Distractor[]>> = {};
/** The seed words of a language (Greek unless said) as distractors, keyed by the headword the store uses. */
export function seedDistractors(lang: SourceLanguage = 'grc'): Distractor[] {
  seedPools[lang] ??= (lang === 'hbo' ? SEED_WORDS_HBO : SEED_WORDS).map((s) => ({ lemma: normaliseLemma(s.lemma).headword, gloss: s.gloss, pos: s.pos }));
  return seedPools[lang];
}

/**
 * The wrong glosses a word of `lang` can be asked among (mw-gdcyf98.19): the Greek seed for Greek, as it was; for Hebrew the Hebrew seed and his Hebrew words (the ones he has not dropped and that
 * have a gloss), never a Greek word, so a choice is always another word of the language asked.
 */
export function distractorsFor(lang: SourceLanguage, words: readonly Word[], lexicon?: LemmaLexicon): Distractor[] {
  // a Greek word's wrong choices are answers of the same shape as the right one (a seed word's drill answer, not its five meanings)
  if (lang !== 'hbo') return lexicon ? seedDistractors().map((d) => ({ ...d, gloss: drillGloss({ lemma: d.lemma, lang: 'grc', gloss: d.gloss }, lexicon) })) : seedDistractors();
  const own = words
    .filter((w) => w.lang === 'hbo' && w.state !== 'dropped' && w.gloss.trim() !== '')
    .map((w): Distractor => ({ lemma: nfc(w.lemma), gloss: w.gloss, pos: w.pos ?? '' }));
  const seeded = new Set(own.map((d) => d.lemma));
  return [...own, ...seedDistractors('hbo').filter((d) => !seeded.has(nfc(d.lemma)))];
}

/**
 * The answer a drill gives for a Greek word (mw-5r3p30.1000): the lexicon's `q`, at most three meanings, in place of the gloss he has kept for the word when that is TBESG's own or his
 * seed list's. A gloss he typed himself (Import, his own edit) is his and stays; so does a word the lexicon has no answer for (a Septuagint word, a Hebrew one, a lexicon not loaded).
 */
export function drillGloss(word: Pick<Word, 'lemma' | 'lang' | 'gloss'>, lexicon: LemmaLexicon | undefined): string {
  if (!lexicon || typeof lexicon !== 'object' || word.lang === 'hbo') return word.gloss;
  const key = nfc(word.lemma);
  const entry = Object.hasOwn(lexicon, key) ? lexicon[key] : undefined;
  if (!entry?.q) return word.gloss;
  const seed = seedDistractors().find((s) => nfc(s.lemma) === key)?.gloss;
  return word.gloss === entry.g || word.gloss === seed ? entry.q : word.gloss;
}

/** Whether a wrong choice carries a meaning the right answer has ('man' in 'man, husband' and in 'man, human being'): then it would be right too, and is never offered. */
export function sharesMeaning(a: string, b: string): boolean {
  const mine = new Set(meaningsOf(a).map(shareMeaning));
  return meaningsOf(b).some((m) => mine.has(shareMeaning(m)));
}

/** The right gloss and three others, shuffled (choices.ts): the glosses of seed words of the same part of speech first, its near misses, then any. A wrong one never carries a meaning of the right one. */
export function buildOptions(
  gloss: string,
  pos: string | undefined,
  lemma: string,
  candidates: readonly Distractor[],
  random: Random,
): string[] {
  const others = candidates.filter((c) => c.lemma !== lemma && c.gloss !== gloss && !sharesMeaning(gloss, c.gloss));
  const near = shuffle(others.filter((o) => o.pos === pos), random).map((o) => o.gloss);
  return choicesOf({ right: gloss, near, fillers: others.filter((o) => o.pos !== pos).map((o) => o.gloss) }, random).options;
}

/** One occurrence of a word in a chapter. */
export interface Occurrence {
  /** the word as it is shown, spoken and asked about: cardForm's (a Septuagint word without Swete's mark) */
  form: string;
  /** 'Romans 8:1' */
  reference: string;
  /** the book's code ('rom', '1jn') */
  book: string;
  chapter: number;
  verse: number;
}

const nfc = (s: string) => s.normalize('NFC');

/** The lexicon lemmas a word is found by (NFC), less any that one of `others` owns: μου also lists ἐγώ, which is the word 'I'. */
export function lemmasOf(word: Word, others: ReadonlySet<string> = new Set()): Set<string> {
  return new Set(word.lemmas.map(nfc).filter((l) => !others.has(l)));
}

/** The plural personal pronoun that has its own place among his words, by the lexicon lemma it shares with its singular: ὑμεῖς, ἡμεῖς are lexicon σύ, ἐγώ (mw-indx1x6.72). */
const PLURAL_WORD: Readonly<Record<string, string>> = { 'σύ': 'ὑμεῖς', 'ἐγώ': 'ἡμεῖς' };

/** A first or second person pronoun's parse in the plural ('P-2DP', 'P-1AP'): a form of ὑμεῖς or ἡμεῖς, whatever lemma the lexicon lists it under. */
const PLURAL_PRONOUN = /^P-[12][NGDA]P$/;

/**
 * Whether a Greek word of a chapter is a form of the word whose lemmas these are. A form that is another of
 * his words (ἡμεῖς has the lexicon lemma ἐγώ, but asking it for 'I' would teach the wrong gloss) is not.
 */
export function isFormOf(g: GreekWord, lemmas: ReadonlySet<string>, others: ReadonlySet<string> = new Set()): boolean {
  // a Septuagint word the derivation only guessed (`y` 'g') is not a place the lemma is known to stand: not shown in the Quick test, not drilled (mw-u2w5klk.12)
  return !isGuess(g) && holdsLemma(lemmas, wordLemma(g)) && !others.has(nfc(g.t));
}

/**
 * Whether the word is a plural personal pronoun (ὑμῖν, ἡμῶν) that is a place of the plural word he has (ὑμεῖς, ἡμεῖς) and not of the singular whose lexicon lemma lists it (σύ, ἐγώ):
 * spelling alone does not say so, since only the nominative is the headword (mw-indx1x6.72). The Quick test and Review's Example leave it out of the singular; the parsing drill, which
 * claims a place for the first word that holds it, does not ask.
 */
const isOtherPluralPronoun = (g: GreekWord, others: ReadonlySet<string>): boolean => {
  const plural = PLURAL_WORD[lemmaKeyOf(wordLemma(g))];
  return plural !== undefined && PLURAL_PRONOUN.test(g.p ?? '') && others.has(plural);
};

/**
 * The words that are found by their own forms and not by a lexicon lemma, because the data lists their forms under the lemma of another of his words. The personal pronouns: the data lists
 * every form of 'I' and 'we' under the lemma ἐγώ and of 'you' and 'you (pl)' under σύ, none of which μου, ἡμεῖς or ὑμεῖς equals, so a lemma match gave them no place (mw-indx1x6.74).
 * And εἶπεν, whose forms the data lists under λέγω, which is another of his words (mw-indx1x6.106). `lexicon` is the lemma the data lists the forms under; `parse` the person, number and case
 * (or tense, voice, mood and person) that make a form of this word: ἡμεῖς and ὑμεῖς are the plural, μου the oblique cases of the singular 'my, me', εἶπεν the second aorist active indicative, third singular.
 */
const OWN_FORMS: Readonly<Record<string, { lexicon: string; parse: RegExp }>> = {
  'ἡμεῖς': { lexicon: 'ἐγώ', parse: /^P-1[NGDA]P$/ },
  'ὑμεῖς': { lexicon: 'σύ', parse: /^P-2[NGDA]P$/ },
  'μου': { lexicon: 'ἐγώ', parse: /^P-1[GDA]S$/ },
  'εἶπεν': { lexicon: 'λέγω', parse: /^V-2AAI-3S$/ },
};

/** Whether a Greek word of a chapter is one of the own forms (OWN_FORMS) of `word`. */
const isOwnForm = (g: GreekWord, word: Word, others: ReadonlySet<string>): boolean => {
  const own = word.lang === 'hbo' ? undefined : OWN_FORMS[nfc(word.lemma)];
  return own !== undefined && !isGuess(g) && lemmaKeyOf(wordLemma(g)) === own.lexicon && own.parse.test(g.p ?? '') && !others.has(nfc(g.t));
};

/** Whether a Greek word of a chapter is a place of `word`, whose lemmas (lemmasOf) these are: a form of its lexicon lemmas that is not another's, or one of its own forms (OWN_FORMS). The Quick test, Review and the parsing drill share it (mw-indx1x6.83). */
export const isPlaceOf = (g: GreekWord, word: Word, lemmas: ReadonlySet<string>, others: ReadonlySet<string> = new Set()): boolean =>
  (isFormOf(g, lemmas, others) && !isOtherPluralPronoun(g, others)) || isOwnForm(g, word, others);

/**
 * Every place the chapter has a word, found by any of its lexicon lemmas, or by its own forms when it is a pronoun the data lists under another's lemma (OWN_FORMS). `others` are the headwords of his
 * other words: a lemma one of them owns is left out, and so is a form that is another of them (see lemmasOf, isFormOf).
 */
export function formsOf(chapter: Chapter, word: Word, others: ReadonlySet<string> = new Set()): Occurrence[] {
  const lemmas = lemmasOf(word, others);
  return chapter.verses.flatMap((v) =>
    v.g
      .filter((g) => isPlaceOf(g, word, lemmas, others))
      .map((g) => ({ form: cardForm(chapter, g), reference: `${chapter.book} ${chapter.chapter}:${v.n}`, book: chapter.code, chapter: chapter.chapter, verse: v.n })),
  );
}

export interface Question {
  /** The store's key for the word. */
  lemma: string;
  /** The language the word is in: 'hbo' for a Hebrew word; absent means Greek (a round kept before the Hebrew words has none). */
  lang?: SourceLanguage;
  /** What is shown in Greek: always the dictionary form (the NFC lemma), never an inflected form. */
  prompt: string;
  /** The word as the open chapter has it, shown small only after the answer (PROVISIONAL); absent when the chapter lacks the word or did not load. */
  form?: string;
  /** Where that form is: 'Romans 8:1'. */
  reference?: string;
  /** Where that form is, for Ask the tutor; a round kept before this was added has neither. A round kept before the picker (mw-5r3p30.60) has no book: it was Romans. */
  book?: string;
  chapter?: number;
  verse?: number;
  /** Review only: the form's verse is shown after the answer as 'Example: John 1:44 as ἀπὸ', looked for in his goal first (data/repositories/reviewExamples.ts); the Quick test says 'in John 1:44 as ἀπὸ' */
  example?: true;
  gloss: string;
  options: string[];
}

/** The headwords (NFC) of his other words: a lemma one of them owns is no place of this word (lemmasOf, isFormOf). */
export const othersOf = (word: Word, pool: readonly Distractor[]): Set<string> => new Set(pool.filter((p) => p.lemma !== word.lemma).map((p) => nfc(p.lemma)));

/** The question of a word; `chosen` is the occurrence Review found in his goal (it stands in for the open chapter's); `lexicon` (the Greek lexicon, loadLexicon) gives a Greek word's drill answer, absent it the question is asked with the gloss he has kept. */
export function buildQuestion(word: Word, pool: readonly Distractor[], chapter: Chapter | null, random: Random, lexicon?: LemmaLexicon, chosen?: Occurrence): Question {
  const others = othersOf(word, pool);
  const hebrew = word.lang === 'hbo';
  // a form is shown only from a chapter in the word's own language
  const forms = chapter && sourceLanguage(chapter) === (hebrew ? 'hbo' : 'grc') ? formsOf(chapter, word, others) : [];
  // the draw is made whether or not a place was chosen, so the round's random gives the same options either way
  const drawn = forms.length > 0 ? forms[Math.floor(random() * forms.length)] : undefined;
  const occurrence = chosen ?? drawn;
  const pos = pool.find((p) => p.lemma === word.lemma)?.pos ?? (hebrew ? word.pos : undefined);
  const gloss = drillGloss(word, lexicon);
  return {
    lemma: word.lemma,
    ...(hebrew ? { lang: 'hbo' as const } : {}),
    prompt: nfc(word.lemma),
    form: occurrence?.form,
    reference: occurrence?.reference,
    book: occurrence?.book,
    chapter: occurrence?.chapter,
    verse: occurrence?.verse,
    gloss,
    options: buildOptions(gloss, pos, word.lemma, pool, random),
  };
}

/**
 * Where Ask the tutor sends him from a question, and what the Ask box then holds. A form from the chapter is asked about in
 * its own verse; a word the chapter does not have (or a round kept before verses were stored) is asked about generally, on
 * the chapter's first verse, because the Ask box needs a verse to open on.
 */
export function askAbout(
  q: Question,
  fallback: { book: string; chapter: number; verse: number },
): { book: string; chapter: number; verse: number; text: string } {
  if (q.chapter !== undefined && q.verse !== undefined && q.reference) {
    return { book: q.book ?? 'rom', chapter: q.chapter, verse: q.verse, text: `What does ${q.form ?? q.prompt} mean in ${q.reference}, and why does the verse use that form?` };
  }
  return { ...fallback, text: `What does the ${q.lang === 'hbo' ? 'Hebrew' : 'Greek'} word ${q.prompt} mean ("${q.gloss}"), and how is it used in the ${q.lang === 'hbo' ? 'Old' : 'New'} Testament?` };
}
