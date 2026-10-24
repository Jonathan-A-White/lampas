// src/resources/tutorLinks.ts — what a link of the tutor's answer (mw-5r3p30.75) becomes: a chip for each study resource he switched on in Settings,
// and none for a resource he has not (nothing says so; a book of his Logos shelf, mw-rfjjzd.10: the tutor is told a digest of it chosen by the place, worksForTutor, at most WORKS_BYTES, and a `work` link opens one book, workChip). A word link gives the first link of each resource that is on, named for the lemma
// ('Open in Logos: BDAG for ἀγάπη', his first pinned lexicon, else the first he ticked); a verse link gives, for each resource that can show a Bible, the verse in it (Logos: his
// Bible in Logos). A verse may be in any book of the Bible (placeOf, one canon list: data/books.ts and data/otBooks.ts); the Old Testament has the resources'
// chips and no Reader chip, as Lampas holds no Old Testament text. Lampas's own Reader is not a resource: the verse chip that opens it is drawn by src/TutorLinks.tsx. Pure: the Strong's number and
// his Bible are looked up by the caller. Links only, no text of any lexicon (docs/resources.md).
import { BOOK_INDEX } from '../data/bookIndex';
import { titleOf } from '../data/books';
import { otBookOf } from '../data/otBooks';
import type { StudyResources } from '../data/repositories';
import { parseCanonReference } from '../nav/links';
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import { optionOf, resourceOf, RESOURCES, type StudyPlace, type StudyResource } from './index';
import { CATALOGUE, WORK_GROUPS, type CatalogueEntry, type Kind, type WorkGroup } from './catalogue';
import { TUTOR_KINDS } from './workIds';
import type { LibraryRow } from '../data/db';
import { WORKS_BYTES } from '../services/requestBudget';
import { pinnedFirst } from './logos';
import { bibleRef } from './logosBible';
import { resourceLink, resourceStart } from './logosRes';
import { resourcesForLevel } from './resourcesForLevel';
import { indexPlace, WORKS, workLink } from './works';

/** One chip: the app's own address, its https fallback, the short words on it and the accessible name. */
export interface LinkChip {
  resource: StudyResource;
  label: string;
  tile: string;
  url: string;
  fallback?: string;
}

/** The place a verse link names, with its name as Lampas writes it. `reader` is whether Lampas can open it in its own Reader: only the books it holds (the New
 *  Testament) can. When an Old Testament reader comes, that is the one line to change (and the chip then follows). */
export interface TutorPlace extends StudyPlace {
  name: string;
  reader: boolean;
}

/** The place a verse link's reference names, in any book of the Bible; null for a book of neither Testament, a chapter past the book's end, or a verse below 1 (or,
 *  in a New Testament chapter, past its last: Lampas holds those counts). A whole chapter has no `verse`. */
export function placeOf(reference: string): TutorPlace | null {
  const parsed = parseCanonReference(reference);
  if (!parsed || parsed.chapter === undefined || parsed.chapter < 1) return null;
  const { book, chapter, verse } = parsed;
  if (verse !== undefined && verse < 1) return null;
  let title: string;
  if (parsed.testament === 'nt') {
    const info = BOOK_INDEX.books.find((b) => b.code === book);
    if (!info || chapter > info.chapters || (verse !== undefined && verse > (info.verses[chapter - 1] ?? 0))) return null;
    title = titleOf(book, chapter);
  } else {
    const info = otBookOf(book);
    if (!info || chapter > info.chapters) return null;
    title = `${info.name} ${chapter}`;
  }
  return { book, chapter, ...(verse === undefined ? {} : { verse }), name: verse === undefined ? title : `${title}:${verse}`, reader: parsed.testament === 'nt' };
}

/** The resources he switched on that the dial shows (resourcesForLevel: Greek ones are hidden at Just English and follow the English ones between), in that order. A hidden one keeps its switch. */
const switchedOn = (chosen: StudyResources, level: GreekLevel): StudyResource[] => resourcesForLevel(RESOURCES, level).filter((r) => chosen.on.includes(r.id));

/** The chips of a word link: the first link of every resource that is on. `strongs` is the lemma's number from the lexicon; without it a resource of
 *  kind 'number' (Strong's) gives no chip, as it has nothing to link. */
