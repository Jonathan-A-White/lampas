// src/data/grammar/fetchedItems.ts — more drill items from the mill (mw-hqd5bz.36, docs/grammar.md 'More items from the mill', PROVISIONAL). After a Review round, the ideas he
// missed most are sent to the drill-items grind (grinds/drill-items.json) with verses of his passage that use them; what comes back is short questions of the shapes the app already draws
// (tap the form, what does this say), kept on the phone and served first in the next round on that idea. Pure: the caller hands in the passage and the answer; nothing here touches the store,
// the network or a screen. The answer is not believed: every item is checked against the verse it names, and an item that does not match is dropped.
import { wordParse, type Chapter, type GreekWord, type Verse } from '../chapter';
import { decodeParse } from '../parseCode';
import { OPTION_COUNT } from '../choices';
import { LADDER, ideasOfWord, type GrammarIdea, type Tier } from './ladder';
import { ideaOfAny, ladderLangOf } from './ladders';
import { HEBREW_LADDER } from './hebrew/ladder';
import { hebrewFormOf, hebrewIdeasOfWord } from './hebrew/wordQuestions';
import type { GradedVerse } from './gradedVerses';
import { hebrewWordsOf, type HebrewWordEntry } from '../../services/hebrewWords';
import { MAX_REQUEST_BYTES } from '../../services/requestBudget';
import { SAYS, SPOT, type GrammarQuestion } from './questions';

/** The kind the mill runs the grind under (grinds/drill-items.json). */
export const DRILL_ITEMS_KIND = 'drill-items';

/** The ideas he is sent more items on at once, and the items asked for each (PROVISIONAL). */
export const MAX_IDEAS = 3;
export const ITEMS_PER_IDEA = 2;
/** The verses sent for each idea, and in all: the grist's record is 10 KiB. */
export const VERSES_PER_IDEA = 2;
export const MAX_VERSES = 6;
/** The longest verse (Greek or English) that is sent; a longer one is left out. */
export const VERSE_MAX_CHARS = 400;
/** The most the Hebrew words of one verse may weigh in the request (hebrew_words, JSON in UTF-8): a request holds up to MAX_VERSES of them within MAX_REQUEST_BYTES. */
const HEBREW_WORDS_PER_VERSE_BYTES = 1100;
/** The most uses of an idea named in one verse. */
const USES_PER_VERSE = 6;
/** The most items kept for an idea: the oldest go first. */
export const MAX_KEPT = 6;
/** The most questions the phone remembers having asked him for an idea (the newest), so the mill is not asked for one he has seen again (mw-indx1x6.1). */
export const MAX_SEEN = 30;

/** A question he has been asked: its prompt and the verse it is about. */
export interface SeenQuestion {
  prompt: string;
  ref: string;
}

/** The kinds of question the mill may write (grinds/drill-items.answer.schema.json): the shapes src/GrammarCard.tsx draws from a verse. */
export const FETCHED_KINDS = ['tap-form', 'meaning'] as const;
export type FetchedKind = (typeof FETCHED_KINDS)[number];

/** The tiers whose ideas are about words of a verse; the letters, sounds and marks are asked from the app's own items. */
const WORD_TIERS: readonly Tier[] = ['nouns', 'pronouns', 'prepositions', 'verbs', 'joiners'];

/** Whether more items can be fetched for the idea: a word idea (a letter, a pair and a mark is drilled from items the app makes itself). */
export function isFetchable(idea: GrammarIdea): boolean {
  return WORD_TIERS.includes(idea.tier) && !idea.parent && !idea.glyphs;
}

/** The ideas to fetch for, from the ideas missed in a round (one id per miss): the most missed first, then the lower rung; up to MAX_IDEAS; an id the ladder lacks or whose idea is not fetchable is left out. */
export function weakestMissed(missed: readonly string[], limit = MAX_IDEAS): GrammarIdea[] {
  const counts = new Map<string, number>();
  for (const id of missed) counts.set(id, (counts.get(id) ?? 0) + 1);
  const known = new Map([...LADDER, ...HEBREW_LADDER].map((idea) => [idea.id, idea]));
  return [...counts]
    .flatMap(([id, misses]) => {
      const idea = known.get(id);
      return idea && isFetchable(idea) ? [{ idea, misses }] : [];
    })
    .sort((a, b) => b.misses - a.misses || a.idea.rung - b.idea.rung)
    .slice(0, limit)
    .map((m) => m.idea);
}

