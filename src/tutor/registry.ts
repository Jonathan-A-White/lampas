// src/tutor/registry.ts — what the tutor can see and where it can take him (mw-t3xu9a.4, docs/ask-tutor.md 'What the tutor can see'): Lampas's registry for voice-kit's tutor client
// (@voice-kit/talks createTutorClient). The Governor's words (2026-10-22): everything in the app is an API the tutor can ask for or work through. A FACT is something the app reads
// when asked (the core ones ride in every request); a PLACE is a screen it can open, through `navigate`, as a pushed history entry marked as a tutor go, so Back returns to where he was.
// The request is built by the client (`withTutorFacts`: the facts and the catalogue added to the app's own fields, which pass through untouched). A COMMAND (mw-t3xu9a.6) is something the app does: the app's own
// buttons go through the same named commands the tutor calls (set-setting, tick-today, start-review, add-word, and the place open-work), so a tap, a spoken yes and a tutor `do` run the one function.
import { createMemoryStore, createTutorClient, defineRegistry, type Command, type CommandResult, type Fact, type Place, type Registry, type TutorClient } from 'voice-kit/talks';
import { addLemmaToLearn, type AddedLemma } from '../data/answerWord';
import { BOOKS, titleOf } from '../data/books';
import { getDay, localDate, setTicked } from '../data/daily/dailyStore';
import { NO_CHAPTER } from '../data/chapter';
import { learnerGrammar } from '../data/grammar/learnerGrammar';
import { learnerSummary } from '../data/learnerSummary';
import { rustyNow } from '../data/learnerRusty';
import { todayEntries, todayNow } from '../data/learnerToday';
import { getWorks, listedWord, moveToFrontier, restoreWord, shelfOf, type ItemRef } from '../data/repositories';
import { RUSTY_MAX } from '../data/rusty';
import { openedByTutor } from '../nav/readerRequest';
import { navigate, ROUTES, readerOf, routeOf, type Route } from '../nav/route';
import { CATALOGUE } from '../resources/catalogue';
import { armFallback } from '../resources/openApp';
import { worksForTutor, workChip } from '../resources/tutorLinks';
import { workOf } from '../resources/works';
import { setPractise } from '../review/practise';
import { greekLevelOf } from '../settings/definitions/greekInterest';
import { dailyTicksSetting } from '../settings/definitions';
import { applyChanges, currentSettings, MAX_CHANGES, undoChange, type ChangeResult } from '../settings/registry';
import { getSetting } from '../settings/store';
import { leaveTalk } from '../talk/leave';
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
const OPEN_WORK = 'open-work';

/** The words a place goes by in the talk ('Words', 'John 3'): `Opened Words`. */
export function titleOfPlace(name: string, args: unknown): string | undefined {
  if (name === CHAPTER) return chapterOf(args)?.title;
  if (name === OPEN_WORK) return workTitleOf(args);
  const route = ROUTES.find((r) => placeNameOf(r) === name);
  return route ? screenNameOf(route) : undefined;
}

/** The id of a work in args as the tutor wrote it: a work of several volumes or a book of his shelf. */
const workIdOf = (args: unknown): string => {
  const id = typeof args === 'object' && args !== null ? (args as Record<string, unknown>).id : undefined;
  return typeof id === 'string' ? id : '';
};

/** What the talk calls the work an id names ('Calvin's Commentaries'), or undefined for an id no work or book of the catalogue has. */
function workTitleOf(args: unknown): string | undefined {
  const id = workIdOf(args);
  return workOf(id)?.title ?? CATALOGUE.find((e) => e.resource === id)?.short;
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

/** How open-work hands Logos its address (a test replaces `open`). */
export const workDoor = { open: (url: string): void => window.location.assign(url) };

const workPlace: Place = {
  name: OPEN_WORK,
  tell: 'Opens a book of his shelf (from works) in Logos',
  args: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1, maxLength: 80 } } },
  open: async (args) => {
    const id = workIdOf(args);
    const [ticked, shelf, settings] = await Promise.all([getWorks(), shelfOf().catch(() => []), currentSettings()]);
    const found = workChip(id, undefined, ticked, undefined, greekLevelOf(settings.greekInterest), shelf.map((row) => row.id));
    if (!found) throw new Error('that book is not on his shelf, or Logos has nowhere to open it');
    // The app's own address; when the phone has no app for it nothing happens, so the https fallback is armed as a tap on the link arms it
    workDoor.open(found.chip.url);
    armFallback(found.chip.fallback);
  },
};

