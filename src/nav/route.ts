// src/nav/route.ts — twelve screens, told apart by the address hash, so the phone's Back button walks them.
// The reader's own state rides in the same hash after a '?': book (b, its code as public/data/index.json has it), chapter (c),
// view, weave and the selected verse (v), e.g. '#/?b=rom&c=8&view=greek&weave=off&v=28'. An address with a chapter and no book
// is Romans (every address kept before the picker, mw-5r3p30.60, was). src/nav/lastRoute.ts keeps these addresses across a close.
// A link from outside rides in the same hash on the reader's path: '#/?ref=Rom.8.28' (a reference, also 'Rom 8:28', 'Romans 8:28', '1John.1.9', 'Rom 8') or
// '#/?word=G3551' (a Strong's number or a lemma); readerOf does not read them. src/nav/links.ts reads and resolves them (docs/links.md), and
// src/nav/LinkOpener.tsx replaces them by the plain reader address above before the Reader opens, so they are never kept.
import { useSyncExternalStore } from 'react';
import { bookOf } from '../data/books';
import { paradigmById } from '../data/paradigms';
import type { ReaderView, Weave } from '../data/repositories';

export type Route = 'home' | 'words' | 'import' | 'test' | 'drill' | 'review' | 'paradigms' | 'placement' | 'goal' | 'studyway' | 'about' | 'preface' | 'settings';

/** What the address says about the reader; a key is missing when the address does not say. */
export interface ReaderAddress {
  /** the book's code: 'rom', '1jn' */
  book?: string;
  chapter?: number;
  view?: ReaderView;
  weave?: Weave;
  verse?: number;
  /** the first verse of the passage under a section heading, when the Verse view shows that passage (src/data/passage.ts) */
  passage?: number;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}

/** The part of an address before its '?': '#/words', '#/' or ''. */
export function pathOf(hash: string): string {
  const q = hash.indexOf('?');
  return q < 0 ? hash : hash.slice(0, q);
}

export function routeOf(hash: string): Route {
  const path = pathOf(hash);
  if (path === '#/words') return 'words';
  if (path === '#/import') return 'import';
  if (path === '#/test') return 'test';
  if (path === '#/drill') return 'drill';
  if (path === '#/review') return 'review';
  if (path === '#/paradigms') return 'paradigms';
  if (path === '#/placement') return 'placement';
  if (path === '#/goal') return 'goal';
  if (path === '#/studyway') return 'studyway';
  if (path === '#/about') return 'about';
  if (path === '#/preface') return 'preface';
  if (path === '#/settings') return 'settings';
  return 'home';
}

const hashFor = (route: Route) => (route === 'home' ? '#/' : `#/${route}`);

const wholeNumber = (text: string | null): number | undefined => (text !== null && /^[1-9]\d{0,3}$/.test(text) ? Number(text) : undefined);

/** The reader state an address carries; anything it does not say clearly is left out. */
export function readerOf(hash: string): ReaderAddress {
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const address: ReaderAddress = {};
  const book = params.get('b');
  if (book !== null && bookOf(book)) address.book = book;
  const chapter = wholeNumber(params.get('c'));
  if (chapter !== undefined) address.chapter = chapter;
  const view = params.get('view');
  if (view === 'english' || view === 'greek') address.view = view;
  const weave = params.get('weave');
  if (weave === 'off' || weave === 'solid' || weave === 'solid+learning') address.weave = weave;
  const verse = wholeNumber(params.get('v'));
  if (verse !== undefined) address.verse = verse;
  const passage = wholeNumber(params.get('p'));
  if (passage !== undefined) address.passage = passage;
  return address;
}

/** The reader's address, always in the same order so the same state is the same string. */
export function readerHash({ book, chapter, view, weave, verse, passage }: ReaderAddress): string {
  const params = new URLSearchParams();
  if (book !== undefined) params.set('b', book);
  if (chapter !== undefined) params.set('c', String(chapter));
  if (view) params.set('view', view);
  if (weave) params.set('weave', weave);
  if (verse !== undefined) params.set('v', String(verse));
  if (passage !== undefined) params.set('p', String(passage));
  const query = params.toString();
  return query ? `#/?${query}` : '#/';
}