/** What the grind is told of one idea. */
export interface AskedIdea {
  id: string;
  title: string;
  what: string;
  misses: number;
}

/** A word of a verse that uses one of the ideas. */
export interface VerseUse {
  idea: string;
  form: string;
  parse: string;
}

/** A verse of the request: its `greek` for a Greek idea, its `hebrew` (pointed, no cantillation) and the words of it, `hebrew_words`, for a Hebrew one (mw-gdcyf98.21). */
export interface AskedVerse {
  ref: string;
  greek?: string;
  hebrew?: string;
  hebrew_words?: HebrewWordEntry[];
  english: string;
  uses: VerseUse[];
}

/** Drill Items Request 1 (grinds/drill-items.input.schema.json). */
export interface DrillItemsRequest {
  /** 'he' when the ideas and verses are Hebrew (the Hebrew ladder's, `hebrew` verses); absent for Greek */
  language?: 'he';
  ideas: AskedIdea[];
  verses: AskedVerse[];
  per_idea: number;
  /** the questions on these ideas he has been asked, the oldest first: the mill writes none of them (as many as the request has room for) */
  seen?: SeenQuestion[];
}

/** The ids of the ideas a word needs, patterns included; none for a code the ladder cannot read. */
function ideasOfForm(word: GreekWord): string[] {
  try {
    return ideasOfWord(word);
  } catch {
    return [];
  }
}

const greekOf = (verse: Verse): string => verse.g.map((w) => w.t).join(' ');
const englishOf = (verse: Verse): string => verse.e.map((c) => c.t.trim()).join(' ').replace(/\s+/g, ' ').trim();
const refOf = (chapter: Chapter, verse: Verse): string => `${chapter.book} ${chapter.chapter}:${verse.n}`;
const keyOf = (chapter: Chapter, verse: Verse): string => `${chapter.code}.${chapter.chapter}.${verse.n}`;

interface Candidate {
  chapter: Chapter;
  verse: Verse;
  /** the words that use each idea, by idea id */
  uses: Map<string, GreekWord[]>;
}

/** The verses of the passage that use any of these ideas and are short enough to send, in the passage's order. */
function candidatesFor(ids: ReadonlySet<string>, passage: readonly Chapter[]): Candidate[] {
  return passage.flatMap((chapter) =>
    chapter.verses.flatMap((verse): Candidate[] => {
      if (greekOf(verse).length > VERSE_MAX_CHARS || englishOf(verse).length > VERSE_MAX_CHARS || englishOf(verse) === '') return [];
      const uses = new Map<string, GreekWord[]>();
      for (const word of verse.g) {
        for (const id of ideasOfForm(word)) if (ids.has(id)) uses.set(id, [...(uses.get(id) ?? []), word]);
      }
      return uses.size > 0 ? [{ chapter, verse, uses }] : [];
    }),
  );
}

const nfc = (s: string): string => s.normalize('NFC');
const lower = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** What makes two questions the same one: the prompt and the verse, case and spacing aside. */
export const seenKey = (q: { prompt: string; ref: string }): string => `${lower(nfc(q.prompt))}|${lower(nfc(q.ref))}`;

/** Whether a value read back from the store is a seen question. */
export function isSeenQuestion(value: unknown): value is SeenQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SeenQuestion>;
  return isText(v.prompt, 120) && isText(v.ref, 40);
}

/** The seen questions of the asked ideas as one list, the oldest first: the oldest of each idea before the newer of any (so trimming from the front takes evenly from the ideas). */
function seenList(asked: readonly GrammarIdea[], seen: ReadonlyMap<string, readonly SeenQuestion[]>): SeenQuestion[] {
  const entries = asked.flatMap((idea, order) => {
    const list = seen.get(idea.id) ?? [];
    return list.map((q, i) => ({ q, age: list.length - 1 - i, order }));
  });
  entries.sort((a, b) => b.age - a.age || a.order - b.order);
  const keys = new Set<string>();
  return entries.flatMap(({ q }) => (keys.has(seenKey(q)) ? [] : (keys.add(seenKey(q)), [{ prompt: q.prompt, ref: q.ref }])));
}

