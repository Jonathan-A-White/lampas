// src/resources/grammarBooks.ts — the grammar books of his Logos library that an idea sheet links to under Read more (mw-5r3p30.381, PROVISIONAL):
// for each book, the sections of its table of contents and the ladder ideas each teaches. A book is a reference inside the learning, whichever
// grammar approach he is on, never an approach of its own. Adding a book is one entry in data/logos/catalogue-rules.json (then `npm run logos:catalogue`): Settings (Logos > Grammar books) and the
// idea sheet read GRAMMAR_BOOKS, a view over the catalogue, and the shelf's states (shelvedBooks), and nothing else. Every link is the Logos scheme first with the https ref.ly address as the fallback (src/resources/openApp.ts),
// as the lexicon links are (logos.ts). docs/resources.md names each book's source and what is UNVERIFIED.
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import { entriesOf } from './catalogue';
import { resourceLink } from './logosRes';
import { resourcesForLevel } from './resourcesForLevel';
import type { BookSection, GrammarBook, StudyLink } from './types';

/** Every grammar book, in the order Settings lists them and the idea sheet draws their lines: a view over the catalogue's grammars that have a table of sections (catalogue.ts; Black's is in data/logos/catalogue-rules.json).
 *  A grammar with no table is in the catalogue for the tutor only: it would open at its start, which Logos does better. */
export const GRAMMAR_BOOKS: readonly GrammarBook[] = entriesOf('grammar')
  .filter((e) => e.via === 'id' && e.id !== undefined && e.sections !== undefined)
  .map((e) => ({
    id: e.id as string,
    lang: e.lang,
    short: e.short,
    name: e.title,
    resource: e.resource,
    ...(e.starts !== undefined ? { startsTicked: true } : {}),
    source: e.source ?? '',
    sections: e.sections ?? [],
  }));

/** The books ticked while he has not changed the ticks. */
export const DEFAULT_GRAMMAR_BOOKS: readonly string[] = GRAMMAR_BOOKS.filter((b) => b.startsTicked).map((b) => b.id);

/** The sections of `book` that teach the idea `ideaId`, in the book's order. */
export const sectionsFor = (book: GrammarBook, ideaId: string): BookSection[] => book.sections.filter((s) => s.ideas.includes(ideaId));

/** The link that opens `section` in Logos: the logosres: scheme, with its ref.ly address as the fallback (the colon of the Resource ID encoded, as logos.ts does).
 *  The scheme writes the space of a page reference '_' (`Page.p_26`); a '+' there is read as a plus and the app stays on his open tab (mw-5r3p30.618). The https
 *  query writes the space '+', which ref.ly turns into the '_'. */
export const bookLink = (book: GrammarBook, section: BookSection): StudyLink => ({
  label: `Open in Logos: ${book.short}, ${section.title}`,
  tile: section.title,
  ...resourceLink(book.resource, `ref=${section.ref}`, `ref=${section.ref.replace(/_/g, '+')}`),
});

export interface ReadMoreLine {
  book: GrammarBook;
  links: StudyLink[];
}

/** What his shelf says of `books`: the ids of those that are On or Pinned, and of those Pinned, from the shelf's rows (shelfOf('grammar'): a row's id is the book's Resource ID). A book with no row is Off. */
export function shelvedBooks(books: readonly GrammarBook[], rows: readonly { id: string; state: 'on' | 'pinned' }[]): { ticked: string[]; pinned: string[] } {
  const state = new Map(rows.map((r) => [r.id, r.state]));
  return {
    ticked: books.filter((b) => state.has(b.resource)).map((b) => b.id),
    pinned: books.filter((b) => state.get(b.resource) === 'pinned').map((b) => b.id),
  };
}

/** Read more for the idea `ideaId`: one line for each ticked book that teaches it, the Pinned books first (`pinned`), then the rest, each group in the order the dial gives GRAMMAR_BOOKS
 *  (resourcesForLevel: a Greek book is left out at Just English and follows the English ones between; `books` is the list, a test hands it its own). */
export function readMoreFor(ideaId: string, ticked: readonly string[], books: readonly GrammarBook[] = GRAMMAR_BOOKS, level: GreekLevel = GREEK_TOP, pinned: readonly string[] = []): ReadMoreLine[] {
  const lines = resourcesForLevel(books, level)
    .filter((book) => ticked.includes(book.id))
    .map((book) => ({ book, links: sectionsFor(book, ideaId).map((section) => bookLink(book, section)) }))
    .filter((line) => line.links.length > 0);
  return [...lines.filter((l) => pinned.includes(l.book.id)), ...lines.filter((l) => !pinned.includes(l.book.id))];
}
