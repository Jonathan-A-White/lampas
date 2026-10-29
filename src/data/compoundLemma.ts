// src/data/compoundLemma.ts — the Dexie v34 upgrade (mw-5r3p30.868). Until 0.7.19 the data gave four words a compound lemma ('Ἕλλην=Ἕλλην', 'Ἑλληνιστί=Ἑλληνικός' ...); a word he
// saved then is stored under it, with its answers, its review and perhaps a memory note. The headword is now the part before '=' (mw-5r3p30.864), so every stored lemma, and every
// key built from one, is rewritten to it. A row that meets one already under the plain lemma is merged, and nothing is dropped: answers are rows of their own and all stay, the
// review with the longer history stays whole, a word keeps the earlier date, a memory note keeps both texts.
// This file imports nothing from the app (db.ts imports it, and the worker reads db.ts); it names tables by string.
import type { Transaction } from 'dexie';

/** The longest a memory note is (src/data/repositories/memory.ts MEMORY_NOTE_MAX, which imports db.ts and so cannot be imported here). */
const NOTE_MAX = 2000;

/** The headword of a stored lemma: the part before '='; a lemma with no '=' as it is. */
export const plainLemma = (lemma: string): string => {
  const at = lemma.indexOf('=');
  return at < 0 ? lemma : lemma.slice(0, at);
};

const isCompound = (lemma: unknown): lemma is string => typeof lemma === 'string' && lemma.includes('=');

interface WordRow {
  lemma: string;
  lemmas?: string[];
  gloss?: string;
  pos?: string;
  source?: string;
  lesson?: number;
  state?: string;
  since?: number;
  lang?: string;
}
interface ReviewRow {
  kind: string;
  id: string;
  step?: number;
  lastWhen?: number;
  recent?: unknown[];
}
interface MemoryNoteRow {
  name: string;
  text: string;
  when: number;
  by: string;
}

