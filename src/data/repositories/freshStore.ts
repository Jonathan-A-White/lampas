// src/data/repositories/freshStore.ts — the stores learn-kit/fresh runs over (mw-74h98vg.1, docs/grammar.md 'More items from the mill' and 'Confirming a missed idea'). The rule, the ledger and the stock are the kit's;
// Lampas keeps what they read and write in the settings store, under the keys mw-indx1x6 first wrote, so a phone updated mid-way loses nothing:
//   'seenItems.<idea id>'    the questions he has been asked on the idea, newest 30, oldest first: a JSON list of {prompt, ref}. The kit's key of one is seenKey of it (questionKey), so the ledger is the kit's `asked`.
//   'toConfirm'              the ideas marked to confirm: a JSON list of idea ids.
//   'fetchedItems.<idea id>' the questions the mill wrote and the stock keeps for the idea, oldest first: a JSON list of questions.
// All outside the settings registry (no table), so only a finished answer or fetch writes them. A repository owns its transactions.
import { asked, markAsked, type FreshStore, type StockStore } from 'learn-kit/fresh';
import { db } from '../db';
import { MAX_KEPT, isFetchable, isKeptQuestion, isSeenQuestion, seenKey, type SeenQuestion } from '../grammar/fetchedItems';
import { ideaOf } from '../grammar/ladder';
import type { GrammarQuestion } from '../grammar/questions';

export const SEEN_PREFIX = 'seenItems.';
export const KEPT_PREFIX = 'fetchedItems.';
const MARKS_KEY = 'toConfirm';

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

function parseIds(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** The questions a settings value holds; a value that is not a list, or an item that is not a drawable question, is left out. */
export function parseKept(value: unknown): GrammarQuestion[] {
  if (typeof value !== 'string') return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter(isKeptQuestion) : [];
  } catch {
    return [];
  }
}

// ---- the ledger ----

/** The prompt and verse a key was made of, as the question had them (a key is lower-cased and its spacing made one: the settings store keeps what he was asked). */
const originals = new Map<string, SeenQuestion>();
const MAX_ORIGINALS = 200;

/**
 * The kit's key of a question: seenKey of its prompt and verse (what makes two questions the same one: the case and the spacing aside). The question is remembered as it was asked until the ledger
 * writes it, so the store keeps its prompt and verse, not the key's lower-cased form.
 */
export function questionKey(question: { prompt: string; ref?: string }): string {
  const key = seenKey({ prompt: question.prompt, ref: question.ref ?? '' });
  if (question.ref) {
    originals.delete(key);
    originals.set(key, { prompt: question.prompt, ref: question.ref });
    if (originals.size > MAX_ORIGINALS) originals.delete(originals.keys().next().value as string);
  }
  return key;
}

/** A key read back as a question, when nothing better is known: seenKey is `prompt|verse`, and a verse holds no bar. */
function decoded(key: string): SeenQuestion | undefined {
  const bar = key.lastIndexOf('|');
  const entry = { prompt: key.slice(0, bar), ref: key.slice(bar + 1) };
  return bar > 0 && isSeenQuestion(entry) ? entry : undefined;
}

/** The kit's FreshStore over the settings store: the ledger of 'seenItems.<idea id>' and the marks of 'toConfirm'. */
export const freshStore: FreshStore = {
  async getAsked(ideaId) {
    return parseSeen((await db.settings.get(SEEN_PREFIX + ideaId))?.value).map(seenKey);
  },
  async putAsked(ideaId, keys) {
    const key = SEEN_PREFIX + ideaId;
    const stored = new Map(parseSeen((await db.settings.get(key))?.value).map((q) => [seenKey(q), q]));
    const entries = keys.flatMap((k) => {
      const entry = stored.get(k) ?? originals.get(k) ?? decoded(k);
      return entry ? [{ prompt: entry.prompt, ref: entry.ref }] : [];
    });
    for (const k of keys) originals.delete(k);
    if (entries.length > 0) await db.settings.put({ key, value: JSON.stringify(entries) });
    else await db.settings.delete(key);
  },
  async listToConfirm() {
    return parseIds((await db.settings.get(MARKS_KEY))?.value);
  },
  async markToConfirm(ideaId) {
    await db.transaction('rw', db.settings, async () => {
      const ids = parseIds((await db.settings.get(MARKS_KEY))?.value);
      if (!ids.includes(ideaId)) await db.settings.put({ key: MARKS_KEY, value: JSON.stringify([...ids, ideaId]) });
    });
  },
  async clearToConfirm(ideaId) {
    await db.transaction('rw', db.settings, async () => {
      const ids = parseIds((await db.settings.get(MARKS_KEY))?.value);
      if (ids.includes(ideaId)) await db.settings.put({ key: MARKS_KEY, value: JSON.stringify(ids.filter((id) => id !== ideaId)) });
    });
  },
};

/** The kit's StockStore over the settings store: the questions the mill wrote for an idea, oldest first ('fetchedItems.<idea id>'); an idea with none has no row. */
export const keptStore: StockStore<GrammarQuestion> = {
  async get(ideaId) {
    return parseKept((await db.settings.get(KEPT_PREFIX + ideaId))?.value);
  },
  async put(ideaId, items) {
    if (items.length > 0) await db.settings.put({ key: KEPT_PREFIX + ideaId, value: JSON.stringify(items) });
    else await db.settings.delete(KEPT_PREFIX + ideaId);
  },
};

/** Keeps these items after the ones already kept for their ideas; an idea keeps its newest MAX_KEPT. */
export async function saveKept(items: readonly GrammarQuestion[]): Promise<void> {
  const ideas = [...new Set(items.map((q) => q.ideaId))];
  await db.transaction('rw', db.settings, async () => {
    for (const id of ideas) {
      const kept = await keptStore.get(id);
      await keptStore.put(id, [...kept, ...items.filter((q) => q.ideaId === id)].slice(-MAX_KEPT));
    }
  });
}

// ---- what the screens ask of them ----

/** Whether a question is one the phone keeps a note of: it is about a verse, and the idea is one the mill is asked about. */
function notable(question: GrammarQuestion): question is GrammarQuestion & { ref: string } {
  if (!question.ref || !question.prompt) return false;
  try {
    return isFetchable(ideaOf(question.ideaId));
  } catch {
    return false;
  }
}

/** Notes that this question was asked: it becomes the newest of its idea (asked again, it moves up), and an idea keeps its newest 30. A question with no verse is not noted. */
export async function noteSeen(question: GrammarQuestion): Promise<void> {
  if (!notable(question)) return;
  await markAsked(freshStore, question.ideaId, questionKey(question));
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

/** The kit's keys of the questions he has been asked on an idea (the kit's `asked`): what Prove it counts a right answer against. */
export const askedKeys = (ideaId: string): Promise<string[]> => asked(freshStore, ideaId);

/** The ideas marked 'to confirm'. */
export async function listToConfirm(): Promise<string[]> {
  return [...(await freshStore.listToConfirm())];
}

/** Whether this idea is marked 'to confirm'. */
export async function isToConfirm(ideaId: string): Promise<boolean> {
  return (await listToConfirm()).includes(ideaId);
}