export function wordChips(lemma: string, strongs: string | undefined, chosen: StudyResources, level: GreekLevel = GREEK_TOP): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen, level)) {
    if (resource.kind === 'number' && !strongs) continue;
    // the first link of Logos is the first lexicon he pinned (the first ticked while none is pinned)
    const option = optionOf(resource, chosen.options[resource.id]);
    const [link] = resource.linksFor({ form: lemma, lemma, strongs: strongs ?? '' }, resource.id === 'logos' ? pinnedFirst(option, chosen.pinnedLexicons) : option);
    if (link) chips.push({ resource, label: `${link.label} for ${lemma}`, tile: link.tile ?? link.label, url: link.url, fallback: link.fallback });
  }
  return chips;
}

/** The chips of a verse link in the apps that are on and can show a Bible (`name` is the reference as written, 'Romans 8:31'); `bible` is his Bible in Logos. */
export function verseChips(place: StudyPlace, name: string, chosen: StudyResources, bible: string, level: GreekLevel = GREEK_TOP): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen, level)) {
    const [link] = resource.versesFor?.(place, bible) ?? [];
    if (link) chips.push({ resource, label: link.label.replace(/^Open /, `Open ${name} `), tile: link.tile ?? link.label, url: link.url, fallback: link.fallback });
  }
  return chips;
}

/** A study resource as the tutor is told of it (the request's `resources`, mw-5r3p30.123): what it is called and what the app can open in it. */
export interface TutorResource {
  id: string;
  name: string;
  /** a word's entry can be opened in it (`links` of kind word) */
  words: boolean;
  /** a verse can be opened in it (`links` of kind verse) */
  verses: boolean;
}

/** The resources he has switched on that the dial shows, in the order Settings lists them: the only ones the tutor is told of, so it never offers a link the app would not draw. */
export function resourcesForTutor(chosen: StudyResources, level: GreekLevel = GREEK_TOP): TutorResource[] {
  return switchedOn(chosen, level).map((r) => ({ id: r.id, name: r.name, words: true, verses: r.versesFor !== undefined }));
}

/** What a line of the digest says a book is: a commentary, a grammar, a Greek text (or the apparatus), an interlinear, or a book (a work with an index of its own: the Institutes). One letter, to keep a line near 40 bytes. */
export type WorkCode = 'c' | 'g' | 't' | 'i' | 'b';

/** The name of each code, as the closing `more` line counts the books it leaves out. */
export const WORK_KIND_NAMES: Readonly<Record<WorkCode, string>> = { c: 'commentary', g: 'grammar', t: 'greek-text', i: 'interlinear', b: 'book' };

/** One book of his shelf as the tutor is told of it (the request's `works`, mw-rfjjzd.10): the only ones its `work` links may name. `id` is the work's id (a work of several volumes, Calvin's commentaries, is one line) or the book's
 *  Resource ID; `t` its short title; `p` is 1 for a book that takes a `place` of its own (the Institutes). */
export interface TutorWorkLine {
  id: string;
  t: string;
  k: WorkCode;
  p?: 1;
}

/** The closing line: how many books of each kind are on his shelf and not listed, so the tutor can say 'your other commentaries are under In another book' and never pretend there are none. */
export interface TutorWorksMore {
  more: Record<string, number>;
}

export type TutorWork = TutorWorkLine | TutorWorksMore;

const isLine = (work: TutorWork): work is TutorWorkLine => 'id' in work;

const CODE_OF: Readonly<Record<string, WorkCode>> = { commentary: 'c', grammar: 'g', 'greek-text': 't', interlinear: 'i' };

/** The most commentaries (covering the chapter), grammars and Greek texts a digest lists after the pinned books. */
const DIGEST_COMMENTARIES = 8;
const DIGEST_GRAMMARS = 4;
const DIGEST_GREEK_TEXTS = 3;
const TITLE_CHARS = 22;

/** A question about a form or a reading: the grammars and the Greek texts are worth naming for it, and for no other (docs/design/library-at-scale.md section 7). */
const FORM_OR_READING = /\b(parse|parsing|tense|aorist|imperfect|pluperfect|participle|infinitive|subjunctive|optative|imperative|indicative|mood|voice|passive|middle|genitive|dative|accusative|nominative|vocative|declension|declined|conjugat|inflect|syntax|grammar|construction|clause|article|preposition|variant|manuscript|apparatus|textual|text[- ]critic|Byzantine|Textus Receptus|critical text|SBL|reading of|which reading|other reading|why (is|does) (it|the)\b.*\b(case|form|ending|tense))/i;

