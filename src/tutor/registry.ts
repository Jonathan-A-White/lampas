// src/tutor/registry.ts — what the tutor can see and where it can take him (mw-t3xu9a.4, docs/ask-tutor.md 'What the tutor can see'): Lampas's registry for voice-kit's tutor client
// (@voice-kit/talks createTutorClient). The Governor's words (2026-10-22): everything in the app is an API the tutor can ask for or work through. A FACT is something the app reads
// when asked (the core ones ride in every request); a PLACE is a screen it can open, through `navigate`, as a pushed history entry marked as a tutor go, so Back returns to where he was.
// The request is built by the client (`withTutorFacts`: the facts and the catalogue added to the app's own fields, which pass through untouched). A COMMAND (mw-t3xu9a.6) is something the app does: the app's own
// buttons go through the same named commands the tutor calls (set-setting, tick-today, start-review, add-word, and the place open-work), so a tap, a spoken yes and a tutor `do` run the one function.
import { createTutorClient, defineRegistry, type Command, type CommandResult, type Fact, type Place, type Registry, type TutorClient, type TutorRecord } from 'voice-kit/talks';
import { createDexieStore } from 'voice-kit/talks/dexie';
import { addLemmaToLearn, type AddedLemma } from '../data/answerWord';
import { BOOKS, titleOf, type Book } from '../data/books';
import { getDay, localDate, setTicked } from '../data/daily/dailyStore';
import { loadChapter, NO_CHAPTER } from '../data/chapter';
import { learnerGrammar } from '../data/grammar/learnerGrammar';
import { learnerSummary } from '../data/learnerSummary';
import { rustyNow } from '../data/learnerRusty';
import { todayEntries, todayNow } from '../data/learnerToday';
import { getWorks, listedWord, moveToFrontier, restoreWord, shelfOf, type ItemRef } from '../data/repositories';
import { RUSTY_MAX } from '../data/rusty';
import { memorizingEvidenceNow } from '../memorize/evidence';
import { memorizeVerse, moveVerse, startSession, unmemorizeVerse } from '../memorize/commands';
import type { MemorizeLang } from '../memorize/languages';
import { memorizingNow } from '../memorize/memorizing';
import { verseTextsOf } from '../memorize/verseText';
import { listMemorized } from '../data/repositories/memorize';
import { getVerseList, listVerseLists } from '../data/repositories/verseLists';
import { openedByTutor } from '../nav/readerRequest';
import { memorizeSessionOf, navigate, openVerseList, ROUTES, readerOf, routeOf, type Route } from '../nav/route';
import { CATALOGUE } from '../resources/catalogue';
import { armFallback } from '../resources/openApp';
import { worksForTutor, workChip } from '../resources/tutorLinks';
import { workOf } from '../resources/works';
import { setPractise } from '../review/practise';
import { higherInterest } from '../services/interestField';
import { dailyTicksSetting, variantsSetting, variantWitnessesSetting } from '../settings/definitions';
import { applyChanges, currentSettings, MAX_CHANGES, undoChange, type ChangeResult } from '../settings/registry';
import { getSetting } from '../settings/store';
import { leaveTalk } from '../talk/leave';
import type { TalkRequest, TalkScope } from '../services/talk';
import { heldText, holdText } from '../services/talkVerses';
import { openSheetTitles } from '../ui/sheetBack';
import { settingsSentTo } from './knows';
import { SCREEN_NAMES } from './screen';
import { screenContextNow } from './screenContext';
import { variantFactsOf } from './variantFacts';

/** The facts' names: a name is the one way the tutor has to call a fact or a place, so no screen goes by one of them. */
const FACT_NAMES: readonly string[] = ['where-he-is', 'today-drill', 'settings', 'progress', 'rusty-words', 'works', 'memorizing', 'verseText', 'memorizeEvidence', 'verse-lists', 'variants'];

