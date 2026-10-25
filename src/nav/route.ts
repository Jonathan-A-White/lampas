// src/nav/route.ts — twenty-eight screens (ROUTES), told apart by the address hash, so the phone's Back button walks them.
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
import type { MemorizeLang } from '../memorize/languages';
import { previousAddress } from './lastRoute';

export type Route = 'home' | 'words' | 'import' | 'test' | 'drill' | 'review' | 'today' | 'paradigms' | 'placement' | 'goal' | 'path' | 'ipa' | 'sounds' | 'studyway' | 'aboutyou' | 'memory' | 'requests' | 'conversations' | 'askmore' | 'about' | 'preface' | 'essay' | 'library' | 'lists' | 'memorize' | 'settings' | 'share' | 'unlock';

const ROUTE_TABLE: Record<Route, true> = {
  home: true, words: true, import: true, test: true, drill: true, review: true, today: true, paradigms: true, placement: true, goal: true, path: true, ipa: true, sounds: true, studyway: true,
  aboutyou: true, memory: true, requests: true, conversations: true, askmore: true, about: true, preface: true, essay: true, library: true, lists: true, memorize: true, settings: true, share: true, unlock: true,
};

/** Every screen of the app, once: the table the tutor's places are checked against (src/tutor/registry.ts, tests/unit/tutor-registry.test.ts). A new Route fails typecheck until it is listed here. */
export const ROUTES = Object.keys(ROUTE_TABLE) as Route[];

/** What the history entry of a place the tutor took him to carries (mw-t3xu9a.4): a pushed entry, so Back returns to where he was; the Talk sheet beneath it comes back with Back (src/ui/sheetBack.ts leaveSheetForTutor). */
export type TutorGoEntry = { tutorGo: true };

/** True when the entry he is on is one the tutor took him to. */
export const isTutorGo = (): boolean => (window.history.state as Partial<TutorGoEntry> | null)?.tutorGo === true;

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
  /** the last verse, when the Verse view shows any range of the chapter (a lesson's, src/data/passage.ts rangeOf) rather than the passage under a heading */
  passageTo?: number;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Calls `listener` on every change of the address: a move of the app's own (navigate, openVerse, replaceHash) and the phone's Back or Forward. */
export function watchAddress(listener: () => void): () => void {
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
  if (path === '#/today') return 'today';
  if (path === '#/paradigms') return 'paradigms';
  if (path === '#/placement') return 'placement';
  if (path === '#/goal') return 'goal';
  if (path === '#/path') return 'path';
  if (path === '#/ipa') return 'ipa';
  if (path === '#/sounds') return 'sounds';
  if (path === '#/studyway') return 'studyway';
  if (path === '#/aboutyou') return 'aboutyou';
  if (path === '#/memory') return 'memory';
  if (path === '#/requests') return 'requests';
  if (path === '#/conversations') return 'conversations';
  if (path === '#/askmore') return 'askmore';
  if (path === '#/about') return 'about';
  if (path === '#/preface') return 'preface';
  if (path === ESSAY_PATH) return 'essay';
  if (path === '#/library') return 'library';
  if (path === LISTS_PATH || path.startsWith(`${LISTS_PATH}/`)) return 'lists';
  if (path === MEMORIZE_PATH || path.startsWith(`${MEMORIZE_PATH}/`)) return 'memorize';
  if (path === '#/settings') return 'settings';
  if (path === '#/share') return 'share';
  if (path === '#/unlock') return 'unlock';
  return 'home';
}

/** The Verse lists screen (src/lists/); one list is `#/lists/<id>`. */
export const LISTS_PATH = '#/lists';

/** The Memorize screen (src/memorize/); one session is `#/memorize/<canonical reference>/<en|el|weave>`, and the bare address opens the next verse that is due. */
export const MEMORIZE_PATH = '#/memorize';

/** The in-app copy of Robinson's essay (src/Essay.tsx), a page under the Preface. */
export const ESSAY_PATH = '#/preface/robinson';

const pageOpenedOnReader = typeof window === 'undefined' || routeOf(window.location.hash) === 'home';

/** The page was loaded on the Reader (a reopen, a link, a reload there), not on another screen. A page loaded on Settings and reloaded there
 * reaches the Reader later by Back, to an entry whose address holds the weave from before he chose another: that older address must not win
 * over the saved setting (src/reader/useReaderSettings.ts, mw-5r3p30.658). */
export const openedOnReader = (): boolean => pageOpenedOnReader;

