// src/tutor/registry.ts — what the tutor can see and where it can take him (mw-t3xu9a.4, docs/ask-tutor.md 'What the tutor can see'): Lampas's registry for voice-kit's tutor client
// (@voice-kit/talks createTutorClient). The Governor's words (2026-10-22): everything in the app is an API the tutor can ask for or work through. A FACT is something the app reads
// when asked (the core ones ride in every request); a PLACE is a screen it can open, through `navigate`, as a pushed history entry marked as a tutor go, so Back returns to where he was.
// The request is built by the client (`withTutorFacts`: the facts and the catalogue added to the app's own fields, which pass through untouched); the commands come in mw-t3xu9a.6.
import { createMemoryStore, createTutorClient, defineRegistry, type Fact, type Place, type Registry, type TutorClient } from 'voice-kit/talks';
import { BOOKS, titleOf } from '../data/books';
import { learnerGrammar } from '../data/grammar/learnerGrammar';
import { learnerSummary } from '../data/learnerSummary';
import { rustyNow } from '../data/learnerRusty';
import { todayNow } from '../data/learnerToday';
import { shelfOf } from '../data/repositories';
import { openedByTutor } from '../nav/readerRequest';
import { navigate, ROUTES, readerOf, routeOf, type Route } from '../nav/route';
import { worksForTutor } from '../resources/tutorLinks';
import { greekLevelOf } from '../settings/definitions/greekInterest';
import { currentSettings } from '../settings/registry';
import type { TalkRequest } from '../services/talk';
import { openSheetTitles } from '../ui/sheetBack';
import { settingsSentTo } from './knows';
import { SCREEN_NAMES } from './screen';
import { screenContextNow } from './screenContext';

/** The facts' names: a name is the one way the tutor has to call a fact or a place, so no screen goes by one of them. */
const FACT_NAMES: readonly string[] = ['where-he-is', 'today-drill', 'settings', 'progress', 'rusty-words', 'works'];

/** The name of the place that opens a screen: the route's own, the Reader's being 'reader' and the Settings screen 'settings-screen' (its name is the fact's). */
export const placeNameOf = (route: Route): string => {
  const name = route === 'home' ? 'reader' : route;
  return FACT_NAMES.includes(name) ? `${name}-screen` : name;
};

const READER = 'Reader';

/** What the tutor calls a screen. */
const screenNameOf = (route: Route): string => (route === 'home' ? READER : route === 'share' ? 'Share' : route === 'unlock' ? 'Licence' : SCREEN_NAMES[route]);

/** The key of the screen he is on now, for the tutor client's up-front list and record: the name the screen reported, else the one its address gives (the Reader for the plain address). */
export const screenKey = (): string => screenContextNow()?.name ?? screenNameOf(routeOf(window.location.hash));