/** What set-setting, tick-today and add-word hand back beside their said line and undo: what the app did, for the caller that keeps it (a talk turn, a button's own line). */
export type SettingRan = CommandResult & ChangeResult;

/** One change, checked and written by the settings registry; `skipUnchanged` writes nothing, and says nothing, for a setting already set that way. The undo puts the old value back. */
const setSettingCommand: Command = {
  name: 'set-setting',
  tell: 'Changes a setting; the app can undo it',
  args: {
    type: 'object',
    required: ['name', 'value'],
    additionalProperties: false,
    properties: { name: { type: 'string', minLength: 1, maxLength: 80 }, value: {}, skipUnchanged: { type: 'boolean' } },
  },
  kind: 'undoable',
  run: async (args): Promise<SettingRan> => {
    const { name, value, skipUnchanged } = args as { name: string; value: unknown; skipUnchanged?: boolean };
    const result = await applyChanges([{ key: name, value }], skipUnchanged ? { skipUnchanged: true } : {});
    const [change] = result.applied;
    return { ...result, said: change ? `Changed: ${change.shown}` : (result.refused[0] ?? 'Already set that way'), ...(change ? { undo: () => undoChange(change) } : {}) };
  },
};

const MALFORMED_CHANGE = 'A change was left out: it was not a setting and a value.';

/**
 * The one way the app changes a setting for a talk (an answer's settings_changes, the offered change, the verse ask's Ask by): each change runs the set-setting command, in order, so a later change of the
 * same setting is from the earlier one. Said as applyChanges says it: what was applied, and a plain sentence for each change left out; at most MAX_CHANGES.
 */
export async function changeSettings(changes: unknown, options: { skipUnchanged?: boolean } = {}): Promise<ChangeResult> {
  const result: ChangeResult = { applied: [], refused: [] };
  if (!Array.isArray(changes)) return result;
  for (const change of changes.slice(0, MAX_CHANGES)) {
    const asked = typeof change === 'object' && change !== null ? (change as Record<string, unknown>) : {};
    if (typeof asked.key !== 'string' || !('value' in asked)) {
      result.refused.push(MALFORMED_CHANGE);
      continue;
    }
    const ran = await bibleTalkRegistry().run('set-setting', { name: asked.key, value: asked.value, ...(options.skipUnchanged ? { skipUnchanged: true } : {}) });
    if (!ran.ok) throw new Error(ran.why);
    const { applied, refused } = ran as unknown as SettingRan;
    result.applied.push(...applied);
    result.refused.push(...refused);
  }
  if (changes.length > MAX_CHANGES) result.refused.push(`Left out ${changes.length - MAX_CHANGES} more changes than the app takes at once.`);
  return result;
}

/** Ticks `item` of Today (its title as the today-drill fact has it, or its piece id), or with `on: false` takes the tick away; the undo puts the tick back as it was. Only while Tick boxes is On. */
const tickTodayCommand: Command = {
  name: 'tick-today',
  tell: "Ticks an item of today-drill by its title; on false unticks; undoable",
  args: { type: 'object', required: ['item'], additionalProperties: false, properties: { item: { type: 'string', minLength: 1, maxLength: 80 }, on: { type: 'boolean' } } },
  kind: 'undoable',
  run: async (args): Promise<CommandResult> => {
    const { item, on = true } = args as { item: string; on?: boolean };
    if ((await getSetting(dailyTicksSetting)) !== 'on') throw new Error('Tick boxes is Off, so nothing on Today can be ticked');
    const now = new Date();
    const wanted = item.normalize('NFC').trim().toLowerCase();
    const entry = (await todayEntries(now))?.find((e) => e.id === wanted || e.item.title.toLowerCase() === wanted);
    if (!entry) throw new Error(`Today holds no item called "${item}"`);
    const date = localDate(now);
    const was = (await getDay(date)).ticked.includes(entry.id);
    if (was === on) return { said: `${entry.item.title} was already ${on ? 'ticked' : 'not ticked'}` };
    await setTicked(date, entry.id, on);
    return { said: `${on ? 'Ticked' : 'Unticked'} ${entry.item.title}`, undo: () => setTicked(date, entry.id, was) };
  },
};