export const hashFor = (route: Route) => (route === 'home' ? '#/' : route === 'essay' ? ESSAY_PATH : `#/${route}`);

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
  const passageTo = wholeNumber(params.get('pt'));
  if (passage !== undefined && passageTo !== undefined && passageTo >= passage) address.passageTo = passageTo;
  return address;
}

/** The reader's address, always in the same order so the same state is the same string. */
export function readerHash({ book, chapter, view, weave, verse, passage, passageTo }: ReaderAddress): string {
  const params = new URLSearchParams();
  if (book !== undefined) params.set('b', book);
  if (chapter !== undefined) params.set('c', String(chapter));
  if (view) params.set('view', view);
  if (weave) params.set('weave', weave);
  if (verse !== undefined) params.set('v', String(verse));
  if (passage !== undefined) params.set('p', String(passage));
  if (passage !== undefined && passageTo !== undefined) params.set('pt', String(passageTo));
  const query = params.toString();
  return query ? `#/?${query}` : '#/';
}

/** The two views of a paradigm table (mw-irpgqi.2): Learn (every form shown) and Drill (each cell blank until tapped, then Had it or Missed). */
export type ParadigmMode = 'learn' | 'drill';

/** The names the modes had before mw-irpgqi.2 (Study hid the cells, Review showed them): an address kept or linked then still opens the same view. */
const OLD_PARADIGM_MODES: Readonly<Record<string, ParadigmMode>> = { study: 'drill', review: 'learn' };

/** What the address says about the Paradigms screen: no table is the list; a table opens in a mode (Drill when it is not said). */
export interface ParadigmAddress {
  /** the table's id: 'article', 'eimi' */
  table?: string;
  mode?: ParadigmMode;
  /** the cell of the table that is a tapped word's own, by its name (paradigms cellName): it is lit and brought into view (mw-irpgqi.1) */
  cell?: string;
  /** the word whose cell it is, as the text has it ('ἀγαπῶ'), and its RP parsing code ('V-PAI-1S'): the screen says them beside the table's name */
  word?: string;
  parse?: string;
  /** the word's lemma ('ἀγαπάω'): the table can then show its own forms, This word (mw-irpgqi.4) */
  lemma?: string;
  /** the table shows the lemma's own forms (This word) and not the pattern's */
  own?: boolean;
}

export function paradigmOf(hash: string): ParadigmAddress {
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const address: ParadigmAddress = {};
  const table = params.get('t');
  if (table !== null && paradigmById(table)) address.table = table;
  const mode = params.get('mode');
  const read = mode === 'learn' || mode === 'drill' ? mode : mode !== null ? OLD_PARADIGM_MODES[mode] : undefined;
  if (address.table !== undefined && read !== undefined) address.mode = read;
  const cell = params.get('cell');
  if (address.table !== undefined && cell) address.cell = cell;
  const word = params.get('w');
  const parse = params.get('p');
  if (address.table !== undefined && word && parse) {
    address.word = word;
    address.parse = parse;
  }
  const lemma = params.get('l');
  if (address.table !== undefined && lemma) {
    address.lemma = lemma;
    if (params.get('own') === '1') address.own = true;
  }
  return address;
}

/** The Paradigms address, always in the same order. */
export function paradigmHash({ table, mode, cell, word, parse, lemma, own }: ParadigmAddress): string {
  const params = new URLSearchParams();
  if (table !== undefined) params.set('t', table);
  if (table !== undefined && mode) params.set('mode', mode);
  if (table !== undefined && cell) params.set('cell', cell);
  if (table !== undefined && word && parse) {
    params.set('w', word);
    params.set('p', parse);
  }
  if (table !== undefined && lemma) {
    params.set('l', lemma);
    if (own) params.set('own', '1');
  }
  const query = params.toString();
  return query ? `#/paradigms?${query}` : '#/paradigms';
}

const urlFor = (hash: string) => `${window.location.pathname}${window.location.search}${hash}`;

/** Opens a screen; `replace` swaps the current history entry instead of adding one. Opening the screen he is already on adds nothing (a double tap). */
export function navigate(route: Route, options: { replace?: boolean; tutor?: boolean } = {}): void {
  if (options.replace) replaceHash(hashFor(route));
  else {
    if (window.location.hash === hashFor(route)) return;
    window.history.pushState(options.tutor ? ({ tutorGo: true } satisfies TutorGoEntry) : null, '', urlFor(hashFor(route)));
    notify();
  }
}

/** A header back button's way to `route`: a step Back when the entry behind this one is that screen (the phone's Back after it then leaves this screen's
 * parent rather than returning to the screen he has just left, mw-5r3p30.458), else (a reload or a link left nothing behind) that screen opened afresh.
 * The Reader counts only as the plain Reader: behind an open verse or passage is a Verse view, which Back would reopen. */