const clipTitle = (text: string): string => (text.length <= TITLE_CHARS ? text : `${text.slice(0, TITLE_CHARS - 1).trimEnd()}…`);

const group = (entry: CatalogueEntry): WorkGroup | undefined => (entry.work ? WORK_GROUPS.find((g) => g.id === entry.work) : undefined);

/** A book of the shelf as one line of the digest. */
function lineOf(entry: CatalogueEntry): TutorWorkLine {
  const g = group(entry);
  const isBook = g?.kind === 'book';
  return {
    id: g ? g.id : entry.resource,
    t: clipTitle(g && !isBook ? g.title : entry.short),
    k: isBook ? 'b' : (CODE_OF[entry.kind] ?? 'c'),
    ...(g?.index ? { p: 1 as const } : {}),
  };
}

/** Whether a commentary or an interlinear opens at this place: the volume covers the book. A book (the Institutes) covers none and is not tied to a place. */
const coversPlace = (entry: CatalogueEntry, place: StudyPlace | undefined): boolean => {
  if (entry.kind === 'interlinear') return place === undefined ? false : !entry.covers || entry.covers.includes(place.book);
  return place !== undefined && entry.covers !== undefined && entry.covers.includes(place.book);
};

const sizeOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** The books of his shelf the tutor is told of, chosen by the place he is on, within WORKS_BYTES: the pinned ones first, then the commentaries whose volume covers the chapter (the ones he put on most lately first, then the catalogue's order; at
 *  most 8), then for a question about a form or a reading the grammars (at most 4) and the Greek texts (at most 3), then the books with an index of their own; each as {id, t, k}, and one closing {more} line counting
 *  the rest by kind. No lexicon is listed. Empty when nothing of the kinds is on his shelf. `shelf` is his rows (src/data/repositories/library.ts shelfOf); `catalogue` is a test's own. The dial hides a Greek book at Just English. */
export function worksForTutor(shelf: readonly LibraryRow[], place: StudyPlace | undefined, question: string, level: GreekLevel = GREEK_TOP, catalogue: readonly CatalogueEntry[] = CATALOGUE): TutorWork[] {
  const byResource = new Map(catalogue.map((e, i) => [e.resource, { entry: e, order: i }]));
  const held = shelf.flatMap((row) => {
    const found = byResource.get(row.id);
    return found && TUTOR_KINDS.includes(found.entry.kind) && (row.state === 'on' || row.state === 'pinned') ? [{ ...found, row }] : [];
  });
  const shown = new Set(resourcesForLevel(held.map((h) => h.entry), level));
  const rows = held.filter((h) => shown.has(h.entry)).sort((a, b) => b.row.since - a.row.since || a.order - b.order);
  const isBookGroup = (e: CatalogueEntry): boolean => group(e)?.kind === 'book';
  const chosen: CatalogueEntry[] = [];
  const take = (entries: CatalogueEntry[], most: number): void => {
    for (const e of entries) {
      if (most <= 0) break;
      if (chosen.some((c) => lineOf(c).id === lineOf(e).id)) continue;
      chosen.push(e);
      most -= 1;
    }
  };
  const of = (kind: Kind, state?: 'pinned'): CatalogueEntry[] => rows.filter((h) => h.entry.kind === kind && !isBookGroup(h.entry) && (state === undefined || h.row.state === state)).map((h) => h.entry);
  // 1. pinned, every kind; a commentary or an interlinear only where it covers the place
  take(
    rows
      .filter((h) => h.row.state === 'pinned' && ((h.entry.kind !== 'commentary' && h.entry.kind !== 'interlinear') || isBookGroup(h.entry) || coversPlace(h.entry, place)))
      .sort((a, b) => a.order - b.order)
      .map((h) => h.entry),
    Infinity,
  );
  // 2. the commentaries that cover the chapter
  take(of('commentary').filter((e) => coversPlace(e, place)), DIGEST_COMMENTARIES);
  // 3. for a question about a form or a reading, the grammars and the Greek texts
  if (FORM_OR_READING.test(question)) {
    take(of('grammar'), DIGEST_GRAMMARS);
    take(of('greek-text'), DIGEST_GREEK_TEXTS);
  }
  // 4. the books with an index of their own (the Institutes), if there is room
  take(rows.filter((h) => isBookGroup(h.entry)).map((h) => h.entry), Infinity);
  const lines = chosen.map(lineOf);
  const listed = new Set(lines.map((l) => l.id));
  const more: Record<string, number> = {};
  const counted = new Set<string>();
  for (const { entry } of rows) {
    const line = lineOf(entry);
    if (listed.has(line.id) || counted.has(line.id)) continue;
    counted.add(line.id);
    more[WORK_KIND_NAMES[line.k]] = (more[WORK_KIND_NAMES[line.k]] ?? 0) + 1;
  }
  let digest: TutorWork[] = [...lines, ...(Object.keys(more).length > 0 ? [{ more }] : [])];
  while (sizeOf(digest) > WORKS_BYTES && digest.some(isLine)) digest = trimWorks(digest);
  return digest;
}