/** The tap of a Today box: the tick-today command. Throws what it was refused with. */
export async function tickToday(item: string, on: boolean): Promise<string> {
  const ran = await bibleTalkRegistry().run('tick-today', { item, on });
  if (!ran.ok) throw new Error(ran.why);
  return ran.said;
}

/** Opens Review, closing an open Talk sheet first. With items (the rusty ones, at most RUSTY_MAX), the ones still solid move to Frontier and the round is made of just those. */
const startReviewCommand: Command = {
  name: 'start-review',
  tell: 'Opens Review; with items (from rusty-words) moves them to Frontier and practises just them',
  args: {
    type: 'object',
    additionalProperties: false,
    properties: { items: { type: 'array', items: { type: 'object', required: ['kind', 'id'], additionalProperties: false, properties: { kind: { enum: ['word', 'idea'] }, id: { type: 'string', minLength: 1, maxLength: 80 } } } } },
  },
  kind: 'free',
  run: async (args): Promise<CommandResult> => {
    const items: ItemRef[] = (args as { items?: ItemRef[] }).items ?? [];
    if (items.length > RUSTY_MAX) throw new Error(`Review takes at most ${RUSTY_MAX} items to practise`);
    const moved = items.length > 0 ? await moveToFrontier(items) : [];
    setPractise(items);
    leaveTalk();
    navigate('review');
    return { said: moved.length > 0 ? `Moved ${moved.length} back to Frontier and opened Review` : 'Opened Review' };
  },
};

// The scope an add-word is run for: the chapter whose text gives a gloss when the lexicon cannot be read (src/data/answerWord.ts). Set only around one run, by addWord.
let addScope: Parameters<typeof addLemmaToLearn>[0] = { title: '', chapter: NO_CHAPTER, verse: null };

/** What add-word hands back beside its said line and undo: how the add ended, for the caller that says it (Added, already there, not in the lexicon). */
export type AddWordRan = CommandResult & AddedLemma;

/** Puts a word on his words-to-learn list with the lexicon's gloss; the undo puts the list back as it was (the word removed, or a dropped word dropped again). */
const addWordCommand: Command = {
  name: 'add-word',
  tell: 'Adds a word (its lemma) to his words to learn; undoable',
  args: { type: 'object', required: ['word'], additionalProperties: false, properties: { word: { type: 'string', minLength: 1, maxLength: 60 } } },
  kind: 'undoable',
  run: async (args): Promise<AddWordRan> => {
    const { word } = args as { word: string };
    const before = await listedWord(word);
    const added = await addLemmaToLearn(addScope, word);
    const said = { added: `Added ${added.headword} to his words`, already: `${added.headword} is on his words already`, unknown: `${added.headword} is not in the lexicon, so it was not added`, ignored: 'Nothing to add' }[added.result];
    // the list as it was: the row the add found (a dropped word), or none
    return { ...added, said, ...(added.result === 'added' ? { undo: () => restoreWord(before?.lemma ?? added.headword, before) } : {}) };
  },
};

/** The way in for a tap on Add to my words and for an answer's words_to_add: the add-word command, for the chapter of `scope`. */
export async function addWord(scope: Parameters<typeof addLemmaToLearn>[0], lemma: string): Promise<AddWordRan> {
  const kept = addScope;
  addScope = scope;
  try {
    const ran = await bibleTalkRegistry().run('add-word', { word: lemma });
    if (!ran.ok) throw new Error(ran.why);
    return ran as unknown as AddWordRan;
  } finally {
    addScope = kept;
  }
}

/** The Bible talk's registry: six facts (three core), the four commands, a place for every screen, for a chapter and for a book of his shelf. */
export const lampasRegistry = (): Registry =>
  defineRegistry({ facts: FACTS, commands: [setSettingCommand, tickTodayCommand, startReviewCommand, addWordCommand], places: [...ROUTES.map(placeForRoute), chapterPlace, workPlace] });

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