/** The request's size in bytes, as the grist's record counts it. */
const bytes = (r: DrillItemsRequest): number => new TextEncoder().encode(JSON.stringify(r)).length;

/** The request with the last verses left off until it fits MAX_REQUEST_BYTES, then the questions he has seen added as far as there is room (the oldest dropped first); null when no verse is left. */
function fitted(request: DrillItemsRequest, asked: readonly GrammarIdea[], seen: ReadonlyMap<string, readonly SeenQuestion[]>): DrillItemsRequest | null {
  // the grist's record is small (MAX_REQUEST_BYTES): the last verses go first
  while (request.verses.length > 0 && bytes(request) > MAX_REQUEST_BYTES) request.verses.pop();
  if (request.verses.length === 0) return null;
  // the verses come first: what room is left carries the questions he has seen, the oldest dropped first
  const carried = seenList(asked, seen);
  while (carried.length > 0 && bytes({ ...request, seen: carried }) > MAX_REQUEST_BYTES) carried.shift();
  return carried.length > 0 ? { ...request, seen: carried } : request;
}

/** The verses to send, VERSES_PER_IDEA for each idea in turn and MAX_VERSES in all, the easiest for him first (`graded` is gradedVerses' order, its at-level verses before the rest; without it the passage's order). */
function chosenOf<C extends { chapter: Chapter; verse: Verse; uses: Map<string, unknown> }>(asked: readonly GrammarIdea[], candidates: readonly C[], graded?: readonly GradedVerse[]): Set<C> {
  const rank = new Map<string, number>();
  graded?.forEach((g, i) => rank.set(g.ref, g.atLevel ? i : graded.length + i));
  const easiest = [...candidates].sort((a, b) => (rank.get(keyOf(a.chapter, a.verse)) ?? Infinity) - (rank.get(keyOf(b.chapter, b.verse)) ?? Infinity));
  const chosen = new Set<C>();
  for (const idea of asked) {
    for (const c of easiest.filter((c) => c.uses.has(idea.id) && !chosen.has(c)).slice(0, VERSES_PER_IDEA)) if (chosen.size < MAX_VERSES) chosen.add(c);
  }
  return chosen;
}

const askedIdeas = (asked: readonly GrammarIdea[], misses: ReadonlyMap<string, number>): AskedIdea[] =>
  asked.map((idea) => ({ id: idea.id, title: idea.title, what: idea.text, misses: Math.min(20, Math.max(1, misses.get(idea.id) ?? 1)) }));

/**
 * The request for these ideas (one to MAX_IDEAS, the first the most missed): for each idea, up to VERSES_PER_IDEA verses of the passage that use it, the easiest for him first
 * (`graded` is gradedVerses' order, its at-level verses before the rest; without it the passage's order), MAX_VERSES in all. Null when the passage has no verse that uses any of them.
 * `seen` is the questions he has been asked, by idea (oldest first): the request carries them as `seen`, the oldest left out until the request fits MAX_REQUEST_BYTES with its verses.
 * A request is of one language, the first idea's: Hebrew ideas (the Hebrew ladder's, ids that start 'he-') make a request of Hebrew verses (hebrewRequest); the ideas of the other language are left out.
 */
export function buildDrillItemsRequest(
  ideas: readonly GrammarIdea[],
  misses: ReadonlyMap<string, number>,
  passage: readonly Chapter[],
  graded?: readonly GradedVerse[],
  seen: ReadonlyMap<string, readonly SeenQuestion[]> = new Map(),
): DrillItemsRequest | null {
  const first = ideas[0];
  if (!first) return null;
  const language = ladderLangOf(first.id);
  const asked = ideas.filter((idea) => ladderLangOf(idea.id) === language).slice(0, MAX_IDEAS);
  if (language === 'hbo') return hebrewRequest(asked, misses, passage, graded, seen);
  const candidates = candidatesFor(new Set(asked.map((i) => i.id)), passage);
  const chosen = chosenOf(asked, candidates, graded);
  if (chosen.size === 0) return null;
  const wanted = new Set(asked.map((i) => i.id));
  const verses = candidates.filter((c) => chosen.has(c)).map(
    (c): AskedVerse => ({
      ref: refOf(c.chapter, c.verse),
      greek: greekOf(c.verse),
      english: englishOf(c.verse),
      uses: [...c.uses]
        .filter(([id]) => wanted.has(id))
        .flatMap(([id, words]) => words.map((w): VerseUse => ({ idea: id, form: w.t, parse: c.chapter.parse[w.p] ?? decodeParse(w.p) })))
        .slice(0, USES_PER_VERSE),
    }),
  );
  return fitted({ ideas: askedIdeas(asked, misses), verses, per_idea: ITEMS_PER_IDEA }, asked, seen);
}

