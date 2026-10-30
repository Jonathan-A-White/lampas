// src/markdown/bookLinks.ts — a book the app's prose names ('Further reading' in a lesson, a tutor's answer, a setting's help) is a link to where it can be had
// (mw-9ji6ek0.38): its Logos store page when Logos sells it, else its Amazon page. The books are the curated list in data/books.json (title, authors, year, and the
// addresses; a Logos address is a store page that was fetched and named the book, never guessed); a title that is not in it is never linked. These are the books the
// prose recommends, not his own Logos library, whose links src/resources builds. remarkBooks is the plug-in Markdown.tsx runs beside remarkVerses.
import entries from '../../data/books.json';

export interface Book {
  title: string;
  authors: string[];
  year: number;
  /** the Logos store page, https://www.logos.com/product/<n>/..., when Logos sells the book */
  logos?: string;
  amazon?: string;
  /** a title that is also ordinary words ('The Text of the New Testament') is linked only as written */
  caseSensitive?: boolean;
}

export const BOOKS: readonly Book[] = entries as Book[];

/** Where a book is had: Logos first, Amazon as the backup. */
export const bookUrl = (book: Book): string => (book.logos ?? book.amazon) as string;

/** A book found in a text: where it stands (`start` to `end`, the characters written) and the list's entry. */
export interface FoundBook {
  start: number;
  end: number;
  book: Book;
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest title first, so a title that begins another ('The Text of the New Testament: Its Transmission…') is taken whole. Spaces match any run of whitespace; a title is
// taken whole, never inside a longer word.
const TITLES = [...BOOKS].sort((a, b) => b.title.length - a.title.length);
const PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${TITLES.map((b) => escape(b.title).replace(/ /g, '\\s+')).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);
const keyOf = (s: string): string => s.replace(/\s+/g, ' ').toLowerCase();
const BY_KEY = new Map(BOOKS.map((b) => [keyOf(b.title), b]));

/** The listed books `text` names, in order: the exact title, in any case (a `caseSensitive` book only as written). */
export function booksIn(text: string): FoundBook[] {
  const found: FoundBook[] = [];
  for (const m of text.matchAll(PATTERN)) {
    const book = BY_KEY.get(keyOf(m[0]));
    if (!book || (book.caseSensitive && m[0] !== book.title)) continue;
    found.push({ start: m.index, end: m.index + m[0].length, book });
  }
  return found;
}

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

function wrap(node: MdNode): void {
  const children = node.children;
  if (!children || node.type === 'link' || node.type === 'linkReference') return;
  const next: MdNode[] = [];
  for (const child of children) {
    const found = child.type === 'text' && child.value !== undefined ? booksIn(child.value) : [];
    if (found.length === 0) {
      wrap(child);
      next.push(child);
      continue;
    }
    const value = child.value as string;
    let at = 0;
    for (const f of found) {
      if (f.start > at) next.push({ type: 'text', value: value.slice(at, f.start) });
      next.push({ type: 'link', url: bookUrl(f.book), children: [{ type: 'text', value: value.slice(f.start, f.end) }] });
      at = f.end;
    }
    if (at < value.length) next.push({ type: 'text', value: value.slice(at) });
  }
  node.children = next;
}

export function remarkBooks() {
  return (tree: MdNode): void => wrap(tree);
}
