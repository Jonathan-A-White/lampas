// src/data/quizWords.ts — the questions of words drawn for the Quick test and Review, in each word's own language (mw-gdcyf98.19): a Hebrew word is asked among Hebrew glosses
// (distractorsFor) and shows its form from the Hebrew chapter he last read; a Greek word is asked as it always was. A chapter is loaded only for a language a drawn word is in;
// a phone that cannot load one shows no form, and the lemma is asked either way.
import { loadChapter, sourceLanguage, type Chapter, type SourceLanguage } from './chapter';
import type { Word } from './db';
import { loadLexicon, type LemmaLexicon } from './lexicon';
import { buildQuestion, distractorsFor, othersOf, type Question, type Random } from './quiz';
import { goalOccurrences } from './repositories/reviewExamples';
import { getStudyChapter } from './readerChapter';

/** The chapter whose forms show beneath a word of `lang` after the answer (getStudyChapter); null when it cannot be loaded, or is in another language (a Hebrew word's forms are not Septuagint Greek, mw-u2w5klk.15). */
export const loadForms = (lang: SourceLanguage): Promise<Chapter | null> => {
  const open = getStudyChapter(lang);
  return loadChapter(open.book, open.chapter).then((chapter) => (chapter && sourceLanguage(chapter) !== lang ? null : chapter), () => null);
};

/**
 * The question of each of `drawn`, in order; `all` is every word he has, which Hebrew questions take their wrong glosses from too. A caller that has already asked for a language's chapter
 * (so it loads beside the words, not after them) hands the promise in `asked`; any other language drawn is loaded here. Review passes `examples` (mw-indx1x6.12): each question's verse is then looked for in his goal
 * first (goalOccurrences) and marked as an Example; the Quick test leaves it out and its form is the open chapter's.
 */
export async function questionsOf(
  drawn: readonly Word[],
  all: readonly Word[],
  random: Random,
  asked: Partial<Record<SourceLanguage, Promise<Chapter | null>>> = {},
  examples = false,
): Promise<Question[]> {
  const languages = [...new Set(drawn.map((w): SourceLanguage => w.lang ?? 'grc'))];
  const chapters = new Map(await Promise.all(languages.map(async (lang) => [lang, await (asked[lang] ?? loadForms(lang))] as const)));
  // a Greek word is asked with its drill answer (mw-5r3p30.1000); a lexicon that cannot be loaded asks it with the gloss he has kept
  const lexicon: LemmaLexicon | undefined = languages.includes('grc') ? await loadLexicon('grc').catch(() => undefined) : undefined;
  const pools = new Map(languages.map((lang) => [lang, distractorsFor(lang, all, lexicon)]));
  const pool = (w: Word) => pools.get(w.lang ?? 'grc') ?? [];
  const goal = examples ? await goalOccurrences(drawn, (w) => othersOf(w, pool(w))) : new Map();
  return drawn.map((w) => {
    const question = buildQuestion(w, pool(w), chapters.get(w.lang ?? 'grc') ?? null, random, lexicon, goal.get(w.lemma));
    return examples && question.form ? { ...question, example: true as const } : question;
  });
}