const hebrewOf = (verse: Verse): string => verse.g.map(hebrewFormOf).join(' ');

interface HebrewCandidate {
  chapter: Chapter;
  verse: Verse;
  /** the words that use each idea, by idea id */
  uses: Map<string, GreekWord[]>;
}

/** The verses of the passage's Hebrew chapters that use any of these Hebrew ideas (by the terms of their words' parsing) and are short enough to send, in the passage's order. */
function hebrewCandidatesFor(ids: ReadonlySet<string>, passage: readonly Chapter[]): HebrewCandidate[] {
  return passage.flatMap((chapter) =>
    chapter.lang !== 'hbo'
      ? []
      : chapter.verses.flatMap((verse): HebrewCandidate[] => {
          if (hebrewOf(verse).length > VERSE_MAX_CHARS || englishOf(verse).length > VERSE_MAX_CHARS || englishOf(verse) === '') return [];
          const uses = new Map<string, GreekWord[]>();
          for (const word of verse.g) for (const id of hebrewIdeasOfWord(chapter, word)) if (ids.has(id)) uses.set(id, [...(uses.get(id) ?? []), word]);
          return uses.size > 0 ? [{ chapter, verse, uses }] : [];
        }),
  );
}

/**
 * The request for Hebrew ideas (mw-gdcyf98.21): `language` 'he', and for each verse its `hebrew` (the words as the Reader shows them: pointed, no cantillation, a word with a maqaf or an inseparable
 * prefix one word), `hebrew_words` (each with its lemma, transliteration, gloss and parsing in plain words) and the words that use the ideas, from the Hebrew chapters of the passage.
 */
function hebrewRequest(
  asked: readonly GrammarIdea[],
  misses: ReadonlyMap<string, number>,
  passage: readonly Chapter[],
  graded: readonly GradedVerse[] | undefined,
  seen: ReadonlyMap<string, readonly SeenQuestion[]>,
): DrillItemsRequest | null {
  const candidates = hebrewCandidatesFor(new Set(asked.map((i) => i.id)), passage);
  const chosen = chosenOf(asked, candidates, graded);
  if (chosen.size === 0) return null;
  const wanted = new Set(asked.map((i) => i.id));
  const verses = candidates.filter((c) => chosen.has(c)).map(
    (c): AskedVerse => ({
      ref: refOf(c.chapter, c.verse),
      hebrew: hebrewOf(c.verse),
      hebrew_words: hebrewWordsOf(c.chapter, [c.verse], '', HEBREW_WORDS_PER_VERSE_BYTES),
      english: englishOf(c.verse),
      uses: [...c.uses]
        .filter(([id]) => wanted.has(id))
        .flatMap(([id, words]) => words.map((w): VerseUse => ({ idea: id, form: hebrewFormOf(w), parse: wordParse(c.chapter, w) || w.p })))
        .slice(0, USES_PER_VERSE),
    }),
  );
  return fitted({ language: 'he', ideas: askedIdeas(asked, misses), verses, per_idea: ITEMS_PER_IDEA }, asked, seen);
}

/** One item as the grind answers it (grinds/drill-items.answer.schema.json). */
export interface AnsweredItem {
  idea: string;
  kind: FetchedKind;
  ref: string;
  prompt: string;
  form?: string;
  options: string[];
  right: string;
}

export interface DrillItemsAnswer {
  items: AnsweredItem[];
}

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length >= 1 && value.length <= max;

