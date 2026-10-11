// src/talk/go.ts — the Bible talk answer's `go` (mw-5r3p30.172): the tutor takes him to a chapter when he asks to switch, open or go to it. The schema holds
// the tutor to {book, chapter}, a book of the app's own list and a chapter in range; the app reads whatever arrives and takes only what this accepts, so a
// go it cannot take never costs him the answer, and the talk never claims a move that did not happen.
import { BOOKS, titleOf } from '../data/books';

/** A chapter the app can open. */
export interface GoPlace {
  book: string;
  chapter: number;
  /** 'Colossians 1' */
  title: string;
}

/** What the app made of an answer's `go`: a place it can open, or the words for what it could not ('Colossians 9', 'that chapter'). */
export type GoReading = { ok: true; place: GoPlace } | { ok: false; title: string };

const fold = (text: string): string => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const TITLE_MAX = 40;
const clip = (text: string): string => (text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text);

/** Reads `go` as it came: undefined when the answer has none. */
export function readGo(go: unknown): GoReading | undefined {
  if (go === undefined) return undefined;
  const asked = typeof go === 'object' && go !== null ? (go as Record<string, unknown>) : null;
  const name = typeof asked?.book === 'string' ? asked.book.trim() : '';
  const raw = asked?.chapter;
  const chapter = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,3}$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!name || Number.isNaN(chapter)) return { ok: false, title: typeof go === 'string' && go.trim() ? clip(go.trim()) : name && raw !== undefined ? clip(`${name} ${String(raw)}`) : 'that chapter' };
  const book = BOOKS.find((b) => fold(b.name) === fold(name));
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return { ok: false, title: clip(`${name} ${chapter}`) };
  return { ok: true, place: { book: book.code, chapter, title: titleOf(book.code, chapter) } };
}