/** The commands' names, kept from the screens' the same way: the command memorize is the tutor's to call, so the screen Memorize is the place 'memorize-screen'. */
const COMMAND_NAMES: readonly string[] = ['set-setting', 'tick-today', 'start-review', 'add-word', 'memorize', 'unmemorize', 'moveVerse', 'startSession'];

/** The name of the place that opens a screen: the route's own, the Reader's being 'reader', the Settings screen 'settings-screen' (its name is the fact's) and Memorize 'memorize-screen' (its name is the command's). */
export const placeNameOf = (route: Route): string => {
  const name = route === 'home' ? 'reader' : route;
  return FACT_NAMES.includes(name) || COMMAND_NAMES.includes(name) ? `${name}-screen` : name;
};

const READER = 'Reader';

/** What the tutor calls a screen. */
const screenNameOf = (route: Route): string => (route === 'home' ? READER : route === 'share' ? 'Share' : route === 'unlock' ? 'Licence' : SCREEN_NAMES[route]);

/** The key of the screen he is on now, for the tutor client's up-front list and record: the name the screen reported, else the one its address gives (the Reader for the plain address). */
export const screenKey = (): string => screenContextNow()?.name ?? screenNameOf(routeOf(window.location.hash));

/** A book of the Bible by the name he or the tutor says it ('Colossians', 'psalm'), already folded (trimmed, one space, lower case), or by its code ('col'). */
export const bookNamed = (name: string): Book | undefined => BOOKS.find((b) => b.code === name || b.name.toLowerCase() === name || (b.code === 'psa' && name === 'psalm'));

/** A chapter of any book the Reader opens, from args as the tutor wrote them: the book by name ('Colossians', 'colossians', 'Psalm') or by code ('col'), the chapter in the book's range. */
export function chapterOf(args: unknown): { book: string; chapter: number; title: string } | undefined {
  const asked = typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {};
  const name = typeof asked.book === 'string' ? asked.book.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
  const book = bookNamed(name);
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

/** The words of the verses he memorizes, the one he has a session open on first. */
const verseTextNow = async (): Promise<unknown> => verseTextsOf([...new Set((await listMemorized()).map((row) => row.ref))].sort(), memorizeSessionOf(window.location.hash)?.ref);

/** His verse lists as the Verse lists screen shows them (newest first): each one's id, name and how many references it holds; the references stay out, so the request stays small. */
const verseListsNow = async (): Promise<Array<{ id: number; name: string; count: number }>> => (await listVerseLists()).map((list) => ({ id: list.id, name: list.name, count: list.refs.length }));

/** The variant units of the verse in hand in the Reader, as the Bible talk's `variants` field has them (src/tutor/variantFacts.ts): refused while Variants is Off, and where he is not in a chapter. */
async function variantsNow(): Promise<unknown> {
  const [variants, witnesses] = await Promise.all([getSetting(variantsSetting), getSetting(variantWitnessesSetting)]);
  if (variants === 'off') throw new Error('Variants is Off, so the app marks no variant readings');
  const { book, chapter, verse } = readerOf(window.location.hash);
  if (!book || !chapter) throw new Error('he is not reading a chapter');
  const facts = variantFactsOf(await loadChapter(book, chapter), verse === undefined ? [] : [verse], { variants, witnesses });
  return facts ?? { chapter_units: 0, units: [] };
}

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
    read: async () => worksForTutor(await shelfOf().catch(() => []), undefined, '', higherInterest(await currentSettings())),
  },
  {
    name: 'memorizing',
    tell: 'his memorized verses: summary, lists (ids), languages, step, due, last score, misses',
    read: memorizingNow,
  },
  {
    name: 'verseText',
    tell: 'the words of each verse he memorizes, per language (en, el, weave)',
    read: verseTextNow,
  },
  {
    name: 'memorizeEvidence',
    tell: 'every recall of his verses and a summary: how memorizing is going',
    read: memorizingEvidenceNow,
  },
  {
    name: 'verse-lists',
    tell: 'his verse lists, newest first: id (for the place lists), name, count',
    read: verseListsNow,
  },
  {
    name: 'variants',
    tell: 'where manuscripts differ in the verse he reads: each reading, who reads it; only while Variants is on',
    read: variantsNow,
  },
];