function isAnsweredItem(value: unknown): value is AnsweredItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  return (
    keys.every((k) => ['idea', 'kind', 'ref', 'prompt', 'form', 'options', 'right'].includes(k)) &&
    isText(v.idea, 60) &&
    typeof v.kind === 'string' &&
    (FETCHED_KINDS as readonly string[]).includes(v.kind) &&
    isText(v.ref, 40) &&
    isText(v.prompt, 120) &&
    (v.form === undefined || isText(v.form, 120)) &&
    Array.isArray(v.options) &&
    v.options.length === OPTION_COUNT &&
    v.options.every((o) => isText(o, 80)) &&
    isText(v.right, 80)
  );
}

/** The app's guard on the whole answer: an object with a list of items (the items are checked one by one, checkedItems). A bad item does not make the answer unreadable. */
export function isDrillItemsAnswer(value: unknown): value is DrillItemsAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { items } = value as { items?: unknown };
  return Array.isArray(items) && items.length <= 12;
}

/** A verse as the request named it: its words and its English, for checking an item against. */
interface SentVerse {
  chapter: Chapter;
  verse: Verse;
  english: string;
}

function sentVerses(request: DrillItemsRequest, passage: readonly Chapter[]): Map<string, SentVerse> {
  const byRef = new Map<string, SentVerse>();
  for (const chapter of passage) for (const verse of chapter.verses) byRef.set(refOf(chapter, verse), { chapter, verse, english: englishOf(verse) });
  return new Map(request.verses.flatMap((v): [string, SentVerse][] => (byRef.has(v.ref) ? [[v.ref, byRef.get(v.ref) as SentVerse]] : [])));
}

/** Whether a word of the verse is what the idea is about. */
const usesIdea = (word: GreekWord, id: string): boolean => ideasOfForm(word).includes(id);

/**
 * One item of a Hebrew request as a question (lang 'hbo'), or null when it does not hold: the words are the verse's own as the Reader writes them (pointed, no cantillation), the right word of a
 * tap-form item shows the idea and no other of the four does, and the right English of a meaning item is the translators' own.
 */
function hebrewQuestionFrom(item: AnsweredItem, sent: SentVerse, ideaId: string): GrammarQuestion | null {
  const { verse, chapter } = sent;
  const wordOf = (text: string): GreekWord | undefined => verse.g.find((w) => hebrewFormOf(w) === nfc(text));
  const uses = (word: GreekWord): boolean => hebrewIdeasOfWord(chapter, word).includes(ideaId);
  if (new Set(item.options.map(lower)).size !== item.options.length || !item.options.includes(item.right)) return null;
  if (item.kind === 'tap-form') {
    if (item.form !== undefined) return null;
    const words = item.options.map(wordOf);
    const right = wordOf(item.right);
    if (!right || words.some((w) => w === undefined) || !uses(right)) return null;
    // another option that shows the idea leaves the prompt with two right answers
    if (words.some((w) => w !== right && uses(w as GreekWord))) return null;
    return { kind: 'tap-form', ideaId, prompt: item.prompt, options: item.options.map(nfc), right: nfc(item.right), ref: sentRef(sent), code: right.p, facet: SPOT, lang: 'hbo' };
  }
  if (item.form === undefined) return null;
  const marked = item.form.split(/\s+/).filter(Boolean);
  const words = marked.map(wordOf);
  if (marked.length === 0 || words.some((w) => w === undefined) || !words.some((w) => uses(w as GreekWord))) return null;
  const places = words.map((w) => verse.g.indexOf(w as GreekWord));
  if (places.some((p, i) => i > 0 && p <= places[i - 1])) return null;
  if (!sent.english.includes(item.right) && !lower(sent.english).includes(lower(item.right))) return null;
  const form = words.map((w) => hebrewFormOf(w as GreekWord)).join(' ');
  const code = (words.find((w) => uses(w as GreekWord)) as GreekWord).p;
  return { kind: 'meaning', ideaId, prompt: item.prompt, options: item.options, right: item.right, ref: sentRef(sent), form, marked: words.map((w) => hebrewFormOf(w as GreekWord)), say: form, code, facet: SAYS, lang: 'hbo' };
}