/** A chapter of the app's books, from args as the tutor wrote them: the book by name ('Colossians', 'colossians') or by code ('col'), the chapter in the book's range. */
export function chapterOf(args: unknown): { book: string; chapter: number; title: string } | undefined {
  const asked = typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {};
  const name = typeof asked.book === 'string' ? asked.book.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
  const book = BOOKS.find((b) => b.code === name || b.name.toLowerCase() === name);
  const chapter = asked.chapter;
  if (!book || typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return undefined;
  return { book: book.code, chapter, title: titleOf(book.code, chapter) };
}

const CHAPTER = 'chapter';

/** The words a place goes by in the talk ('Words', 'John 3'): `Opened Words`. */
export function titleOfPlace(name: string, args: unknown): string | undefined {
  if (name === CHAPTER) return chapterOf(args)?.title;
  const route = ROUTES.find((r) => placeNameOf(r) === name);
  return route ? screenNameOf(route) : undefined;
}

/** Where he is: the screen on show (its reported name and facts), the address and, in the Reader, its book, chapter, view, weave and verse, and the headings of the sheets open. */
async function whereHeIs(): Promise<unknown> {
  const hash = window.location.hash;
  const route = routeOf(hash);
  const reported = screenContextNow();
  const sheets = openSheetTitles();
  return {
    screen: reported?.name ?? screenNameOf(route),
    route,
    ...(route === 'home' ? { reader: readerOf(hash) } : {}),
    ...(reported && reported.facts.length > 0 ? { facts: reported.facts } : {}),
    ...(sheets.length > 0 ? { sheets } : {}),
  };
}

const whereHeIsFact: Fact = { name: 'where-he-is', tell: 'the screen he is on, the chapter and verse in the Reader, the sheets open', core: true, read: whereHeIs };
const todayDrillFact: Fact = { name: 'today-drill', tell: "the items of today's drill (the Today chip), each with its title and whether he ticked it", core: true, read: () => todayNow() };
const settingsFact: Fact = { name: 'settings', tell: 'what every setting holds now', core: true, read: currentSettings };

const FACTS: readonly Fact[] = [
  whereHeIsFact,
  todayDrillFact,
  settingsFact,
  {
    name: 'progress',
    tell: 'where he stands: the learner line (solid words, learning, due) and his grammar (goal, counts, suggested move)',
    read: async () => ({ learner: await learnerSummary(), grammar: await learnerGrammar().catch(() => undefined) }),
  },
  { name: 'rusty-words', tell: 'the solid words and ideas he now slips on or has been away from, worst first', read: async () => (await rustyNow().catch(() => undefined)) ?? [] },
  {
    name: 'works',
    tell: 'the digest of his Logos shelf: pinned books, commentaries, grammars',
    read: async () => worksForTutor(await shelfOf().catch(() => []), undefined, '', greekLevelOf((await currentSettings()).greekInterest)),
  },
];

const placeForRoute = (route: Route): Place => ({
  name: placeNameOf(route),
  tell: route === 'home' ? 'Opens the Reader' : `Opens ${screenNameOf(route)}`,
  open: async () => navigate(route, { tutor: true }),
});

const chapterPlace: Place = {
  name: CHAPTER,
  tell: 'Opens a chapter of the New Testament in the Reader',
  args: { type: 'object', required: ['book', 'chapter'], additionalProperties: false, properties: { book: { type: 'string', description: 'its name: Colossians' }, chapter: { type: 'integer', minimum: 1, maximum: 150 } } },
  open: async (args) => {
    const chapter = chapterOf(args);
    if (!chapter) throw new Error('the app has no such chapter');
    openedByTutor(chapter.book, chapter.chapter);
  },
};

/** The Bible talk's registry: six facts (three core), a place for every screen and for a chapter. */
export const lampasRegistry = (): Registry => defineRegistry({ facts: FACTS, places: [...ROUTES.map(placeForRoute), chapterPlace] });

/** The verse ask's smaller set: the core facts only (its settings are the ones its grind is told), and no place: its answer does not go anywhere. */
export const askRegistry = (): Registry =>
  defineRegistry({
    facts: [whereHeIsFact, todayDrillFact, { ...settingsFact, tell: 'what the settings this tutor is told hold now', read: () => settingsSentTo('verse-ask') }],
  });

/** The tutor's record (the ask-backs and misses of each screen, for the weights a later story tunes) is kept while the page lives; the clients of both grinds write to it. */
const store = createMemoryStore();

const clientOf = (registry: Registry): TutorClient<never> =>
  createTutorClient<never>({
    store,
    registry,
    screen: screenKey,
    // Lampas sends its own requests (src/services/talk.ts askTalk, src/services/tutor.ts askTutor): the client builds them and carries out the answer's go
    send: () => Promise.reject(new Error('the client sends nothing: the app does')),
  });

let talkClient: TutorClient<never> | undefined;
let askClient: TutorClient<never> | undefined;
let talkRegistry: Registry | undefined;

/** The client of the Bible talk. */
export const bibleTalkClient = (): TutorClient<never> => (talkClient ??= clientOf((talkRegistry ??= lampasRegistry())));

/** The Bible talk's registry, made once. */
export const bibleTalkRegistry = (): Registry => (talkRegistry ??= lampasRegistry());

/** The client of the verse ask. */
export const askClientOf = (): TutorClient<never> => (askClient ??= clientOf(askRegistry()));

/** The request for turn `turn` of a talk: `request` (the app's own fields, passed through untouched) with the facts read up front and the catalogue. */
export async function withTutorFacts(request: TalkRequest, turn: number): Promise<TalkRequest> {
  return bibleTalkClient().buildRequest(turn, request);
}

/** The same for the verse ask's request, with its smaller set. */
export async function askWithFacts<F extends object>(request: F, turn: number): Promise<F> {
  return askClientOf().buildRequest(turn, request);
}