const LANG = { enum: ['en', 'el', 'he', 'weave'] } as const;
const REF = { type: 'string' } as const;

/** The verse commands of src/memorize/commands.ts: the same functions the buttons call (memorize and unmemorize are the Memorize control's and the Stop memorizing buttons'). */
const memorizeCommands: readonly Command[] = [
  {
    name: 'memorize',
    tell: 'Memorizes a verse (ref Rom.8.28; langs en, el, he, weave, en by default); undoable',
    args: { type: 'object', required: ['ref'], additionalProperties: false, properties: { ref: REF, langs: { type: 'array', items: LANG } } },
    kind: 'undoable',
    run: memorizeVerse,
  },
  {
    name: 'unmemorize',
    tell: 'Stops memorizing a verse, one lang or all; undoable',
    args: { type: 'object', required: ['ref'], additionalProperties: false, properties: { ref: REF, lang: LANG } },
    kind: 'undoable',
    run: unmemorizeVerse,
  },
  {
    name: 'moveVerse',
    tell: 'Moves a ref between verse lists (ids from memorizing); stays memorized; undoable',
    args: { type: 'object', required: ['ref', 'from', 'to'], additionalProperties: false, properties: { ref: REF, from: { type: 'integer', minimum: 1 }, to: { type: 'integer', minimum: 1 } } },
    kind: 'undoable',
    run: moveVerse,
  },
  {
    name: 'startSession',
    tell: 'Opens a memorize session of a verse, in one lang',
    args: { type: 'object', required: ['ref', 'lang'], additionalProperties: false, properties: { ref: REF, lang: LANG } },
    kind: 'free',
    run: startSession,
  },
];

const placeForRoute = (route: Route): Place => ({
  name: placeNameOf(route),
  tell: route === 'home' ? 'Opens the Reader' : `Opens ${screenNameOf(route)}`,
  open: async () => navigate(route, { tutor: true }),
});

/** Memorize, or with a verse and language a session of it: the same startSession the tutor's `do` calls, so Back returns to the Talk sheet the go left. */
const memorizePlace: Place = {
  name: placeNameOf('memorize'),
  tell: 'Opens Memorize; with ref and lang, a session of that verse',
  args: { type: 'object', additionalProperties: false, properties: { ref: REF, lang: LANG } },
  open: async (args) => {
    const { ref, lang } = args as { ref?: string; lang?: MemorizeLang };
    if (ref === undefined && lang === undefined) return navigate('memorize', { tutor: true });
    if (ref === undefined || lang === undefined) throw new Error('A session needs both ref and lang');
    await startSession({ ref, lang });
  },
};

/** The Verse lists screen, or with an id that list, as the Verse lists screen opens one (`#/lists/<id>`); an id that is no list's is refused. */
const listsPlace: Place = {
  name: placeNameOf('lists'),
  tell: 'Opens Verse lists; with id (from verse-lists), one list',
  args: { type: 'object', additionalProperties: false, properties: { id: { type: 'integer', minimum: 1 } } },
  open: async (args) => {
    const { id } = args as { id?: number };
    if (id === undefined) return navigate('lists', { tutor: true });
    if (!(await getVerseList(id))) throw new Error('he has no verse list with that id');
    openVerseList(id, { tutor: true });
  },
};

const chapterPlace: Place = {
  name: CHAPTER,
  tell: 'Opens a chapter of the Bible in the Reader',
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
    const found = workChip(id, undefined, ticked, undefined, higherInterest(settings), shelf.map((row) => row.id));
    if (!found) throw new Error('that book is not on his shelf, or Logos has nowhere to open it');
    // The app's own address; when the phone has no app for it nothing happens, so the https fallback is armed as a tap on the link arms it
    workDoor.open(found.chip.url);
    armFallback(found.chip.fallback);
  },
};

