// src/data/repositories/answers.ts — what the tutor answered about a verse, kept on the phone. A repository owns its transactions.
import { db, type AnswerWord, type TutorAnswer } from '../db';

export type { AnswerWord, TutorAnswer };

/** The key a verse's answers are kept under: 'rom.8.28'; a passage's, '1-11' for `verse` (src/data/passage.ts unitId): 'rom.8.1-11'. */
export const verseRef = (book: string, chapter: number, verse: number | string): string => `${book}.${chapter}.${verse}`;

/** Keeps an answer with the question as he said it and, when the tutor gave one, the question cleaned up (shown in its place). */
export async function addAnswer(ref: string, question: string, answer: string, words: AnswerWord[], now = Date.now(), cleanQuestion?: string): Promise<void> {
  await db.answers.add({ ref, question, ...(cleanQuestion ? { cleanQuestion } : {}), answer, words, when: now });
}

/** One verse's answers, the oldest first. */
export function listAnswers(ref: string): Promise<TutorAnswer[]> {
  return db.answers.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}
