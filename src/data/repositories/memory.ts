// src/data/repositories/memory.ts — Memory (mw-yrmkdf.1): the notes Lampas keeps about the reader, on the phone: one capped index and named notes
// ('book:Romans', 'word:λόγος', 'topic:aorist'), each with when it was last changed and by whom ('me' or 'tutor'). Beside the profile (profile.ts), in the
// settings store as two JSON values ('memoryIndex', 'memoryNotes'): no table, no Dexie version, and outside the settings registry, which the tutor may
// change by itself. The tutor's only write is an append (appendToNote, appendToIndex); a replace or a remove from a talk goes through src/talk/memoryUpdate.ts,
// which allows it only when the reader asked. selectNotes is what every tutor request carries (src/data/learnerMemory.ts); Settings > Memory
// (src/MemoryScreen.tsx) reads, edits, deletes, exports and imports. The notes the tutor wished it had are only counted here (keepWishedNotes).
import { db } from '../db';
import { BOOKS } from '../books';
import { OT_BOOKS } from '../otBooks';
import { parseCanonReference } from '../../nav/links';
import { dayOf } from './usage';

const INDEX_KEY = 'memoryIndex';
const NOTES_KEY = 'memoryNotes';
const WISHED_KEY = 'memoryWished';

/** The most the index is, as the tutor reads it: what he writes and the notes section the app keeps. */
export const MEMORY_INDEX_MAX = 1500;
/** The room the notes section always has in the index, so the notes are listed however much he writes: he writes at most MEMORY_INDEX_BODY_MAX. */
export const MEMORY_SECTION_ROOM = 500;
export const MEMORY_INDEX_BODY_MAX = MEMORY_INDEX_MAX - MEMORY_SECTION_ROOM;
/** The longest a note is, in characters. */
export const MEMORY_NOTE_MAX = 2000;
/** The most notes kept, and the longest a note's name and its summary line in the index are. */
export const MEMORY_NOTES_MAX = 40;
export const MEMORY_NAME_MAX = 60;
export const MEMORY_SUMMARY_MAX = 60;

export type MemoryBy = 'me' | 'tutor';

export interface MemoryNote {
  /** 'book:<Book>' | 'word:<lemma>' | 'topic:<slug>' */
  name: string;
  text: string;
  /** when it was last changed (ms since the epoch) */
  when: number;
  by: MemoryBy;
}

/** The index: `body` is what he (or the tutor, by appending) wrote; `notes` is the section the app keeps from the notes ('' with none); `text` is both, as the
 *  tutor reads it. `when` and `by` are missing until the body has been written. */
export interface MemoryIndex {
  body: string;
  notes: string;
  text: string;
  when?: number;
  by?: MemoryBy;
}

export type PutResult = 'saved' | 'bad-name' | 'empty' | 'too-long' | 'full';
export type IndexResult = 'saved' | 'empty' | 'too-long';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isBy = (value: unknown): value is MemoryBy => value === 'me' || value === 'tutor';

