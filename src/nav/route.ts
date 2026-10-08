// src/nav/route.ts — eight screens, told apart by the address hash, so the phone's Back button walks them.
// The reader's own state rides in the same hash after a '?': chapter (c), view, weave and the selected verse (v),
// e.g. '#/?c=8&view=greek&weave=off&v=28'. src/nav/lastRoute.ts keeps these addresses across a close.
import { useSyncExternalStore } from 'react';
import type { ReaderView, Weave } from '../data/repositories';

export type Route = 'home' | 'words' | 'import' | 'test' | 'drill' | 'review' | 'about' | 'settings';

/** What the address says about the reader; a key is missing when the address does not say. */
export interface ReaderAddress {
  chapter?: number;
  view?: ReaderView;
  weave?: Weave;
  verse?: number;
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
  if (path === '#/about') return 'about';
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
  const chapter = wholeNumber(params.get('c'));
  if (chapter !== undefined) address.chapter = chapter;
  const view = params.get('view');
  if (view === 'english' || view === 'greek') address.view = view;
  const weave = params.get('weave');
  if (weave === 'off' || weave === 'solid' || weave === 'solid+learning') address.weave = weave;
  const verse = wholeNumber(params.get('v'));
  if (verse !== undefined) address.verse = verse;
  return address;
}

/** The reader's address, always in the same order so the same state is the same string. */
export function readerHash({ chapter, view, weave, verse }: ReaderAddress): string {
  const params = new URLSearchParams();
  if (chapter !== undefined) params.set('c', String(chapter));
  if (view) params.set('view', view);
  if (weave) params.set('weave', weave);
  if (verse !== undefined) params.set('v', String(verse));
  const query = params.toString();
  return query ? `#/?${query}` : '#/';
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
export function openReader(address: Pick<ReaderAddress, 'chapter' | 'verse'>): void {
  window.history.pushState(null, '', urlFor(readerHash(address)));
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
