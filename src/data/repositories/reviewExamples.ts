// src/data/repositories/reviewExamples.ts — the verse a Review word question names as its Example once he has answered (mw-indx1x6.12). It is looked for in his goal first, the way the idea
// sheet looks for the examples of an idea (grammar/ideaSheet.ts placesOf): the goal's verse, then its pericope, then its chapter, then its book. A word those places lack falls to the chapter
// he last read, which is where a word question always found its form (quizWords.ts loadForms), and a word that stands in none has no Example.
import { BOOK_INDEX } from '../bookIndex';
import { loadChapter, sourceLanguage } from '../chapter';
import type { Word } from '../db';
import { ideaPassage, placesOf } from '../grammar/ideaSheet';
import { formsOf, type Occurrence } from '../quiz';
import { getStudyChapter } from '../readerChapter';
import { getGoal } from './settings';

/**
 * The first occurrence of each of `words` in his goal's nearest place that has it, by the word's lemma (a word absent from the map is in none of the goal's places).
 * `othersOf` gives the headwords of his other words, which a form of this one may not be (formsOf). A chapter that cannot be loaded (offline) stops the search where it is: what was
 * found stands, and the rest are left for the open chapter. Places are loaded only while some word still lacks one, so a goal whose first chapter holds every word reads nothing more.
 */
export async function goalOccurrences(words: readonly Word[], othersOf: (word: Word) => ReadonlySet<string>): Promise<Map<string, Occurrence>> {
  const found = new Map<string, Occurrence>();
  if (words.length === 0) return found;
  try {
    const goal = await getGoal();
    // with no goal the passage is the open chapter, which is where the question looks anyway
    if (!goal.trim()) return found;
    const passage = await ideaPassage(goal, getStudyChapter(), loadChapter, BOOK_INDEX);
    for await (const place of placesOf(passage, loadChapter)) {
      for (const word of words) {
        if (found.has(word.lemma)) continue;
        const language = word.lang === 'hbo' ? 'hbo' : 'grc';
        const occurrence = place.chapters
          .filter((chapter) => sourceLanguage(chapter) === language)
          .flatMap((chapter) => formsOf(chapter, word, othersOf(word)))
          .find((o) => place.verse === undefined || o.verse === place.verse);
        if (occurrence) found.set(word.lemma, occurrence);
      }
      if (found.size >= new Set(words.map((w) => w.lemma)).size) break;
    }
  } catch {
    // the goal's chapters did not load: the words found so far keep theirs
  }
  return found;
}