const BOOK_NAMES: ReadonlySet<string> = new Set([...BOOKS.map((b) => b.name), ...OT_BOOKS.map((b) => b.name)]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The name as it is kept (NFC, trimmed), or null when it is not book:<a book of the Bible>, word:<one word> or topic:<a-slug>. */
export function memoryName(raw: string): string | null {
  const name = raw.normalize('NFC').trim();
  if (name.length > MEMORY_NAME_MAX) return null;
  const colon = name.indexOf(':');
  if (colon < 0) return null;
  const kind = name.slice(0, colon);
  const rest = name.slice(colon + 1);
  if (kind === 'book' && BOOK_NAMES.has(rest)) return name;
  if (kind === 'word' && rest !== '' && !/\s/u.test(rest)) return name;
  if (kind === 'topic' && SLUG.test(rest)) return name;
  return null;
}

const isNote = (value: unknown): value is MemoryNote =>
  isObject(value) &&
  typeof value.name === 'string' &&
  memoryName(value.name) === value.name &&
  typeof value.text === 'string' &&
  value.text.trim() !== '' &&
  value.text.length <= MEMORY_NOTE_MAX &&
  typeof value.when === 'number' &&
  Number.isFinite(value.when) &&
  isBy(value.by);

const byName = (a: MemoryNote, b: MemoryNote): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const noteOf = (n: MemoryNote): MemoryNote => ({ name: n.name, text: n.text, when: n.when, by: n.by });

/** What is stored for the index. */
interface StoredIndex {
  body: string;
  when: number;
  by: MemoryBy;
}

const isStoredIndex = (value: unknown): value is StoredIndex =>
  isObject(value) && typeof value.body === 'string' && value.body.length <= MEMORY_INDEX_BODY_MAX && typeof value.when === 'number' && Number.isFinite(value.when) && isBy(value.by);

function json(raw: unknown): unknown {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

const readNotes = async (): Promise<MemoryNote[]> => {
  const value = json((await db.settings.get(NOTES_KEY))?.value);
  return (Array.isArray(value) ? value.filter(isNote) : []).slice(0, MEMORY_NOTES_MAX).map(noteOf).sort(byName);
};
const writeNotes = (notes: MemoryNote[]) => db.settings.put({ key: NOTES_KEY, value: JSON.stringify([...notes].sort(byName)) });

const readStoredIndex = async (): Promise<StoredIndex | undefined> => {
  const value = json((await db.settings.get(INDEX_KEY))?.value);
  return isStoredIndex(value) ? { body: value.body, when: value.when, by: value.by } : undefined;
};
const writeStoredIndex = (index: StoredIndex) => db.settings.put({ key: INDEX_KEY, value: JSON.stringify(index) });

/** The first line of a note, cut to a summary. */
function summaryOf(text: string): string {
  const line = text.split('\n')[0].trim();
  return line.length <= MEMORY_SUMMARY_MAX ? line : line.slice(0, MEMORY_SUMMARY_MAX - 1).trimEnd() + '…';
}

/** The notes section: a heading and one line per note, its name and a one-line summary, as many as fit in what the body leaves of MEMORY_INDEX_MAX. */
export function notesSection(notes: readonly MemoryNote[], bodyLength: number): string {
  if (notes.length === 0) return '';
  const room = MEMORY_INDEX_MAX - bodyLength - (bodyLength > 0 ? 2 : 0);
  const heading = 'Notes:';
  let section = heading;
  for (const n of notes) {
    const next = `${section}\n- ${n.name} — ${summaryOf(n.text)}`;
    if (next.length > room) break;
    section = next;
  }
  return section === heading ? '' : section;
}

function indexOf(stored: StoredIndex | undefined, notes: readonly MemoryNote[]): MemoryIndex {
  const body = stored?.body ?? '';
  const section = notesSection(notes, body.length);
  const index: MemoryIndex = { body, notes: section, text: body && section ? `${body}\n\n${section}` : body || section };
  if (stored) {
    index.when = stored.when;
    index.by = stored.by;
  }
  return index;
}

/** The index as it is kept now. */
export async function getIndex(): Promise<MemoryIndex> {
  return db.transaction('r', db.settings, async () => indexOf(await readStoredIndex(), await readNotes()));
}

/** What he wrote, without the notes section the app keeps (a text that carries it, as `getIndex().text` does, loses it). */
const bodyOf = (text: string): string => {
  const at = text.search(/(?:^|\n\n)Notes:\n- /);
  return (at < 0 ? text : text.slice(0, at)).trim();
};

/** Writes the index body (trimmed; anything from the notes section on is dropped). Refused when it is longer than MEMORY_INDEX_BODY_MAX. */
export function setIndex(text: string, by: MemoryBy = 'me', when: number = Date.now()): Promise<IndexResult> {
  const body = bodyOf(text);
  if (body.length > MEMORY_INDEX_BODY_MAX) return Promise.resolve('too-long');
  return db.transaction('rw', db.settings, async (): Promise<IndexResult> => {
    await writeStoredIndex({ body, when, by });
    return 'saved';
  });
}

/** Adds `line` to the end of the index on a line of its own: the tutor's only write to the index. */
export function appendToIndex(line: string, by: MemoryBy = 'tutor', when: number = Date.now()): Promise<IndexResult> {
  const add = line.trim();
  return db.transaction('rw', db.settings, async (): Promise<IndexResult> => {
    if (add === '') return 'empty';
    const kept = await readStoredIndex();
    const body = kept && kept.body !== '' ? `${kept.body}\n${add}` : add;
    if (body.length > MEMORY_INDEX_BODY_MAX) return 'too-long';
    await writeStoredIndex({ body, when, by });
    return 'saved';
  });
}

/** The line the index keeps when he said no to the tutor's offer of the Greek (mw-yrmkdf.4): the tutor offers no more until he asks for Greek himself. */
export const GREEK_NO_PREFIX = 'said no to the Greek offer';
/** The whole line for a no said at `when`: 'said no to the Greek offer 2026-10-13', the phone's own day (as the page's 'Changed' line shows it), never the UTC one (mw-yrmkdf.9). */
export const greekNoLine = (when: number): string => `${GREEK_NO_PREFIX} ${dayOf(when)}`;
/** True when the index text holds the no, on a line of its own. */
export const hasGreekNo = (indexText: string): boolean => new RegExp(`^${GREEK_NO_PREFIX}`, 'm').test(indexText);

/** Writes his no to the Greek offer to the end of the index, once: a second no changes nothing. */
export function noteGreekNo(when: number = Date.now()): Promise<IndexResult> {
  return db.transaction('rw', db.settings, async (): Promise<IndexResult> => {
    const kept = await readStoredIndex();
    if (kept && hasGreekNo(kept.body)) return 'saved';
    return appendToIndex(greekNoLine(when), 'tutor', when);
  });
}

/** Takes his no to the Greek offer out of the index (he asked for Greek himself); the rest of the index stays as it was. */
export function clearGreekNo(when: number = Date.now()): Promise<void> {
  return db.transaction('rw', db.settings, async (): Promise<void> => {
    const kept = await readStoredIndex();
    if (!kept || !hasGreekNo(kept.body)) return;
    const body = kept.body.split('\n').filter((line) => !line.startsWith(GREEK_NO_PREFIX)).join('\n').trim();
    await writeStoredIndex({ body, when, by: kept.by });
  });
}

/** Every note, by name. */
export const listNotes = (): Promise<MemoryNote[]> => readNotes();

/** The note named `name`, or undefined. */
export async function getNote(name: string): Promise<MemoryNote | undefined> {
  const wanted = memoryName(name);
  return wanted === null ? undefined : (await readNotes()).find((n) => n.name === wanted);
}

/** Puts `text` (trimmed) under `name`, replacing the note there; it keeps when and by whom. */
export function putNote(name: string, text: string, by: MemoryBy = 'me', when: number = Date.now()): Promise<PutResult> {
  const kept = memoryName(name);
  const body = text.trim();
  return db.transaction('rw', db.settings, async (): Promise<PutResult> => {
    if (kept === null) return 'bad-name';
    if (body === '') return 'empty';
    if (body.length > MEMORY_NOTE_MAX) return 'too-long';
    const notes = await readNotes();
    const others = notes.filter((n) => n.name !== kept);
    if (others.length === notes.length && notes.length >= MEMORY_NOTES_MAX) return 'full';
    await writeNotes([...others, { name: kept, text: body, when, by }]);
    return 'saved';
  });
}

/** Adds `line` to the end of the note `name` on a line of its own, making the note when it is not there: the tutor's only write to a note. */
export function appendToNote(name: string, line: string, by: MemoryBy = 'tutor', when: number = Date.now()): Promise<PutResult> {
  const kept = memoryName(name);
  const add = line.trim();
  return db.transaction('rw', db.settings, async (): Promise<PutResult> => {
    if (kept === null) return 'bad-name';
    if (add === '') return 'empty';
    const notes = await readNotes();
    const there = notes.find((n) => n.name === kept);
    if (!there && notes.length >= MEMORY_NOTES_MAX) return 'full';
    const text = there ? `${there.text}\n${add}` : add;
    if (text.length > MEMORY_NOTE_MAX) return 'too-long';
    await writeNotes([...notes.filter((n) => n.name !== kept), { name: kept, text, when, by }]);
    return 'saved';
  });
}

/** Drops the note `name`. */
export async function removeNote(name: string): Promise<void> {
  const kept = memoryName(name);
  if (kept === null) return;
  await db.transaction('rw', db.settings, async () => {
    const notes = await readNotes();
    if (notes.some((n) => n.name === kept)) await writeNotes(notes.filter((n) => n.name !== kept));
  });
}

/** What a request may carry: the index as the tutor reads it, and the notes named for the place, the word and the screen. */
export interface MemorySelection {
  index: string;
  notes: MemoryNote[];
}

/** The index and the notes that match by name: the book of `reference` ('Romans 8:28' -> book:Romans), the word `focusLemma` (word:<NFC lemma>) and the
 *  screen (its topic: 'Goal' -> topic:goal). A note that matches nothing asked for is left out. */
export async function selectNotes(reference: string | undefined, focusLemma: string | undefined, screen: string | undefined): Promise<MemorySelection> {
  const wanted = new Set<string>();
  const place = reference ? parseCanonReference(reference) : null;
  const book = place && [...BOOKS, ...OT_BOOKS].find((b) => b.code === place.book);
  if (book) wanted.add(`book:${book.name}`);
  if (focusLemma && focusLemma.trim() !== '') wanted.add(`word:${focusLemma.normalize('NFC').trim()}`);
  const topic = screen?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (topic) wanted.add(`topic:${topic}`);
  return db.transaction('r', db.settings, async () => {
    const [stored, notes] = [await readStoredIndex(), await readNotes()];
    return { index: indexOf(stored, notes).text, notes: notes.filter((n) => wanted.has(n.name)) };
  });
}

// Export and import: one JSON file. It carries no date of its own, so the same memory is the same bytes and an import exports back to the file it came from.
const FORMAT = 'lampas-memory';
const VERSION = 1;

/** A memory file, read: what it would put on the phone. */
export interface MemoryFile {
  index: StoredIndex | null;
  notes: MemoryNote[];
}

const fileText = (file: MemoryFile): string =>
  JSON.stringify({ format: FORMAT, version: VERSION, index: file.index ? { body: file.index.body, when: file.index.when, by: file.index.by } : null, notes: file.notes.map(noteOf) }, null, 2) + '\n';

/** The whole memory as one file's text. */
export async function exportMemory(): Promise<string> {
  const [index, notes] = await db.transaction('r', db.settings, async () => [await readStoredIndex(), await readNotes()] as const);
  return fileText({ index: index ?? null, notes });
}

/** Reads a memory file's text for what it holds, or null when it is not a Lampas memory (the wrong format or version, or any index or note not as kept). */
export function readMemoryFile(text: string): MemoryFile | null {
  const value = json(text);
  if (!isObject(value) || value.format !== FORMAT || value.version !== VERSION || !Array.isArray(value.notes)) return null;
  if (value.index !== null && !isStoredIndex(value.index)) return null;
  if (value.notes.length > MEMORY_NOTES_MAX || !value.notes.every(isNote)) return null;
  const names = value.notes.map((n) => n.name);
  if (new Set(names).size !== names.length) return null;
  return { index: value.index === null ? null : { body: value.index.body, when: value.index.when, by: value.index.by }, notes: value.notes.map(noteOf).sort(byName) };
}

/** Puts a memory file in place of what is kept: the index and every note. */
export async function replaceMemory(file: MemoryFile): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    if (file.index) await writeStoredIndex(file.index);
    else await db.settings.delete(INDEX_KEY);
    if (file.notes.length > 0) await writeNotes(file.notes);
    else await db.settings.delete(NOTES_KEY);
  });
}