/** What the address says about the Paradigms screen: no table is the list; a table opens in a mode (study when it is not said). */
export interface ParadigmAddress {
  /** the table's id: 'article', 'eimi' */
  table?: string;
  mode?: 'study' | 'review';
}

export function paradigmOf(hash: string): ParadigmAddress {
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const address: ParadigmAddress = {};
  const table = params.get('t');
  if (table !== null && paradigmById(table)) address.table = table;
  const mode = params.get('mode');
  if (address.table !== undefined && (mode === 'study' || mode === 'review')) address.mode = mode;
  return address;
}

/** The Paradigms address, always in the same order. */
export function paradigmHash({ table, mode }: ParadigmAddress): string {
  const params = new URLSearchParams();
  if (table !== undefined) params.set('t', table);
  if (table !== undefined && mode) params.set('mode', mode);
  const query = params.toString();
  return query ? `#/paradigms?${query}` : '#/paradigms';
}

const urlFor = (hash: string) => `${window.location.pathname}${window.location.search}${hash}`;

/** Opens a screen; `replace` swaps the current history entry instead of adding one. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  if (options.replace) replaceHash(hashFor(route));
  else {
    window.history.pushState(null, '', urlFor(hashFor(route)));
    notify();
  }
}

/** Opens the reader at a chapter and verse, as a new Back step. */
export function openReader(address: Pick<ReaderAddress, 'book' | 'chapter' | 'verse'>): void {
  window.history.pushState(null, '', urlFor(readerHash(address)));
  notify();
}

/** What the history entry of a Verse view carries, so closing it can step Back to the Reader it was opened from. */
type VerseEntry = { verseView?: boolean } | null;

/** Opens the Verse view (src/VerseView.tsx) on `verse` of the chapter the address names, as a new Back step: Back returns to the Reader,
 * which has not moved. */
export function openVerse(verse: number): void {
  const here = readerOf(window.location.hash);
  delete here.passage;
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash({ ...here, verse })));
  notify();
}

/** Opens the same view on the passage under a section heading, which starts at verse `first` (mw-5r3p30.73), as a new Back step. */
export function openPassage(first: number): void {
  const here = readerOf(window.location.hash);
  delete here.verse;
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash({ ...here, passage: first })));
  notify();
}

/** Closes the Verse view: a step Back when it was opened by openVerse, else (a reopen or a link opened it) the address loses its verse. */
export function closeVerse(): void {
  if ((window.history.state as VerseEntry)?.verseView) {
    window.history.back();
    return;
  }
  const without = readerOf(window.location.hash);
  delete without.verse;
  delete without.passage;
  replaceHash(readerHash(without));
}

/** The Verse view moves to another verse, in this chapter or another, on the entry it is on (no new Back step). */
export function moveVerse(to: { book: string; chapter: number; verse: number }): void {
  const here = readerOf(window.location.hash);
  delete here.passage;
  const sameChapter = (here.book ?? 'rom') === to.book && here.chapter === to.chapter;
  replaceHash(readerHash(sameChapter ? { ...here, verse: to.verse } : { book: to.book, chapter: to.chapter, verse: to.verse }));
}

/** The Verse view moves to another passage of the chapter, on the entry it is on (no new Back step). */
export function movePassage(first: number): void {
  const here = readerOf(window.location.hash);
  delete here.verse;
  replaceHash(readerHash({ ...here, passage: first }));
}

/** Opens a Paradigms table (or the list, with none) as a new Back step. */
export function openParadigm(address: ParadigmAddress): void {
  window.history.pushState(null, '', urlFor(paradigmHash(address)));
  notify();
}

/** Changes the address of the entry he is on (the reader's verse, view or weave moved): no new Back step, and the
 * entry keeps its place in the trail (history.state). */
export function replaceHash(hash: string): void {
  if (hash === window.location.hash) return;
  window.history.replaceState(window.history.state, '', urlFor(hash));
  notify();
}

/** The whole address, reactive: the reader's state changes it without changing the screen. */
export function useAddress(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function useRoute(): Route {
  return routeOf(useAddress());
}