export function backTo(route: Route): void {
  const behind = previousAddress();
  const plainReader = behind !== null && readerOf(behind).verse === undefined && readerOf(behind).passage === undefined;
  if (behind !== null && routeOf(behind) === route && (route !== 'home' || plainReader)) {
    window.history.back();
    return;
  }
  navigate(route);
}

/** What the address says about the Library screen (src/library/): no kind is the home; a kind (`kind=lexicon`) is that kind's page, and a book (`book=<Resource ID>`) is the one the page opens at. Both are raw text:
 *  the screen checks them against the catalogue. `import` (`#/library?import`) is the page where he imports his Logos list, and wins over a kind; `import=<id>` (a CSV shared to Lampas,
 *  src/share/target.ts) names the parked share the page reads the list from. */
export interface LibraryAddress {
  kind?: string;
  book?: string;
  import?: true;
  /** the parked share holding the list, when the import was opened by Share to Lampas */
  share?: string;
}

export function libraryOf(hash: string): LibraryAddress {
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const address: LibraryAddress = {};
  const kind = params.get('kind');
  if (kind) address.kind = kind;
  const book = params.get('book');
  if (kind && book) address.book = book;
  if (params.has('import')) address.import = true;
  const share = params.get('import');
  if (share) address.share = share;
  return address;
}

/** The Library address, always in the same order. */
export function libraryHash({ kind, book, import: importing, share }: LibraryAddress): string {
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (kind && book) params.set('book', book);
  const query = params.toString();
  if (importing) {
    const flag = share ? `import=${encodeURIComponent(share)}` : 'import';
    return query ? `#/library?${query}&${flag}` : `#/library?${flag}`;
  }
  return query ? `#/library?${query}` : '#/library';
}

/** Opens the Library home, a kind's page, a kind's page at a book, or the import, as a new Back step. */
export function openLibrary(address: LibraryAddress = {}): void {
  const hash = libraryHash(address);
  if (window.location.hash === hash) return;
  window.history.pushState(null, '', urlFor(hash));
  notify();
}

/** The id of the verse list an address opens (`#/lists/7`), or undefined for the lists screen and any address that is no list's. */
export function verseListOf(hash: string): number | undefined {
  const m = /^#\/lists\/([1-9]\d{0,9})$/.exec(pathOf(hash));
  return m ? Number(m[1]) : undefined;
}

export const verseListHash = (id: number): string => `${LISTS_PATH}/${id}`;