export type ImportResult = { status: 'imported'; notes: number; index: boolean } | { status: 'bad-file' };

/** Replaces what is kept by the memory file `text`; a file that is not one changes nothing. (The screen asks first.) */
export async function importMemory(text: string): Promise<ImportResult> {
  const file = readMemoryFile(text);
  if (!file) return { status: 'bad-file' };
  await replaceMemory(file);
  return { status: 'imported', notes: file.notes.length, index: file.index !== null };
}

/** How many names of wished-for notes are kept (the count is of all of them). */
export const WISHED_NAMES_KEPT = 20;

/** The notes the tutor said (in `wished_notes`) it would have used had they existed: how many times, and the names of the last WISHED_NAMES_KEPT, oldest first. */
export interface WishedNotes {
  count: number;
  names: string[];
}

export async function getWishedNotes(): Promise<WishedNotes> {
  const value = json((await db.settings.get(WISHED_KEY))?.value);
  if (!isObject(value) || typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 0 || !Array.isArray(value.names)) return { count: 0, names: [] };
  return { count: value.count, names: value.names.filter((n): n is string => typeof n === 'string' && memoryName(n) === n).slice(-WISHED_NAMES_KEPT) };
}

/** Counts the wished-for note names (each in the naming scheme, or it is left out) and keeps the last WISHED_NAMES_KEPT, a name wished again moving to the end. Returns how many it counted. Nothing else is done for them. */
export async function keepWishedNotes(names: readonly string[]): Promise<number> {
  const wanted = names.map(memoryName).filter((n): n is string => n !== null);
  if (wanted.length === 0) return 0;
  await db.transaction('rw', db.settings, async () => {
    const kept = await getWishedNotes();
    const list = wanted.reduce((all, name) => [...all.filter((n) => n !== name), name], kept.names);
    await db.settings.put({ key: WISHED_KEY, value: JSON.stringify({ count: kept.count + wanted.length, names: list.slice(-WISHED_NAMES_KEPT) }) });
  });
  return wanted.length;
}
