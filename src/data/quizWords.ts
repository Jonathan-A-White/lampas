// src/data/quizWords.ts — the questions of words drawn for the Quick test and Review, in each word's own language (mw-gdcyf98.19): a Hebrew word is asked among Hebrew glosses
// (distractorsFor) and shows its form from the Hebrew chapter he last read; a Greek word is asked as it always was. A chapter is loaded only for a language a drawn word is in;
// a phone that cannot load one shows no form, and the lemma is asked either way.
import { loadChapter, type Chapter, type SourceLanguage } from './chapter';
import type { Word } from './db';
import { buildQuestion, distractorsFor, type Question, type Random } from './quiz';
import { getStudyChapter } from './readerChapter';

/** The chapter whose forms show beneath a word of `lang` after the answer (getStudyChapter); null when it cannot be loaded. */
export const loadForms = (lang: SourceLanguage): Promise<Chapter | null> => {
  const open = getStudyChapter(lang);
  return loadChapter(open.book, open.chapter).catch(() => null);
};

/** The question of each of `drawn`, in order; `all` is every word he has, which Hebrew questions take their wrong glosses from too. */
export async function questionsOf(drawn: readonly Word[], all: readonly Word[], random: Random): Promise<Question[]> {
  const languages = [...new Set(drawn.map((w): SourceLanguage => w.lang ?? 'grc'))];
  const chapters = new Map(await Promise.all(languages.map(async (lang) => [lang, await loadForms(lang)] as const)));
  const pools = new Map(languages.map((lang) => [lang, distractorsFor(lang, all)]));
  return drawn.map((w) => buildQuestion(w, pools.get(w.lang ?? 'grc') ?? [], chapters.get(w.lang ?? 'grc') ?? null, random));
}