/** The session an address opens (`#/memorize/Rom.8.28/en`): the canonical reference and the language, or undefined for the Memorize home and any address that is no session's. */
export function memorizeSessionOf(hash: string): { ref: string; lang: MemorizeLang } | undefined {
  const m = /^#\/memorize\/([^/]+)\/([^/]+)$/.exec(pathOf(hash));
  if (!m) return undefined;
  const lang = m[2];
  const ref = decodeURIComponent(m[1]);
  return (lang === 'en' || lang === 'el' || lang === 'weave') && /^[0-9A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?$/.test(ref) ? { ref, lang } : undefined;
}

export const memorizeSessionHash = (ref: string, lang: MemorizeLang): string => `${MEMORIZE_PATH}/${encodeURIComponent(ref)}/${lang}`;

/** Opens a Memorize session, as a new Back step; `replace` puts it in the place of the one he is on (Next verse), so the run is one entry and Back leaves it; `tutor` marks the entry as one the tutor took him to. */
export function openMemorizeSession(ref: string, lang: MemorizeLang, options: { replace?: boolean; tutor?: boolean } = {}): void {
  const hash = memorizeSessionHash(ref, lang);
  if (options.replace) return replaceHash(hash);
  if (window.location.hash === hash) return;
  window.history.pushState(options.tutor ? ({ tutorGo: true } satisfies TutorGoEntry) : null, '', urlFor(hash));
  notify();
}

/** Leaves Memorize for where he came from: a step Back when the entry behind this one is the app's own, else Today. */
export function closeMemorize(): void {
  if (previousAddress() !== null) window.history.back();
  else navigate('today', { replace: true });
}

/** Opens one verse list, as a new Back step; `tutor` marks the entry as one the tutor took him to. */
export function openVerseList(id: number, options: { tutor?: boolean } = {}): void {
  const hash = verseListHash(id);
  if (window.location.hash === hash) return;
  window.history.pushState(options.tutor ? ({ tutorGo: true } satisfies TutorGoEntry) : null, '', urlFor(hash));
  notify();
}

/** The screen Your requests was opened from, which its back button returns to: About says so in the address ('#/requests?from=about'); Settings is the rest. */
export type RequestsOrigin = 'about' | 'settings';

export function requestsOf(hash: string): RequestsOrigin {
  const q = hash.indexOf('?');
  return q >= 0 && new URLSearchParams(hash.slice(q + 1)).get('from') === 'about' ? 'about' : 'settings';
}

/** Opens Your requests from `from`, as a new Back step (not a second one when it is already open). */
export function openRequests(from: RequestsOrigin): void {
  const hash = from === 'about' ? '#/requests?from=about' : '#/requests';
  if (window.location.hash === hash) return;
  window.history.pushState(null, '', urlFor(hash));
  notify();
}

/** Where the Licence page was opened from, which its back button returns to: the tip at the foot of the Reader says so in the address ('#/unlock?from=reader');
 * Settings (a 'Needs a licence' row) is the rest. */
export type LicenceOrigin = 'reader' | 'settings';

export function licenceOriginOf(hash: string): LicenceOrigin {
  const q = hash.indexOf('?');
  return q >= 0 && new URLSearchParams(hash.slice(q + 1)).get('from') === 'reader' ? 'reader' : 'settings';
}

/** What the history entry of the Licence page carries, so closing it can step Back to the screen it was opened from (as the Verse view's). */
type LicenceEntry = { licencePage?: boolean } | null;

/** Opens the Licence page from `from`, as a new Back step: Back returns to that screen, which has not moved. */
export function openLicence(from: LicenceOrigin): void {
  const hash = from === 'reader' ? '#/unlock?from=reader' : '#/unlock';
  if (window.location.hash === hash) return;
  window.history.pushState({ licencePage: true } satisfies LicenceEntry, '', urlFor(hash));
  notify();
}

/** Leaves the Licence page for the screen it was opened from: a step Back when openLicence opened it (the screen is as he left it, scroll and all), else (a reopen or a link) that screen opened afresh. */
export function closeLicence(origin: LicenceOrigin): void {
  if ((window.history.state as LicenceEntry)?.licencePage) {
    window.history.back();
    return;
  }
  navigate(origin === 'reader' ? 'home' : 'settings');
}

/** Opens the reader at a chapter and verse, as a new Back step; `tutor` marks the entry as one the tutor took him to. */
export function openReader(address: Pick<ReaderAddress, 'book' | 'chapter' | 'verse'>, options: { tutor?: boolean } = {}): void {
  window.history.pushState(options.tutor ? ({ tutorGo: true } satisfies TutorGoEntry) : null, '', urlFor(readerHash(address)));
  notify();
}

/** Opens the reader at a chapter in the place of the entry he is on, which was a screen that a sheet had pushed an entry for (Share to Lampas): the entry keeps its place in the trail
 * but not the sheet's mark, so Back from the Reader returns to the entry beneath, the screen with no sheet, and the screen draws its sheet afresh (src/ui/sheetBack.ts skipStale
 * would otherwise step over the sheet's entry at the moment the screen mounts a new one). */
export function replaceReader(address: Pick<ReaderAddress, 'book' | 'chapter'>): void {
  const kept = { ...(window.history.state as Record<string, unknown> | null) };
  delete kept.sheet;
  window.history.replaceState(kept, '', urlFor(readerHash(address)));
  notify();
}

/** Opens an address of the app that is not a screen's own (a link, '#/?ref=Rom.8.28', src/nav/links.ts), as a new Back step. A change of `location.hash` would fire a
 * popstate, which an open sheet takes for Back. */
export function openHash(hash: string): void {
  window.history.pushState(null, '', urlFor(hash));
  notify();
}

/** What the history entry of a Verse view carries, so closing it can step Back to the Reader it was opened from. */
type VerseEntry = { verseView?: boolean } | null;

/** Opens the Verse view (src/VerseView.tsx) on `verse` of the chapter the address names, as a new Back step: Back returns to the Reader,
 * which has not moved. */
export function openVerse(verse: number): void {
  const here = readerOf(window.location.hash);
  delete here.passage;
  delete here.passageTo;
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash({ ...here, verse })));
  notify();
}

/** Opens the Verse view on a verse of any New Testament chapter (a verse the tutor named, mw-5r3p30.123), as a new Back step: the Reader opens that chapter at the verse and
 * Back returns to where he was. */
export function openVerseAt(place: Pick<ReaderAddress, 'book' | 'chapter' | 'verse' | 'view' | 'weave'>): void {
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash(place)));
  notify();
}

