// src/resources/tutorLinks.ts — what a link of the tutor's answer (mw-5r3p30.75) becomes: a chip for each study resource he switched on in Settings,
// and none for a resource he has not (nothing says so). A word link gives the first link of each resource that is on, named for the lemma
// ('Open in Logos: BDAG for ἀγάπη', his first ticked lexicon); a verse link gives, for each resource that can show a Bible, the verse in it (Logos: his
// Bible in Logos). A verse may be in any book of the Bible (placeOf, one canon list: data/books.ts and data/otBooks.ts); the Old Testament has the resources'
// chips and no Reader chip, as Lampas holds no Old Testament text. Lampas's own Reader is not a resource: the verse chip that opens it is drawn by src/TutorLinks.tsx. Pure: the Strong's number and
// his Bible are looked up by the caller. Links only, no text of any lexicon (docs/resources.md).
import { BOOK_INDEX } from '../data/bookIndex';
import { titleOf } from '../data/books';
import { otBookOf } from '../data/otBooks';
import type { StudyResources } from '../data/repositories';
import { parseCanonReference } from '../nav/links';
import { optionOf, resourceOf, RESOURCES, type StudyPlace, type StudyResource } from './index';
import { coversOf, WORKS, workLink, workOf } from './works';

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

const switchedOn = (chosen: StudyResources): StudyResource[] => RESOURCES.filter((r) => chosen.on.includes(r.id));

/** The chips of a word link: the first link of every resource that is on. `strongs` is the lemma's number from the lexicon; without it a resource of
 *  kind 'number' (Strong's) gives no chip, as it has nothing to link. */
export function wordChips(lemma: string, strongs: string | undefined, chosen: StudyResources): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen)) {
    if (resource.kind === 'number' && !strongs) continue;
    const [link] = resource.linksFor({ form: lemma, lemma, strongs: strongs ?? '' }, optionOf(resource, chosen.options[resource.id]));
    if (link) chips.push({ resource, label: `${link.label} for ${lemma}`, tile: link.tile ?? link.label, url: link.url, fallback: link.fallback });
  }
  return chips;
}

/** The chips of a verse link in the apps that are on and can show a Bible (`name` is the reference as written, 'Romans 8:31'); `bible` is his Bible in Logos. */
export function verseChips(place: StudyPlace, name: string, chosen: StudyResources, bible: string): LinkChip[] {
  const chips: LinkChip[] = [];
  for (const resource of switchedOn(chosen)) {
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

/** The resources he has switched on, in the order Settings lists them: the only ones the tutor is told of, so it never offers a link the app would not draw. */
export function resourcesForTutor(chosen: StudyResources): TutorResource[] {
  return switchedOn(chosen).map((r) => ({ id: r.id, name: r.name, words: true, verses: r.versesFor !== undefined }));
}

/** A work of his Logos library as the tutor is told of it (the request's `works`, mw-5r3p30.675): the only works its `work` links may name. */
export interface TutorWork {
  id: string;
  title: string;
  author: string;
  kind: 'commentary' | 'book';
  /** a commentary only: the books of the Bible it comments on, so a link is never offered for one it lacks */
  covers?: string;
}

/** The works he ticked, in the order Settings lists them: the only ones the tutor is told of. */
export function worksForTutor(ticked: readonly string[]): TutorWork[] {
  return WORKS.filter((w) => ticked.includes(w.id)).map((w) => {
    const covers = coversOf(w);
    return { id: w.id, title: w.title, author: w.author, kind: w.kind, ...(covers ? { covers } : {}) };
  });
}

/** The chip of a `work` link: Open in Logos, named for the work's title (and, for a commentary, the passage it opens at). Null when the work is not among the ones he ticked, no
 *  work has the id, or Logos has nowhere to open it (a commentary with no reference, or for a book it does not cover): such a link is dropped, never shown. */
export function workChip(id: string, reference: string | undefined, ticked: readonly string[]): { name: string; chip: LinkChip } | null {
  const work = ticked.includes(id) ? workOf(id) : undefined;
  const logos = resourceOf('logos');
  if (!work || !logos) return null;
  const place = reference === undefined ? null : placeOf(reference);
  const link = workLink(work, place ?? undefined);
  if (!link) return null;
  const name = work.kind === 'commentary' && place ? `${work.title} at ${place.name}` : work.title;
  return { name, chip: { resource: logos, label: `Open in Logos: ${name}`, tile: 'Open in Logos', ...link } };
}
