// src/data/repositories/answers.ts — what the tutor answered about a verse, kept on the phone. A repository owns its transactions.
import { db, type AnswerWord, type TutorAnswer } from '../db';

export type { AnswerWord, TutorAnswer };

/** The key a verse's answers are kept under: 'rom.8.28'. */
export const verseRef = (book: string, chapter: number, verse: number): string => `${book}.${chapter}.${verse}`;

export async function addAnswer(ref: string, question: string, answer: string, words: AnswerWord[], now = Date.now()): Promise<void> {
  await db.answers.add({ ref, question, answer, words, when: now });
}

/** One verse's answers, the oldest first. */
export function listAnswers(ref: string): Promise<TutorAnswer[]> {
  return db.answers.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}