/** Opens the same view on the passage under a section heading, which starts at verse `first` (mw-5r3p30.73), as a new Back step. */
export function openPassage(first: number): void {
  const here = readerOf(window.location.hash);
  delete here.verse;
  delete here.passageTo;
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash({ ...here, passage: first })));
  notify();
}

/** Opens the same view on any run of verses of a chapter (a passage lesson's range, '1jn.1.1-4'), as a new Back step: the Reader opens that chapter and Back returns to where he was. */
export function openVerseRange(range: { book: string; chapter: number; from: number; to: number } & Pick<ReaderAddress, 'view' | 'weave'>): void {
  window.history.pushState({ verseView: true } satisfies VerseEntry, '', urlFor(readerHash({ view: range.view, weave: range.weave, book: range.book, chapter: range.chapter, passage: range.from, passageTo: range.to })));
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
  delete without.passageTo;
  replaceHash(readerHash(without));
}

/** The Verse view moves to another verse, in this chapter or another, on the entry it is on (no new Back step). */
export function moveVerse(to: { book: string; chapter: number; verse: number }): void {
  const here = readerOf(window.location.hash);
  delete here.passage;
  delete here.passageTo;
  const sameChapter = (here.book ?? 'rom') === to.book && here.chapter === to.chapter;
  replaceHash(readerHash(sameChapter ? { ...here, verse: to.verse } : { book: to.book, chapter: to.chapter, verse: to.verse }));
}

/** The Verse view moves to another passage of the chapter, on the entry it is on (no new Back step). */
export function movePassage(first: number): void {
  const here = readerOf(window.location.hash);
  delete here.verse;
  delete here.passageTo;
  replaceHash(readerHash({ ...here, passage: first }));
}

/** Where the placement was started from: its address says so ('#/placement?from=goal'), and no word means Settings, where Place me was first. */
export type PlacementOrigin = 'goal' | 'settings';

export function placementOriginOf(hash: string): PlacementOrigin {
  const q = hash.indexOf('?');
  return new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('from') === 'goal' ? 'goal' : 'settings';
}

/** The end card the placement's entry reached, when it reached one: its address names it ('#/placement?from=goal&card=k3x9'), so a reload, or
 * Back to the entry, shows the card again, while a new Place me (no card) opens the intro (mw-86e9r1.23). */
export function placementCardOf(hash: string): string | null {
  const q = hash.indexOf('?');
  return new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('card') || null;
}

export function placementCardHash(from: PlacementOrigin, card: string): string {
  const params = new URLSearchParams();
  if (from === 'goal') params.set('from', 'goal');
  params.set('card', card);
  return `#/placement?${params.toString()}`;
}

/** The placement reached its end card `card`: the entry he is on says so, with no new Back step (nothing, once he has left the placement). */
export function showPlacementCard(card: string): void {
  const here = window.location.hash;
  if (routeOf(here) === 'placement') replaceHash(placementCardHash(placementOriginOf(here), card));
}

/** Opens the placement as a new Back step, remembering where it was started from so its way out returns there. */
export function openPlacement(from: PlacementOrigin): void {
  window.history.pushState(null, '', urlFor(from === 'goal' ? '#/placement?from=goal' : '#/placement'));
  notify();
}

/** Where a Hard sounds lesson is (src/hardSounds/, mw-5r3p30.361): its id and the step on screen, from 0: '#/sounds?l=tapped-r&s=2'. */
export interface SoundLessonAddress {
  lesson?: string;
  step: number;
}

export function soundLessonOf(hash: string): SoundLessonAddress {
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const step = params.get('s');
  return { lesson: params.get('l') ?? undefined, step: step !== null && /^\d{1,2}$/.test(step) ? Number(step) : 0 };
}

const soundLessonHash = ({ lesson, step }: SoundLessonAddress): string => `#/sounds?${new URLSearchParams({ l: lesson ?? '', s: String(step) }).toString()}`;

/** Opens a Hard sounds lesson at its first step, as a new Back step. */
export function openSoundLesson(lesson: string): void {
  window.history.pushState(null, '', urlFor(soundLessonHash({ lesson, step: 0 })));
  notify();
}

/** The lesson moved to step `step`: the entry he is on says so, with no new Back step, so Back from a verse it opened comes back to the step. */
export function showSoundStep(step: number): void {
  const here = window.location.hash;
  if (routeOf(here) === 'sounds') replaceHash(soundLessonHash({ lesson: soundLessonOf(here).lesson, step }));
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
  return useSyncExternalStore(watchAddress, () => window.location.hash);
}

export function useRoute(): Route {
  return routeOf(useAddress());
}
