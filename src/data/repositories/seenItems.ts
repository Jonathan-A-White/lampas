// src/data/repositories/seenItems.ts — the questions he has been asked, per idea, so the mill is not asked for one he has seen again and a kept one he has seen is not served (mw-indx1x6.1,
// docs/grammar.md 'More items from the mill'). One JSON list of {prompt, ref} per idea in the settings store under 'seenItems.<idea id>', the newest MAX_SEEN, oldest first (no table, outside
// the settings registry as fetchedItems is). Written when a question is asked in Review, Drill it, the short drill or Prove it. A repository owns its transactions.
import { db } from '../db';
import { MAX_SEEN, isFetchable, isSeenQuestion, seenKey, type SeenQuestion } from '../grammar/fetchedItems';
import { ideaOf } from '../grammar/ladder';
import type { GrammarQuestion } from '../grammar/questions';

export const SEEN_PREFIX = 'seenItems.';

/** The seen questions a settings value holds; a value that is not a list, or an entry that is not a seen question, is left out. */
export function parseSeen(value: unknown): SeenQuestion[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter(isSeenQuestion).map((q) => ({ prompt: q.prompt, ref: q.ref })) : [];
  } catch {
    return [];
  }
}

/** Whether a question is one the phone keeps a note of: it is about a verse, and the idea is one the mill is asked about. */
function notable(question: GrammarQuestion): question is GrammarQuestion & { ref: string } {
  if (!question.ref || !question.prompt) return false;
  try {
    return isFetchable(ideaOf(question.ideaId));
  } catch {
    return false;
  }
}

/** Notes that this question was asked: it becomes the newest of its idea (asked again, it moves up), and an idea keeps its newest MAX_SEEN. A question with no verse is not noted. */
export async function noteSeen(question: GrammarQuestion): Promise<void> {
  if (!notable(question)) return;
  const entry: SeenQuestion = { prompt: question.prompt, ref: question.ref };
  await db.transaction('rw', db.settings, async () => {
    const key = SEEN_PREFIX + question.ideaId;
    const kept = parseSeen((await db.settings.get(key))?.value).filter((q) => seenKey(q) !== seenKey(entry));
    await db.settings.put({ key, value: JSON.stringify([...kept, entry].slice(-MAX_SEEN)) });
  });
}

/** Notes a question as asked without ever throwing: an answer being recorded is never held up by it. */
export async function noteAsked(question: GrammarQuestion): Promise<void> {
  await noteSeen(question).catch((error: unknown) => console.warn('could not note a question as seen', error));
}

/** The questions he has been asked on an idea, the oldest first. */
export async function listSeen(ideaId: string): Promise<SeenQuestion[]> {
  return parseSeen((await db.settings.get(SEEN_PREFIX + ideaId))?.value);
}

/** The questions he has been asked on each of these ideas (an idea with none is left out of the map). */
export async function listSeenOf(ideaIds: readonly string[]): Promise<Map<string, SeenQuestion[]>> {
  const seen = new Map<string, SeenQuestion[]>();
  for (const id of new Set(ideaIds)) {
    const list = await listSeen(id);
    if (list.length > 0) seen.set(id, list);
  }
  return seen;
}