/** How much history a review row has: the answers it remembers, then how far up the steps it went, then how late it was last answered. */
const historyOf = (row: ReviewRow | undefined): [number, number, number] => [row?.recent?.length ?? 0, row?.step ?? 0, row?.lastWhen ?? 0];
function longer(a: ReviewRow | undefined, b: ReviewRow | undefined): boolean {
  const [x, y] = [historyOf(a), historyOf(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

/** Two words of one headword as one: the state of the one with the longer review history, the earlier date, the earlier lesson that is a lesson, and what either one knew of it. */
function mergeWords(moved: WordRow, kept: WordRow, movedWins: boolean): WordRow {
  const [base, other] = movedWins ? [moved, kept] : [kept, moved];
  const lessons = [base.lesson, other.lesson].filter((n): n is number => typeof n === 'number' && n > 0);
  const lemmas = [...new Set([...(base.lemmas ?? []), ...(other.lemmas ?? [])].map(plainLemma))];
  const merged: WordRow = { ...other, ...base, lemma: plainLemma(kept.lemma), lemmas, lesson: lessons.length > 0 ? Math.min(...lessons) : 0 };
  merged.gloss = base.gloss || other.gloss || '';
  for (const key of ['pos', 'source'] as const) if (!base[key] && other[key]) merged[key] = other[key];
  if (typeof base.since === 'number' && typeof other.since === 'number') merged.since = Math.min(base.since, other.since);
  return merged;
}

async function moveWords(tx: Transaction): Promise<void> {
  const words = tx.table<WordRow, string>('words');
  const reviews = tx.table<ReviewRow, [string, string]>('reviews');
  for (const word of await words.filter((w) => isCompound(w.lemma) || (w.lemmas ?? []).some(isCompound)).toArray()) {
    const clean = plainLemma(word.lemma);
    if (clean === word.lemma) {
      // already under the plain headword: only the lexicon lemmas it matches (the index) carry the '='
      await words.put({ ...word, lemmas: [...new Set((word.lemmas ?? []).map(plainLemma))] });
      continue;
    }
    const existing = await words.get(clean);
    await words.delete(word.lemma);
    if (!existing) {
      await words.put({ ...word, lemma: clean, lemmas: [...new Set((word.lemmas ?? []).map(plainLemma))] });
      continue;
    }
    const wins = longer(await reviews.get(['word', word.lemma]), await reviews.get(['word', clean]));
    await words.put(mergeWords(word, existing, wins));
  }
}

async function moveReviews(tx: Transaction): Promise<void> {
  const reviews = tx.table<ReviewRow, [string, string]>('reviews');
  for (const row of await reviews.filter((r) => r.kind === 'word' && isCompound(r.id)).toArray()) {
    const clean = plainLemma(row.id);
    const existing = await reviews.get(['word', clean]);
    await reviews.delete(['word', row.id]);
    await reviews.put({ ...(existing && !longer(row, existing) ? existing : row), id: clean });
  }
}

/** Rows that keep one lemma in a field of their own (results, drills): the lemma is rewritten, every row stays. */
async function moveLemmaField(tx: Transaction, name: string): Promise<void> {
  const table = tx.table<{ lemma: string }, number>(name);
  const rows = await table.filter((r) => isCompound(r.lemma)).toArray();
  await table.bulkPut(rows.map((r) => ({ ...r, lemma: plainLemma(r.lemma) })));
}

interface WordLink {
  lemma?: unknown;
}
/** A tutor answer or a talk turn: the lemmas of its words, of the words it added, and of the links and the offer that name one. Returns whether it changed anything. */
function cleanTurn(row: {
  words?: WordLink[];
  added?: string[];
  already?: string[];
  unknown?: string[];
  links?: Array<{ kind?: string } & WordLink>;
  greekOffer?: WordLink;
}): boolean {
  let changed = false;
  const fixLemma = (holder: WordLink | undefined): void => {
    if (holder && isCompound(holder.lemma)) {
      holder.lemma = plainLemma(holder.lemma);
      changed = true;
    }
  };
  row.words?.forEach(fixLemma);
  row.links?.filter((l) => l.kind === 'word').forEach(fixLemma);
  fixLemma(row.greekOffer);
  for (const key of ['added', 'already', 'unknown'] as const) {
    const list = row[key];
    if (list?.some(isCompound)) {
      row[key] = [...new Set(list.map(plainLemma))];
      changed = true;
    }
  }
  return changed;
}

async function moveTurns(tx: Transaction, name: 'answers' | 'talks'): Promise<void> {
  const table = tx.table<Parameters<typeof cleanTurn>[0], number>(name);
  const changed: Array<Parameters<typeof cleanTurn>[0]> = [];
  await table.each((row) => {
    if (cleanTurn(row)) changed.push(row);
  });
  await table.bulkPut(changed);
}

const byName = (a: MemoryNoteRow, b: MemoryNoteRow): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** The memory notes ('word:<lemma>' names, in the settings store as one JSON list): a note named for a compound lemma takes the plain one; two notes of one name become one with both texts, the older first. */
async function moveMemoryNotes(tx: Transaction): Promise<void> {
  const settings = tx.table<{ key: string; value: string }, string>('settings');
  const stored = await settings.get('memoryNotes');
  if (!stored) return;
  let notes: MemoryNoteRow[];
  try {
    const parsed: unknown = JSON.parse(stored.value);
    if (!Array.isArray(parsed)) return;
    notes = parsed as MemoryNoteRow[];
  } catch {
    return;
  }
  if (!notes.some((n) => typeof n?.name === 'string' && n.name.startsWith('word:') && isCompound(n.name))) return;
  const byKey = new Map<string, MemoryNoteRow>();
  for (const note of notes) {
    const name = typeof note?.name === 'string' && note.name.startsWith('word:') ? `word:${plainLemma(note.name.slice(5))}` : note?.name;
    const earlier = byKey.get(name);
    if (!earlier) {
      byKey.set(name, { ...note, name });
      continue;
    }
    const [old, newer] = earlier.when <= note.when ? [earlier, note] : [note, earlier];
    const joined = `${old.text}\n\n${newer.text}`;
    byKey.set(name, { name, text: joined.length <= NOTE_MAX ? joined : newer.text, when: newer.when, by: newer.by });
  }
  await settings.put({ key: 'memoryNotes', value: JSON.stringify([...byKey.values()].sort(byName)) });
}

/** The v34 upgrade: see the top of this file. Words first, because a merged word reads the two reviews before they are merged themselves. */
export async function moveCompoundLemmas(tx: Transaction): Promise<void> {
  await moveWords(tx);
  await moveReviews(tx);
  await moveLemmaField(tx, 'results');
  await moveLemmaField(tx, 'drills');
  await moveTurns(tx, 'answers');
  await moveTurns(tx, 'talks');
  await moveMemoryNotes(tx);
}