/** One item as a question, or null when it does not hold: see checkedItems. */
function questionFrom(item: AnsweredItem, sent: SentVerse, ideaId: string): GrammarQuestion | null {
  if (ladderLangOf(ideaId) === 'hbo') return hebrewQuestionFrom(item, sent, ideaId);
  const { verse } = sent;
  const wordOf = (text: string): GreekWord | undefined => verse.g.find((w) => nfc(w.t) === nfc(text));
  if (new Set(item.options.map(lower)).size !== item.options.length || !item.options.includes(item.right)) return null;
  if (item.kind === 'tap-form') {
    if (item.form !== undefined) return null;
    const words = item.options.map(wordOf);
    const right = wordOf(item.right);
    if (!right || words.some((w) => w === undefined) || !usesIdea(right, ideaId)) return null;
    // two options of the same parsing leave the prompt with two right answers
    if (words.some((w) => w !== right && w!.p === right.p)) return null;
    return { kind: 'tap-form', ideaId, prompt: item.prompt, options: item.options.map((o) => (wordOf(o) as GreekWord).t), right: right.t, ref: sentRef(sent), code: right.p, facet: SPOT };
  }
  if (item.form === undefined) return null;
  const marked = item.form.split(/\s+/).filter(Boolean);
  const words = marked.map(wordOf);
  if (marked.length === 0 || words.some((w) => w === undefined) || !words.some((w) => usesIdea(w as GreekWord, ideaId))) return null;
  // the form is the verse's own words in the verse's order, and the right English is the translators' own
  const places = words.map((w) => verse.g.indexOf(w as GreekWord));
  if (places.some((p, i) => i > 0 && p <= places[i - 1])) return null;
  if (!sent.english.includes(item.right) && !lower(sent.english).includes(lower(item.right))) return null;
  const code = (words.find((w) => usesIdea(w as GreekWord, ideaId)) as GreekWord).p;
  const form = marked.map((m, i) => (words[i] as GreekWord).t || m).join(' ');
  return { kind: 'meaning', ideaId, prompt: item.prompt, options: item.options, right: item.right, ref: sentRef(sent), form, marked: marked.map((_, i) => (words[i] as GreekWord).t), say: form, code, facet: SAYS };
}

const sentRef = (sent: SentVerse): string => refOf(sent.chapter, sent.verse);

/**
 * The questions the answer's items make, checked against the verses the request sent: an item that names an idea the request did not ask about or a verse it did not send, that is
 * not of a shape the app draws, whose choices are not four different ones with the right one among them, whose words are not the verse's or whose right word is not what the idea is
 * about, is dropped. At most ITEMS_PER_IDEA for each idea. So is an item whose prompt and verse are those of a question he has been asked (the request's `seen`, and `seen` here: the
 * phone's whole list, which the request may have had no room for) or of another item of the same answer.
 */
export function checkedItems(answer: DrillItemsAnswer, request: DrillItemsRequest, passage: readonly Chapter[], seen: readonly SeenQuestion[] = []): GrammarQuestion[] {
  const sent = sentVerses(request, passage);
  const asked = new Set(request.ideas.map((i) => i.id));
  const made = new Map<string, number>();
  const known = new Set([...(request.seen ?? []), ...seen].map(seenKey));
  const kept: GrammarQuestion[] = [];
  for (const item of answer.items) {
    if (!isAnsweredItem(item) || !asked.has(item.idea) || (made.get(item.idea) ?? 0) >= request.per_idea) continue;
    const verse = sent.get(item.ref);
    const question = verse ? questionFrom(item, verse, item.idea) : null;
    if (!question || known.has(seenKey({ prompt: question.prompt, ref: item.ref }))) continue;
    known.add(seenKey({ prompt: question.prompt, ref: item.ref }));
    made.set(item.idea, (made.get(item.idea) ?? 0) + 1);
    kept.push(question);
  }
  return kept;
}

/** Whether a value read back from the store is a question the app can draw: a kept item is checked again on its way out. */
export function isKeptQuestion(value: unknown): value is GrammarQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Partial<GrammarQuestion>;
  try {
    ideaOfAny(q.ideaId ?? '');
  } catch {
    return false;
  }
  return (
    (FETCHED_KINDS as readonly string[]).includes(q.kind ?? '') &&
    isText(q.prompt, 120) &&
    isText(q.right, 80) &&
    Array.isArray(q.options) &&
    q.options.length === OPTION_COUNT &&
    q.options.every((o) => isText(o, 80)) &&
    q.options.includes(q.right as string) &&
    (q.kind !== 'meaning' || isText(q.form, 120))
  );
}
