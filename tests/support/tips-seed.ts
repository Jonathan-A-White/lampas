// tests/support/tips-seed.ts — rows the tips' summary counts, with text the summary must never carry.
import { db } from '../../src/data/db';

/** One tutor answer to a question whose text must not reach the summary. */
export async function addAsk(): Promise<void> {
  await db.answers.add({ ref: 'rom.8.28', question: 'what is agape', answer: 'love', words: [], when: 1 });
}