/** The digest with its last listed line cut and counted into the closing line (the pinned ones, first, are the last to go); with no line left, the closing line goes too. */
export function trimWorks(works: readonly TutorWork[]): TutorWork[] {
  const lines = works.filter(isLine);
  const more = works.find((w): w is TutorWorksMore => 'more' in w)?.more ?? {};
  const last = lines.at(-1);
  if (!last) return [];
  const name = WORK_KIND_NAMES[last.k];
  const counted = { ...more, [name]: (more[name] ?? 0) + 1 };
  return [...lines.slice(0, -1), { more: counted }];
}

/** What a `work` link becomes: its name and its one chip. */
type Opened = { name: string; chip: LinkChip };

/** The chip of a `work` link: Open in Logos, named for the work's title (and, for a commentary, the passage it opens at). Null when the work is not among the ones he ticked (`ticked`: the ids of the works on his shelf)
 *  or the book is not on his shelf (`shelf`: the Resource IDs of his rows), no work or book has the id, or Logos has nowhere to open it (a commentary with no reference, or for a book it does not cover): such a link is dropped, never shown. */
export function workChip(id: string, reference: string | undefined, ticked: readonly string[], spot?: string, level: GreekLevel = GREEK_TOP, shelf: readonly string[] = []): Opened | null {
  const work = ticked.includes(id) ? resourcesForLevel(WORKS, level).find((w) => w.id === id) : undefined;
  const logos = resourceOf('logos');
  if (!logos) return null;
  const place = reference === undefined ? null : placeOf(reference);
  if (!work) return bookChip(id, place, shelf, logos, level);
  const link = workLink(work, place ?? undefined, spot);
  if (!link) return null;
  const inBook = work.kind === 'book' && spot !== undefined ? indexPlace(work, spot) : undefined;
  const name = work.kind === 'commentary' && place ? `${work.title} at ${place.name}` : inBook ? `${work.title} at ${inBook.name}` : work.title;
  return { name, chip: { resource: logos, label: `Open in Logos: ${name}`, tile: 'Open in Logos', ...link } };
}

/** The chip of a book that is no work of several volumes (a standalone commentary, a grammar, a Greek text, an interlinear): opened at the verse when it opens by verse and the place is one it covers, else at its start. */
function bookChip(id: string, place: TutorPlace | null, shelf: readonly string[], logos: StudyResource, level: GreekLevel): Opened | null {
  const entry = shelf.includes(id) ? CATALOGUE.find((e) => e.resource === id) : undefined;
  if (!entry || !TUTOR_KINDS.includes(entry.kind) || resourcesForLevel([entry], level).length === 0) return null;
  const ref = entry.opens === 'verse' && place ? bibleRef(place.book, place.chapter, place.verse) : undefined;
  if (entry.opens === 'verse') {
    if (!place || !ref || (entry.covers && !entry.covers.includes(place.book))) return null;
  }
  const link = ref ? resourceLink(entry.resource, `ref=${ref}`) : resourceStart(entry.resource);
  const name = entry.opens === 'verse' && place ? `${entry.short} at ${place.name}` : entry.short;
  return { name, chip: { resource: logos, label: `Open in Logos: ${name}`, tile: 'Open in Logos', ...link } };
}