/** What set-setting hands back beside its said line and undo: the changes it applied (with the old values) and the sentences for what it left out, for the caller that keeps them (a talk turn). */
export type SettingRan = CommandResult & ChangeResult;

/** One change, checked and written by the settings registry; `skipUnchanged` writes nothing, and says nothing, for a setting already set that way. The undo puts the old value back. */
const setSettingCommand: Command = {
  name: 'set-setting',
  tell: 'Changes a setting; the app can undo it',
  args: {
    type: 'object',
    required: ['name', 'value'],
    additionalProperties: false,
    properties: { name: { type: 'string' }, value: {}, skipUnchanged: { type: 'boolean' } },
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
let addScope: TalkScope = { title: '', chapter: NO_CHAPTER, verse: null };

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
export async function addWord(scope: TalkScope, lemma: string): Promise<AddWordRan> {
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

/** The Bible talk's registry: eleven facts (three core), the eight commands, a place for every screen, for a chapter and for a book of his shelf. */
export const lampasRegistry = (): Registry =>
  defineRegistry({ facts: FACTS, commands: [setSettingCommand, tickTodayCommand, startReviewCommand, addWordCommand, ...memorizeCommands], places: [...ROUTES.map((route) => (route === 'memorize' ? memorizePlace : route === 'lists' ? listsPlace : placeForRoute(route))), chapterPlace, workPlace] });

/** The verse ask's smaller set: the core facts only (its settings are the ones its grind is told), and no place: its answer does not go anywhere. */
export const askRegistry = (): Registry =>
  defineRegistry({
    facts: [whereHeIsFact, todayDrillFact, { ...settingsFact, tell: 'what the settings this tutor is told hold now', read: () => settingsSentTo('verse-ask') }],
  });

/** The tutor's record (the ask-backs and misses of each screen) and the up-front list of each screen are kept on the phone, in a database of their own (the kit's Dexie store; its talks table is not used: the Bible talks are Lampas's own,
 * src/data/repositories/talks.ts), so that the counts last from one launch to the next and the nightly run (src/tutor/weightsRun.ts) has a week of them to read. The clients of both grinds and the nightly one write to it. */
// the page's own IndexedDB handed over, since the kit's Dexie (its own copy) looks for one when it loads, which a test's fake is not yet
const store = createDexieStore({ name: 'lampas-tutor', indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange });

/** The up-front budget of the nightly request: the grist's payload is capped at 20 KiB sealed (src/services/requestBudget.ts), and the report is the field the client cannot cut. */
const NIGHTLY_BYTES = 11_000;

const clientOf = (registry: Registry, screen: () => string = screenKey, budgetBytes?: number): TutorClient<never> =>
  createTutorClient<never>({
    store,
    registry,
    screen,
    ...(budgetBytes ? { budgetBytes } : {}),
    // Lampas sends its own requests (src/services/talk.ts askTalk, src/services/tutor.ts askTutor, src/tutor/weightsRun.ts): the client builds them and carries out the answer's go
    send: () => Promise.reject(new Error('the client sends nothing: the app does')),
  });

let talkClient: TutorClient<never> | undefined;
let nightClient: TutorClient<never> | undefined;
let askClient: TutorClient<never> | undefined;
let talkRegistry: Registry | undefined;

/** The client of the Bible talk. */
export const bibleTalkClient = (): TutorClient<never> => (talkClient ??= clientOf((talkRegistry ??= lampasRegistry())));

/** The Bible talk's registry, made once. */
export const bibleTalkRegistry = (): Registry => (talkRegistry ??= lampasRegistry());

/** The screen the nightly run's requests are built on: no screen of his, so the lists of his screens are not read for it and nothing it reads is counted for one. */
export const NIGHTLY_SCREEN = 'nightly';

/** The client of the nightly tutor-weights run: the Bible talk's registry and record, on the screen 'nightly' (mw-t3xu9a.8). */
export const nightlyClient = (): TutorClient<never> => (nightClient ??= clientOf(bibleTalkRegistry(), () => NIGHTLY_SCREEN, NIGHTLY_BYTES));

/** The client of the verse ask. */
export const askClientOf = (): TutorClient<never> => (askClient ??= clientOf(askRegistry()));

/** The request for turn `turn` of a talk: `request` (the app's own fields, passed through untouched) with the facts read up front and the catalogue. */
export async function withTutorFacts(request: TalkRequest, turn: number): Promise<TalkRequest> {
  const built = await bibleTalkClient().buildRequest(turn, request);
  // the client returns a new object: the verses the request was built from go with it, or the fit would clip the passage by characters instead of dropping whole verses (mw-5r3p30.757)
  const hold = heldText(request);
  return hold ? holdText(built, hold) : built;
}

/** The same for the verse ask's request, with its smaller set. */
export async function askWithFacts<F extends object>(request: F, turn: number): Promise<F> {
  return askClientOf().buildRequest(turn, request);
}

/** What a fact is called in the line 'Looking at your ...' while the tutor's follow-up is out; a fact with no entry here goes by its name with spaces. */
const LOOKING_AT: Readonly<Record<string, string>> = {
  'where-he-is': 'place in the app',
  'today-drill': "today's drill",
  settings: 'settings',
  progress: 'progress',
  'rusty-words': 'rusty words',
  works: 'Logos books',
  memorizing: 'memorized verses',
  verseText: 'verses you memorize',
  memorizeEvidence: 'memorizing record',
  'verse-lists': 'verse lists',
  variants: 'variant readings',
};

/** The line the sheet shows (and says) while the tutor looks at `names`: 'Looking at your Logos books', 'Looking at your progress and settings'. */
export function lookingLine(names: readonly string[]): string {
  const parts = [...new Set(names)].map((name) => LOOKING_AT[name] ?? name.replace(/-/g, ' '));
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `Looking at your ${list}`;
}

/** A fact name an answer asked for, as written: text of a sensible length, once each, at most the schema's eight. */
export const askedNames = (asks: unknown): string[] => (Array.isArray(asks) ? [...new Set(asks.filter((n): n is string => typeof n === 'string' && n.length > 0))] : []);

/**
 * The ask-back of turn `turn` (docs/ask-tutor.md 'What you see when the tutor does something'): reads each fact `names` asks for, from the registry, and returns them by name for the follow-up's `asked`; a name that is
 * no fact, or a read that fails, is left out and recorded as a miss, as every ask-back is recorded for the screen he is on (the client's store, for the weights a later story tunes). Never throws.
 */
export async function askBack(names: readonly string[], turn: number): Promise<Record<string, unknown>> {
  const registry = bibleTalkRegistry();
  const screen = screenKey();
  const records: TutorRecord[] = [];
  const asked: Record<string, unknown> = {};
  for (const name of names) {
    const read = await registry.read(name);
    if (read.ok) {
      asked[name] = read.value;
      records.push({ at: Date.now(), screen, kind: 'ask', name, turn });
    } else records.push({ at: Date.now(), screen, kind: 'miss', name, turn, why: read.why });
  }
  await store.note(records).catch(() => undefined);
  return asked;
}

/** A turn has two rounds: what the follow-up's answer asks for again is not read, and is recorded as a miss, as the client's own `ask` does. */
export async function noteLateAsks(names: readonly string[], turn: number): Promise<void> {
  const screen = screenKey();
  await store.note(names.map((name) => ({ at: Date.now(), screen, kind: 'miss' as const, name, turn, why: 'asked for after the follow-up: a turn has 2 rounds' }))).catch(() => undefined);
}
