// src/data/grammar/questions.ts — the questions that drill a grammar idea (mw-hqd5bz.6), pure: the ending of a form, the form to tap in
// a verse, a letter, the sound of a letter, the stressed syllable, the breathing, the syllables. Each builder takes the idea, the passage
// (the chapters of the goal, or the chapter he has open) and a random source, so a seed gives the same question twice; the placement
// uses the same builders. Nothing here touches the store or the screen. docs/grammar.md. Every wrong choice comes from ../choices.ts, a near miss of the point
// the question tests first (mw-i7xe0n.7): a look-alike letter, the same word's other ending, the twin with the other mark, the preposition's other case.
import { bookOf } from '../books';
import { OPTION_COUNT, choicesOf, lookAlikesOf, pairMates } from '../choices';
import { wordLemma, type Chapter, type EnglishChunk, type GreekWord, type Verse } from '../chapter';
import { buildSteps, type ParseStep } from '../drill';
import { decodeParse, parseSegments, splitParse, type ParseFeatureId, type SplitParse } from '../parseCode';
import { PARADIGMS, tableFor } from '../paradigms';
import { shuffle, type Random } from '../quiz';
import { chosenPronunciation } from '../../speech/greek';
import type { Pronunciation } from '../../speech/pronunciation';
import { LADDER, itemFacet, itemsOf, ideasOf, type Facet, type GrammarIdea } from './ladder';
import type { GradedVerse } from './gradedVerses';
import { ideaSound, ideaText } from './lessons';
import { ENCLITIC_USES, MARK_PAIRS, blankWord } from './marks';
import { SOUND_ALIKE } from './soundAlike';
import { COMPOUND_VERBS, PREPOSITIONS, type CompoundVerb, type PrepCase, type VerseRef } from './prepositions';
import { quickQuestion } from './quickRound';
import { laterTermsIn, termIsTaught } from './taughtTerms';
import { teachOf } from './teach';

export type GrammarKind = 'ending' | 'tap-form' | 'letter' | 'sound' | 'say' | 'stress' | 'breathing' | 'syllables' | 'preposition' | 'compound' | 'concept' | 'cell' | 'meaning' | 'parse' | 'roles';

export interface GrammarQuestion {
  kind: GrammarKind;
  /** the ladder idea it drills; its id is the schedule row's id */
  ideaId: string;
  /** what is asked, in plain words */
  prompt: string;
  /** four choices, the right one among them; the Greek words of the verse for tap-form; two to five for the stress, the breathing and the syllables */
  options: string[];
  /** one of the options */
  right: string;
  /** 'Romans 8:1', where the form is, when the question is about the passage */
  ref?: string;
  /** the Greek shown large: the form with its ending blanked ('ἀρχ_'), the word whose stress or breathing is asked */
  form?: string;
  /** the RP parsing code of the right word, when there is one */
  code?: string;
  /** the Greek that Tap to hear says (a letter, or the word) */
  say?: string;
  /** what the question is about, for Drill it (drillIt.ts, mw-i7xe0n.1): the letter, the ending, the case; a miss on it names the gap */
  facet?: Facet;
  /** the Greek words the question is about, for a 'meaning': the chunk's (or the clause's) words in text order, which the card may mark */
  marked?: string[];
  /** the wrong options that are near misses of the point it tests (src/data/choices.ts, mw-i7xe0n.7): a Hint takes the others away first */
  near?: string[];
  /** an ending's table (mw-svw421.5, data/paradigms tableFor): the id of the paradigm that holds the ending, which the card offers to open after the answer */
  table?: string;
  /** the one line a wrong pick shows under the answer: the sound rule of the word's side, the scheme's ('χ before ε, ι, η ... is soft: hy ...') */
  rule?: string;
  /** a full parsing (kind 'parse', mw-emk3xt.3): the Parsing drill's steps, each a feature with four choices, asked one after the other; `right` is the whole parsing in plain words */
  steps?: ParseStep[];
  /** the word's headword, whose Parsing drill answers each step is written to (kind 'parse') */
  lemma?: string;
}

/** The words of the pronunciation that gives the syllables: the chosen pronunciation's respell, 'khree-STO'. */
export type Respell = (word: string) => string;

const nfc = (s: string): string => s.normalize('NFC');

// ---- The passage ----

interface Place {
  word: GreekWord;
  verse: Verse;
  /** '1 John 1:1' */
  ref: string;
  /** '1jn.1.1': the verse as gradedVerses names it */
  key: string;
}

function placesOf(passage: readonly Chapter[]): Place[] {
  return passage.flatMap((c) =>
    c.verses.flatMap((verse) => verse.g.map((word) => ({ word, verse, ref: `${c.book} ${c.chapter}:${verse.n}`, key: `${c.code}.${c.chapter}.${verse.n}` }))),
  );
}

const termCache = new Map<string, string[]>();
/** The grammar terms of a code in the order its parsing says them: the part of speech first. */
function termsOf(code: string): string[] {
  let terms = termCache.get(code);
  if (!terms) {
    terms = [...new Set(parseSegments(decodeParse(code)).flatMap((s) => (s.term ? [s.term] : [])))];
    termCache.set(code, terms);
  }
  return terms;
}

const ideaCache = new Map<string, string[]>();
const needsIdea = (code: string, id: string): boolean => {
  let ids = ideaCache.get(code);
  if (!ids) {
    ids = ideasOf(code);
    ideaCache.set(code, ids);
  }
  return ids.includes(id);
};

// A drill builds a question from the whole passage on each of its tries (mw-5r3p30.422): what a code or a word is depends on it alone, so it is worked out once.
const parseCache = new Map<string, SplitParse>();
/** splitParse, kept per code: read it, never change it. */
function parsedOf(code: string): SplitParse {
  let parsed = parseCache.get(code);
  if (!parsed) {
    parsed = splitParse(code);
    parseCache.set(code, parsed);
  }
  return parsed;
}

const pick = <T>(items: readonly T[], random: Random): T => items[Math.floor(random() * items.length)];

/** The facets of the questions about a passage (mw-i7xe0n.1): what the idea is, finding it in a verse, and its ending. */
export const MEANING: Facet = { id: 'meaning', label: 'What it is' };
export const SPOT: Facet = { id: 'spot', label: 'Finding it in a verse' };
export const ENDING: Facet = { id: 'ending', label: 'Its ending' };
export const SAYS: Facet = { id: 'says', label: 'What it says' };

// ---- Tap the form ----

/** Every choice of `size` items from `items`, in order. */
function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

/** The parts of speech a word can be named by: its parsing's own, and 'pronoun' for any kind of pronoun (the pronoun is taught before its kinds). */
function partsOf(code: string): string[] {
  const [pos] = termsOf(code);
  return parsedOf(code).pos === 'pronoun' && pos !== 'pronoun' ? [pos, 'pronoun'] : [pos];
}

/** Every term that can describe a word: its parsing's terms, and 'pronoun' beside the part of speech of a pronoun. */
const describingTerms = (code: string): string[] => {
  const [pos, ...features] = termsOf(code);
  return [...new Set([pos, ...partsOf(code), ...features])];
};

/**
 * The fewest terms, starting from the idea's own, that make the word the only one in its verse to have them all: more of its
 * features first, its part of speech last. Only terms the idea and the ideas before it teach are used (mw-5r3p30.379: the singular is not asked
 * as the accusative singular personal pronoun). Null when the verse has the word's text twice, or the taught terms cannot tell it from another word.
 */
function describe(idea: GrammarIdea, place: Place): string[] | null {
  const terms = describingTerms(place.word.p);
  const parts = partsOf(place.word.p);
  const part = parts.find((t) => termIsTaught(t, idea));
  if (place.verse.g.filter((g) => g.t === place.word.t).length > 1) return null;
  // an idea with no term of its own (the pronoun) is asked by the word's part of speech
  const seed = idea.terms.filter((t) => terms.includes(t));
  if (seed.length === 0) {
    if (!part) return null;
    seed.push(part);
  }
  const features = terms.filter((t) => !parts.includes(t) && !seed.includes(t) && termIsTaught(t, idea));
  const extras = [...features, ...(part && !seed.some((t) => parts.includes(t)) ? [part] : [])];
  for (let size = 0; size <= extras.length; size += 1) {
    for (const added of combinations(extras, size)) {
      const chosen = [...seed, ...added];
      const holders = place.verse.g.filter((g) => {
        const has = describingTerms(g.p);
        return chosen.every((t) => has.includes(t));
      });
      if (holders.length === 1) return terms.filter((t) => chosen.includes(t));
    }
  }
  return null;
}

/** 'Tap the dative article', 'Tap the word that is genitive singular', 'Tap the preposition'. */
function tapPrompt(terms: readonly string[], parts: readonly string[]): string {
  const pos = terms.find((t) => parts.includes(t));
  const features = terms.filter((t) => t !== pos).join(' ');
  if (!pos) return `Tap the word that is ${features}`;
  return features ? `Tap the ${features} ${pos}` : `Tap the ${pos}`;
}

/**
 * Tap the form: the Greek words of a verse of the passage, and the one that is, for example, genitive singular. Exactly one word of the
 * verse has everything the prompt names, and its text is not repeated in the verse. Null when the passage has no such verse.
 */
export function buildTapForm(idea: GrammarIdea, passage: readonly Chapter[], random: Random): GrammarQuestion | null {
  const candidates = shuffle(placesOf(passage).filter((p) => needsIdea(p.word.p, idea.id)), random);
  for (const place of candidates) {
    const terms = describe(idea, place);
    if (!terms) continue;
    // the near misses are the verse's words that have all the prompt names but one (the genitive plural beside the genitive singular asked)
    const near = place.verse.g.filter((g) => g.t !== place.word.t && terms.filter((t) => !describingTerms(g.p).includes(t)).length === 1).map((g) => g.t);
    return {
      kind: 'tap-form',
      ideaId: idea.id,
      prompt: tapPrompt(terms, partsOf(place.word.p)),
      options: place.verse.g.map((g) => g.t),
      near: [...new Set(near)],
      right: place.word.t,
      ref: place.ref,
      code: place.word.p,
      facet: SPOT,
    };
  }
  return null;
}

// ---- What does this say? ----

/** The chunks of a clause: two to four of a verse's English chunks in a row. */
const CLAUSE_MIN = 2;
const CLAUSE_MAX = 4;
/** The common English of the passage that lends wrong choices when the verse and its neighbours have too few. */
const COMMON_ENGLISH = 40;

const textOf = (chunk: EnglishChunk): string => chunk.t.trim();
/** A chunk the question can use: it renders at least one Greek word and has English. */
const usable = (chunk: EnglishChunk | undefined): chunk is EnglishChunk => chunk !== undefined && chunk.g.length > 0 && textOf(chunk) !== '';
const sameText = (text: string): string => text.toLowerCase();

/** The Greek words of these chunks of `verse`, once each, in text order. */
const greekOf = (verse: Verse, chunks: readonly EnglishChunk[]): string[] =>
  [...new Set(chunks.flatMap((c) => c.g))].sort((a, b) => a - b).flatMap((i) => (verse.g[i] ? [verse.g[i].t] : []));

/** Every run of `size` usable chunks in a row of `verse`, as the English they read. */
const runsOf = (verse: Verse | undefined, size: number): string[] =>
  verse
    ? verse.e.flatMap((_, i) => {
        const run = verse.e.slice(i, i + size);
        return run.length === size && run.every(usable) ? [run.map(textOf).join(' ')] : [];
      })
    : [];

interface Spot {
  chapter: Chapter;
  verse: Verse;
}

/** The verses that have a form needing the idea in a chunk with English; with `graded`, the easiest third of those at his level (all of them when none is), seeded. */
function meaningVerse(idea: GrammarIdea, passage: readonly Chapter[], random: Random, graded?: readonly GradedVerse[]): Spot | null {
  const spots = passage.flatMap((chapter) =>
    chapter.verses.filter((verse) => verse.g.some((w) => needsIdea(w.p, idea.id) && usable(verse.e[w.e ?? -1]))).map((verse): Spot => ({ chapter, verse })),
  );
  if (spots.length === 0) return null;
  const keyOf = (s: Spot): string => `${s.chapter.code}.${s.chapter.chapter}.${s.verse.n}`;
  const ranked = graded ? graded.flatMap((g) => spots.filter((s) => keyOf(s) === g.ref).map((spot) => ({ spot, atLevel: g.atLevel }))) : [];
  if (ranked.length === 0) return pick(spots, random);
  const pool = ranked.some((r) => r.atLevel) ? ranked.filter((r) => r.atLevel) : ranked;
  return pick(pool.slice(0, Math.ceil(pool.length / 3)), random).spot;
}

/**
 * What does this say? (mw-emk3xt.2): the Greek of one chunk, or of a clause of two to four chunks, of a verse with a form needing the idea, and four
 * English chunks to choose from, the verse's own: the right one and three others of the same verse or its neighbours that render a Greek word and read
 * differently (the passage's commonest English lends when too few). The English is the translators' chunk as written (EnglishChunk.t), never made up.
 * `graded` (gradedVerses) holds it to the easiest third of the verses at his level; without it any verse with a form will do. Null when the passage has none.
 */
export function buildMeaning(idea: GrammarIdea, passage: readonly Chapter[], random: Random, graded?: readonly GradedVerse[]): GrammarQuestion | null {
  const spot = meaningVerse(idea, passage, random, graded);
  if (!spot) return null;
  const { chapter, verse } = spot;
  const word = pick(verse.g.filter((w) => needsIdea(w.p, idea.id) && usable(verse.e[w.e ?? -1])), random);
  const at = word.e!;
  const clause = verse.e.length - 1 - at >= CLAUSE_MIN + 1 && random() < 0.5;
  const size = clause ? CLAUSE_MIN + Math.floor(random() * (CLAUSE_MAX - CLAUSE_MIN + 1)) : 1;
  const chunks = verse.e.slice(at, at + size);
  if (!chunks.every(usable)) return size > 1 ? chunkMeaning(idea, passage, chapter, verse, word, at, random) : null;
  const made = meaningFrom(idea, passage, chapter, verse, word, chunks, random);
  return made ?? (size > 1 ? chunkMeaning(idea, passage, chapter, verse, word, at, random) : null);
}

function chunkMeaning(idea: GrammarIdea, passage: readonly Chapter[], chapter: Chapter, verse: Verse, word: GreekWord, at: number, random: Random): GrammarQuestion | null {
  return usable(verse.e[at]) ? meaningFrom(idea, passage, chapter, verse, word, [verse.e[at]], random) : null;
}

function meaningFrom(idea: GrammarIdea, passage: readonly Chapter[], chapter: Chapter, verse: Verse, word: GreekWord, chunks: EnglishChunk[], random: Random): GrammarQuestion | null {
  const size = chunks.length;
  const right = chunks.map(textOf).join(' ');
  const index = chapter.verses.indexOf(verse);
  const neighbours = [chapter.verses[index - 1], chapter.verses[index + 1]];
  const ofVerse = (v: Verse | undefined): string[] => (size === 1 ? (v?.e ?? []).filter(usable).map(textOf) : runsOf(v, size));
  const common = new Map<string, number>();
  if (size === 1) for (const c of passage.flatMap((ch) => ch.verses.flatMap((v) => v.e))) if (usable(c)) common.set(textOf(c), (common.get(textOf(c)) ?? 0) + 1);
  const { options, near } = choicesOf(
    {
      right,
      near: shuffle(ofVerse(verse), random),
      fillers: neighbours.flatMap(ofVerse),
      lastResort: [...common].sort((a, b) => b[1] - a[1]).slice(0, COMMON_ENGLISH).map(([text]) => text),
      keyOf: sameText,
    },
    random,
  );
  if (options.length < OPTION_COUNT) return null;
  const marked = greekOf(verse, chunks);
  return {
    kind: 'meaning',
    ideaId: idea.id,
    prompt: 'What does this say?',
    options,
    near,
    right,
    ref: `${chapter.book} ${chapter.chapter}:${verse.n}`,
    form: marked.join(' '),
    marked,
    say: marked.join(' '),
    code: word.p,
    facet: SAYS,
  };
}

// ---- Parse this word, and who does what to whom (mw-emk3xt.3) ----

/** The places of the verses at his level (gradedVerses' atLevel), the easiest verse first; none without graded verses. */
function atLevelPlaces(places: readonly Place[], graded: readonly GradedVerse[] | undefined): Place[] {
  const rank = new Map<string, number>();
  graded?.forEach((g, i) => {
    if (g.atLevel) rank.set(g.ref, i);
  });
  return places.filter((p) => rank.has(p.key)).sort((a, b) => rank.get(a.key)! - rank.get(b.key)!);
}

/** The places of the easiest third of the verses they stand in (all of them when the verses are few), `places` easiest first. */
function easiestThird(places: readonly Place[]): Place[] {
  const verses = [...new Set(places.map((p) => p.key))];
  const keep = new Set(verses.slice(0, Math.ceil(verses.length / 3)));
  return places.filter((p) => keep.has(p.key));
}

/** Whether a form's code needs the idea; a code the ladder cannot read needs none. */
function needs(code: string, id: string): boolean {
  try {
    return needsIdea(code, id);
  } catch {
    return false;
  }
}

/** What a code says, by feature: { pos 'verb', value { tense 'perfect', person '1st person' ... } }; null for a code splitParse cannot read. */
function readCode(code: string): { pos: string; value: Partial<Record<ParseFeatureId, string>> } | null {
  try {
    const { pos, features } = parsedOf(code);
    return { pos, value: Object.fromEntries(features.map((f) => [f.id, f.value])) };
  } catch {
    return null;
  }
}

/**
 * Parse this word (mw-emk3xt.3, PROVISIONAL): a word of a verse at his level (`graded`) whose forms all pass, so every idea it has is frontier or solid, and that
 * needs the idea, in the easiest third of such verses. It is the Parsing drill's steps as one question (drill.ts buildSteps: the part of speech, then what the code goes on to say, each with
 * four choices), asked one after the other by the card; `right` is the whole parsing in plain words. Null with no graded verses, or when no such word has a feature to parse.
 */
export function buildParse(idea: GrammarIdea, passage: readonly Chapter[], random: Random, graded?: readonly GradedVerse[]): GrammarQuestion | null {
  const found = atLevelPlaces(placesOf(passage), graded).filter((p) => Object.keys(readCode(p.word.p)?.value ?? {}).length > 0 && needs(p.word.p, idea.id));
  for (const place of shuffle(easiestThird(found), random)) {
    let steps: ParseStep[];
    try {
      steps = buildSteps(place.word.p, random);
    } catch {
      continue;
    }
    const right = decodeParse(place.word.p);
    return {
      kind: 'parse',
      ideaId: idea.id,
      prompt: `Parse ${place.word.t}`,
      options: [right],
      right,
      ref: place.ref,
      form: place.word.t,
      code: place.word.p,
      say: place.word.t,
      steps,
      lemma: nfc(wordLemma(place.word)),
    };
  }
  return null;
}

/** The ideas whose forms a verse's subject, verb and object show (mw-emk3xt.3): the cases of the one who acts and the one acted on, the verb and its person. */
const ROLE_IDEAS: ReadonlySet<string> = new Set(['case-nominative', 'case-accusative', 'verb', 'person-1st', 'person-2nd', 'person-3rd']);

export const ROLE_PROMPTS = { subject: 'Tap the one who does it', verb: 'Tap what is done', object: 'Tap what it is done to' } as const;

interface Roles {
  verb: GreekWord;
  subject: GreekWord;
  object?: GreekWord;
}

/**
 * The roles of a verse that has exactly one finite verb (a verb with a person: no participle or infinitive) and exactly one nominative noun or pronoun of the verb's number, its
 * subject; the object is the verse's one accusative noun or pronoun, when it has exactly one. Each word asked is the only one of its text in the verse, so a tap is unambiguous. Null otherwise.
 */
function rolesOf(verse: Verse): Roles | null {
  const read = verse.g.map((word) => ({ word, code: readCode(word.p) }));
  const verbs = read.filter((r) => r.code?.pos === 'verb' && r.code.value.person !== undefined);
  if (verbs.length !== 1) return null;
  const nominal = (r: (typeof read)[number], at: string) => (r.code?.pos === 'noun' || r.code?.pos === 'pronoun') && r.code.value.case === at;
  const subjects = read.filter((r) => nominal(r, 'nominative') && r.code?.value.number === verbs[0].code?.value.number);
  const objects = read.filter((r) => nominal(r, 'accusative'));
  const once = (w: GreekWord) => verse.g.filter((g) => g.t === w.t).length === 1;
  if (subjects.length !== 1 || !once(verbs[0].word) || !once(subjects[0].word)) return null;
  return { verb: verbs[0].word, subject: subjects[0].word, object: objects.length === 1 && once(objects[0].word) ? objects[0].word : undefined };
}

/**
 * Who does what to whom (mw-emk3xt.3, PROVISIONAL): the words of a verse at his level (`graded`) with one finite verb and one subject (rolesOf), in the easiest third of such verses whose
 * subject, verb or object needs the idea; the prompt is drawn from 'Tap the one who does it' (the subject), 'Tap what is done' (the verb) and, when the verse has one accusative object,
 * 'Tap what it is done to'. For case-nominative, case-accusative, verb and the three persons; null for another idea, with no graded verses or when no verse fits.
 */
export function buildRoles(idea: GrammarIdea, passage: readonly Chapter[], random: Random, graded?: readonly GradedVerse[]): GrammarQuestion | null {
  if (!ROLE_IDEAS.has(idea.id)) return null;
  const spots = atLevelPlaces(placesOf(passage), graded).filter((p, i, all) => all.findIndex((q) => q.key === p.key) === i);
  const roles = spots.flatMap((place) => {
    const found = rolesOf(place.verse);
    return found && [found.verb, found.subject, ...(found.object ? [found.object] : [])].some((w) => needs(w.p, idea.id)) ? [{ place, found }] : [];
  });
  if (roles.length === 0) return null;
  const { place, found } = pick(roles.slice(0, Math.ceil(roles.length / 3)), random);
  const asked = [
    { prompt: ROLE_PROMPTS.subject, word: found.subject },
    { prompt: ROLE_PROMPTS.verb, word: found.verb },
    ...(found.object ? [{ prompt: ROLE_PROMPTS.object, word: found.object }] : []),
  ];
  const { prompt, word } = pick(asked, random);
  return { kind: 'roles', ideaId: idea.id, prompt, options: place.verse.g.map((g) => g.t), right: word.t, ref: place.ref, code: word.p, facet: SPOT };
}

// ---- The ending of a form ----

const baseOf = (c: string): string => {
  const base = c.normalize('NFD')[0].toLowerCase();
  return base === 'ς' ? 'σ' : base;
};
/** The letters of a text without their marks, a final sigma as a sigma: two endings with the same key are the same to the ear. */
const keyOf = (text: string): string => [...nfc(text)].map(baseOf).join('');
const isVowel = (c: string): boolean => 'αεηιουω'.includes(baseOf(c));

const MAX_ENDING = 5;

/** Every paradigm table: the tables open for a question that asks an ending whatever he has opened (the placement, Drill it; PROVISIONAL, mw-svw421.5). */
export const EVERY_TABLE: ReadonlySet<string> = new Set(PARADIGMS.map((p) => p.id));

/**
 * The stem the lemma and the form share and the ending after it: ἀρχή and ἀρχῆς share ἀρχ, ending ῆς. The stem keeps at least one
 * letter and the ending at least one, a stem vowel goes to the ending (λόγος, λόγου: λόγ + ου), and a form that is mostly ending has none.
 */
export function stemOf(lemma: string, form: string): Readonly<{ stem: string; ending: string }> | null {
  const key = `${lemma}|${form}`;
  if (stemCache.has(key)) return stemCache.get(key)!;
  const stem = findStem(lemma, form);
  stemCache.set(key, stem);
  return stem;
}

const stemCache = new Map<string, Readonly<{ stem: string; ending: string }> | null>();

function findStem(lemma: string, form: string): { stem: string; ending: string } | null {
  const [l, f] = [[...nfc(lemma)], [...nfc(form)]];
  if (/[^\p{L}\p{M}]/u.test(nfc(form))) return null;
  let k = 0;
  while (k < l.length && k < f.length && baseOf(l[k]) === baseOf(f[k])) k += 1;
  k = Math.min(k, f.length - 1);
  while (k > 1 && isVowel(f[k - 1])) k -= 1;
  if (k < 1) return null;
  const ending = f.slice(k).join('');
  return keyOf(ending).length > MAX_ENDING ? null : { stem: f.slice(0, k).join(''), ending };
}

/**
 * What a form of a word that inflects is, in the terms the idea and the ideas before it teach: 'genitive singular', 'present active indicative 3rd person singular'
 * (mw-5r3p30.379). Null when that leaves the ending unsettled: every feature must be named, except a noun's gender, which never changes the ending of the noun
 * (its lemma has one gender), and at least one must be.
 */
function featuresOf(code: string, idea: GrammarIdea): string[] | null {
  const { pos, features } = parsedOf(code);
  const named = features.filter((f) => termIsTaught(f.value, idea));
  const settled = features.every((f) => termIsTaught(f.value, idea) || (pos === 'noun' && f.id === 'gender'));
  return settled && named.length > 0 ? named.map((f) => f.value) : null;
}

const COMMON_ENDINGS: Record<'noun' | 'verb', string[]> = {
  noun: ['ος', 'ου', 'ῳ', 'ον', 'οι', 'ων', 'οις', 'ους', 'α', 'ης', 'ῃ', 'ην', 'ας', 'αις', 'ις', 'ι', 'ες', 'εως'],
  verb: ['ω', 'εις', 'ει', 'ομεν', 'ετε', 'ουσιν', 'ον', 'ες', 'ε', 'ομαι', 'εται', 'ονται', 'ῃ', 'α', 'ασιν'],
};

/**
 * An ending as it is asked (mw-86e9r1.4): a final ν that comes and goes (-σιν, and a verb's -εν) is shown in brackets, ουσιν as ουσι(ν), and
 * is one ending with or without it. Returns the ending's plain key as well, so two endings that differ only in that ν are the same.
 */
function shownEnding(ending: string, pos: string): { text: string; key: string } {
  const text = nfc(ending);
  const key = keyOf(text);
  const movable = key.endsWith('σιν') || (pos === 'verb' && key === 'εν');
  return movable ? { text: `${text.slice(0, -1)}(ν)`, key: key.slice(0, -1) } : { text, key };
}

/**
 * The ending of a form from the passage: the form with its ending blanked ('ἀρχ_'), what the form is ('genitive singular feminine of ἀρχή') and
 * four endings. Three wrong endings are the endings of other inflected words of the same part of speech in the passage; a passage that
 * has too few lends the common endings. Null when the idea has no form in the passage that shares a stem with its dictionary form.
 * A form is asked only once its table is open (mw-svw421.5): `tablesOpen` holds the ids of the tables he has opened (tableFor names a form's), and a form whose table
 * is not among them is left out; the question's `table` is the table to show after the answer. The placement asks with every table open (PROVISIONAL).
 */
export function buildEnding(idea: GrammarIdea, passage: readonly Chapter[], random: Random, tablesOpen: ReadonlySet<string> = EVERY_TABLE): GrammarQuestion | null {
  const places = placesOf(passage).filter((p) => parsedOf(p.word.p).features.length > 0);
  const stems = (p: Place) => stemOf(p.word.l, p.word.t);
  const open = (p: Place) => {
    const table = tableFor(p.word.p);
    return table !== undefined && tablesOpen.has(table.id);
  };
  // only in the terms taught so far, and still one right ending (featuresOf), and only from a table he has opened
  const candidates = shuffle(places.filter((p) => needsIdea(p.word.p, idea.id) && stems(p) && featuresOf(p.word.p, idea) && open(p)), random);
  const place = candidates[0];
  if (!place) return null;
  const { stem, ending: plainEnding } = stems(place)!;
  const pos = parsedOf(place.word.p).pos;
  const right = shownEnding(plainEnding, pos);
  const shownOf = (endings: readonly string[]) => endings.map((e) => shownEnding(e, pos));
  // the near misses are the same word's other endings in the passage (another case or tense of it), then other words' of its kind, then the common ones
  const sameWord = shuffle(places.filter((p) => p.word.l === place.word.l && p.word.p !== place.word.p), random).flatMap((p) => stems(p)?.ending ?? []);
  const sameKind = places.filter((p) => parsedOf(p.word.p).pos === pos).flatMap((p) => stems(p)?.ending ?? []);
  const { options, near } = choicesOf(
    { right, near: shownOf(sameWord), fillers: shownOf(sameKind), lastResort: shownOf(shuffle(COMMON_ENDINGS[pos === 'verb' ? 'verb' : 'noun'], random)), keyOf: (e) => e.key },
    random,
  );
  return {
    kind: 'ending',
    ideaId: idea.id,
    prompt: `Fill in the ending: ${featuresOf(place.word.p, idea)!.join(' ')} of ${place.word.l}`,
    options: options.map((e) => e.text),
    near: near.map((e) => e.text),
    right: right.text,
    ref: place.ref,
    form: `${stem}_`,
    code: place.word.p,
    table: tableFor(place.word.p)?.id,
    facet: ENDING,
  };
}

// ---- Letters and sounds ----

const LETTER_IDEAS = LADDER.filter((i) => i.glyphs);

/** The form of a letter a question asks: its small letter or its capital (mw-86e9r1.11). */
export type LetterForm = 'small' | 'capital';
/** The glyph of an idea in a form; a pair or a mark has only the one, the small. */
const glyphOf = (idea: GrammarIdea, form: LetterForm = 'small'): string => idea.glyphs?.[form === 'capital' ? 1 : 0] ?? '';

/** A letter and the form of it that a drill asks (the letter drill, letterDrill.ts); `byName` asks it by its name, never by its sound. */
export interface LetterAsk {
  letter: GrammarIdea;
  form: LetterForm;
  byName?: boolean;
}

/** The letter an idea is about; the alphabet is about any of them. */
const letterOf = (idea: GrammarIdea, random: Random): GrammarIdea => (idea.glyphs ? idea : pick(LETTER_IDEAS, random));

/** Four glyphs: `right`, its near misses among `others` first (choices.ts), then others at random. */
const glyphs = (right: string, near: readonly string[], others: readonly string[], random: Random): Pick<GrammarQuestion, 'options' | 'near'> =>
  choicesOf({ right, near: near.filter((g) => others.includes(g)), fillers: others }, random);

/** The glyphs of the letters a reader mistakes `letter` for, in a form. */
const lookAlikeGlyphs = (letter: GrammarIdea, form: LetterForm): string[] => lookAlikesOf(letter.id).map((id) => glyphOf(LETTER_IDEAS.find((l) => l.id === id)!, form));

/** What a letter or pair sounds like in `scheme`: its lesson's sound, else the scheme's own respelling of it, so two that sound alike are never told apart by a missing lesson. */
const soundKey = (idea: GrammarIdea, scheme: Pronunciation): string => ideaSound(idea, scheme) ?? scheme.respell(glyphOf(idea) || (idea.pair ?? ''));

/**
 * A letter: 'Which letter is Beta?' or 'Which letter sounds like v, as in “vase”?' (the sound is the chosen pronunciation's, mw-5r3p30.229; a
 * scheme that gives none asks by name), over four glyphs. A letter that sounds like another (η ι υ, ο ω) is never offered beside it when the sound is asked.
 * It asks the small letter or the capital, by chance (mw-86e9r1.11): 'Which capital letter is Beta?' over four capitals. `ask` fixes the letter and its form.
 */
export function buildLetter(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation(), ask?: LetterAsk): GrammarQuestion {
  const letter = ask?.letter ?? letterOf(idea, random);
  const form = ask?.form ?? (random() < 0.5 ? 'small' : 'capital');
  const sound = ideaSound(letter, scheme);
  const bySound = ask?.byName ? false : random() < 0.5 && sound !== undefined;
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && (!bySound || ideaSound(o, scheme) !== sound));
  const which = form === 'capital' ? 'Which capital letter' : 'Which letter';
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: bySound ? `${which} sounds like ${sound}?` : `${which} is ${letter.title}?`,
    ...glyphs(glyphOf(letter, form), lookAlikeGlyphs(letter, form), others.map((o) => glyphOf(o, form)), random),
    right: glyphOf(letter, form),
    facet: itemFacet(letter),
  };
}

/** Which letter he hears: Tap to hear says it, and no other letter of its sound is among the four glyphs, small or capital by chance (`ask` fixes them). */
export function buildSound(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation(), ask?: LetterAsk): GrammarQuestion {
  const letter = ask?.letter ?? letterOf(idea, random);
  const form = ask?.form ?? (random() < 0.5 ? 'small' : 'capital');
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && soundKey(o, scheme) !== soundKey(letter, scheme));
  return {
    kind: 'sound',
    ideaId: idea.id,
    prompt: 'Tap to hear a letter, then tap it',
    ...glyphs(glyphOf(letter, form), lookAlikeGlyphs(letter, form), others.map((o) => glyphOf(o, form)), random),
    right: glyphOf(letter, form),
    say: glyphOf(letter, form),
    facet: itemFacet(letter),
  };
}

/** The prompt of Say it: the letter is shown, he says its name or its sound (the matcher is sayIt.ts). */
export const SAY_PROMPT = 'Say its name or its sound';

/**
 * Say it (mw-86e9r1.12): a letter shown large, which he says aloud, its name or its sound, and the phone's speech recognition checks it (data/grammar/sayIt.ts). It has no choices:
 * `form` is the glyph shown, `right` the same glyph (the letter a right or a missed answer is about), `say` the glyph the voice says on a miss, which plays the right sound.
 */
export function buildSay(idea: GrammarIdea, ask: LetterAsk): GrammarQuestion {
  const glyph = glyphOf(ask.letter, ask.form);
  return { kind: 'say', ideaId: idea.id, prompt: SAY_PROMPT, options: [], right: glyph, form: glyph, say: glyph, facet: itemFacet(ask.letter) };
}

/** One pair of a group for each sound the scheme gives (ει, οι and υι are one): its pair and the sound the scheme says for it. */
function pairsOf(group: string, scheme: Pronunciation): [string, string][] {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const item of itemsOf(group)) {
    const sound = ideaSound(item, scheme);
    if (sound === undefined || seen.has(sound)) continue;
    seen.add(sound);
    out.push([item.pair ?? '', sound]);
  }
  return out;
}
const PUNCTUATION: [string, string][] = [['Which mark is a question mark in Greek?', ';'], ['Which mark is a colon or a semicolon in Greek?', '·']];

/** A question over a short table of marks: the right one, its near misses, then the others of the table. */
function fromTable(idea: GrammarIdea, prompt: string, right: string, near: readonly string[], others: readonly string[], random: Random, facet: Facet): GrammarQuestion {
  return { kind: 'letter', ideaId: idea.id, prompt, ...glyphs(right, near, [...near, ...others], random), right, facet };
}

/** Which pair sounds like a sound the scheme gives; a scheme that gives none is asked by ear (Tap to hear), the pairs it says alike never together. */
function buildPairs(idea: GrammarIdea, group: string, what: string, random: Random, scheme: Pronunciation): GrammarQuestion {
  const table = pairsOf(group, scheme);
  if (table.length === 0) {
    const items = itemsOf(group);
    const pair = pick(items, random);
    const others = items.filter((o) => o.id !== pair.id && soundKey(o, scheme) !== soundKey(pair, scheme)).map((o) => o.pair ?? '');
    const near = pairMates(pair.pair ?? '', items.map((o) => o.pair ?? ''));
    return { kind: 'sound', ideaId: idea.id, prompt: `Tap to hear a pair of ${what}, then tap it`, ...glyphs(pair.pair ?? '', near, others, random), right: pair.pair ?? '', say: pair.pair, facet: itemFacet(pair) };
  }
  const [pair, sound] = pick(table, random);
  const others = table.map(([p]) => p).filter((p) => p !== pair);
  return fromTable(idea, `Which pair of ${what} sounds like ${sound}?`, pair, pairMates(pair, others), others, random, itemFacet(itemsOf(group).find((i) => i.pair === pair) ?? idea));
}

export function buildSubscript(idea: GrammarIdea, random: Random): GrammarQuestion {
  const right = pick(['ᾳ', 'ῃ', 'ῳ'], random);
  // the near miss is the same letter without its iota
  const bare = right.normalize('NFD')[0];
  return fromTable(idea, 'Which letter has a tiny iota under it?', right, [bare], ['α', 'η', 'ω', 'ι', 'ο'], random, { id: `subscript-${right}`, label: right });
}

export function buildPunctuation(idea: GrammarIdea, random: Random): GrammarQuestion {
  const [prompt, right] = pick(PUNCTUATION, random);
  const facet = right === ';' ? { id: 'question-mark', label: 'The question mark ;' } : { id: 'raised-dot', label: 'The raised dot ·' };
  // the near miss is the other Greek mark
  return fromTable(idea, prompt, right, [';', '·'].filter((m) => m !== right), ['.', ','], random, facet);
}

// ---- Movable letters ----

// [prompt, right, its near misses (the same word's other forms), the others it may be told from, its facet]. Every word is a real New Testament one, with its place.
const NOT_FORMS = ['οὐ', 'οὐκ', 'οὐχ'];
const OUT_FORMS = ['ἐκ', 'ἐξ'];
export const MOVABLE_FACETS = {
  not: { id: 'movable-not', label: 'οὐ, οὐκ, οὐχ' },
  out: { id: 'movable-out', label: 'ἐκ, ἐξ' },
  elision: { id: 'movable-elision', label: 'A dropped vowel: ἀπ᾿, ἀφ᾿' },
  nu: { id: 'movable-nu', label: 'A movable ν' },
} as const;
const MOVABLE: [string, string, readonly string[], readonly string[], Facet][] = [
  ['Which fits? ___ κατέλαβεν (John 1:5, “did not overcome it”)', 'οὐ', NOT_FORMS, OUT_FORMS, MOVABLE_FACETS.not],
  ['Which fits? ___ ἦν ἐκεῖνος τὸ φῶς (John 1:8, “he was not the light”)', 'οὐκ', NOT_FORMS, OUT_FORMS, MOVABLE_FACETS.not],
  ['Which fits? ___ οὗτός ἐστιν (John 7:25, “Is this not he?”)', 'οὐχ', NOT_FORMS, OUT_FORMS, MOVABLE_FACETS.not],
  ['Which fits? ___ θεοῦ ἐγεννήθησαν (John 1:13, “out of God they were born”)', 'ἐκ', OUT_FORMS, NOT_FORMS, MOVABLE_FACETS.out],
  ['Which fits? ___ ἧς ἐγεννήθη Ἰησοῦς (Matthew 1:16, “out of whom Jesus was born”)', 'ἐξ', OUT_FORMS, NOT_FORMS, MOVABLE_FACETS.out],
  ['Which fits? ___ ἀρχῆς (1 John 2:7, “from the beginning”; the word is ἀπό with its vowel dropped)', 'ἀπ᾿', ['ἀφ᾿', 'ἀπό'], ['ἐπ᾿'], MOVABLE_FACETS.elision],
  ['Which fits? ___ ἑαυτοῦ (John 5:19, “of himself”; the next word begins with a rough breathing)', 'ἀφ᾿', ['ἀπ᾿', 'ἀπό'], ['ἐφ᾿'], MOVABLE_FACETS.elision],
  // no near miss: the others are words that never take the ν
  ['Which of these may take a movable ν at its end (John 1:34)?', 'ἐστι(ν)', [], ['λόγος', 'ἀγάπη', 'τοῦτο', 'οὐκ'], MOVABLE_FACETS.nu],
];

/** A word that changes its last letter: οὐ, οὐκ or οὐχ, ἐκ or ἐξ, ἀπ᾿ or ἀφ᾿, a movable ν; four to choose from, one right, the same word's other forms first. */
export function buildMovable(idea: GrammarIdea, random: Random): GrammarQuestion {
  const [prompt, right, near, others, facet] = pick(MOVABLE, random);
  return fromTable(idea, prompt, right, near.filter((o) => o !== right), others, random, facet);
}

// ---- Marks that change the word, and enclitics (mw-86e9r1.6) ----

/**
 * Which of two words alike but for a mark fits a real phrase: 'Which fits? ___ ζωὴ ἦν τὸ φῶς (John 1:4, “the life was the light”)'. The twin, the same
 * letters with the other mark, is always among the four choices, so a reader who ignores the mark cannot tell it from the right word.
 */
export function buildMarksChangeWord(idea: GrammarIdea, random: Random): GrammarQuestion {
  const pair = pick(MARK_PAIRS, random);
  const [word, twin] = random() < 0.5 ? [pair.a, pair.b] : [pair.b, pair.a];
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: `Which fits? ${blankWord(word.phrase, word.inPhrase)} (${refText(word.ref)}, “${word.gloss}”)`,
    ...choicesOf({ right: word.inPhrase, near: [twin.inPhrase], fillers: word.decoys }, random),
    right: word.inPhrase,
    facet: { id: `marks-${[pair.a.word, pair.b.word].join('-')}`, label: `${pair.a.word} / ${pair.b.word}` },
  };
}

const bareLetters = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** A small word that leans on the one before it, or the question word τίς it is not: the right one among its twin and other forms, in a real phrase. */
export function buildEnclitic(idea: GrammarIdea, random: Random): GrammarQuestion {
  const use = pick(ENCLITIC_USES, random);
  // the near miss is its twin, the same letters with another accent (τις, τίς; μου, ἐμοῦ), else the first of the others, which marks.ts puts first
  const twins = use.others.filter((o) => bareLetters(o).includes(bareLetters(use.right)) || bareLetters(use.right).includes(bareLetters(o)));
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: `Which fits? ${blankWord(use.phrase, use.right)} (${refText(use.ref)}, “${use.gloss}”)`,
    ...choicesOf({ right: use.right, near: twins.length > 0 ? twins : use.others.slice(0, 1), fillers: use.others }, random),
    right: use.right,
    facet: { id: `enclitic-${use.right}`, label: use.right },
  };
}

// ---- Words that sound alike (mw-86e9r1.7) ----

/**
 * Hear a word and pick its spelling: 'Tap to hear the word for “we”', over the word, its twin and two words of the other pairs. When the scheme
 * says the two words alike (Modern Greek: ἡμεῖς and ὑμεῖς are both 'ee-MEES') the ear cannot decide between them, so the question can only be
 * answered from the spelling, and says so; a scheme that says them apart is asked the same by ear, with nothing said of sounding alike. The pairs the
 * scheme says alike are the ones asked, when it says any.
 */
export function buildSoundAlike(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
  const alike = SOUND_ALIKE.filter((p) => scheme.respell(p.a.word) === scheme.respell(p.b.word));
  const pair = pick(alike.length > 0 ? alike : SOUND_ALIKE, random);
  const [word, twin] = random() < 0.5 ? [pair.a, pair.b] : [pair.b, pair.a];
  const sameSound = scheme.respell(word.word) === scheme.respell(twin.word);
  const others = SOUND_ALIKE.filter((p) => p !== pair).flatMap((p) => [p.a.word, p.b.word]);
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: sameSound
      ? `This word sounds just like another. Tap to hear the word for “${word.gloss}”, then tap how it is spelt.`
      : `Tap to hear the word for “${word.gloss}”, then tap how it is spelt.`,
    ...choicesOf({ right: word.word, near: [twin.word], fillers: others }, random),
    right: word.word,
    say: word.word,
  };
}

// ---- Prepositions and compound verbs (mw-86e9r1.5) ----

const refText = (r: VerseRef): string => `${bookOf(r.book)?.name ?? r.book} ${r.chapter}:${r.verse}`;
/** The words of a meaning that carry it ('out of' has none, 'because of' has 'because'), for telling two meanings apart. */
const meaningWords = (meaning: string): string[] => meaning.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
const alike = (a: string, b: string): boolean => meaningWords(a).some((w) => meaningWords(b).includes(w));

/**
 * `right` and three wrong meanings, `near` first (the other cases of the same preposition), then `others`; none shares a word with the right one unless the rest
 * run out, but `closest` (a near miss that does on purpose: 'throw' for 'throw out') comes first whatever it shares.
 */
function meaningChoices(right: string, near: readonly string[], others: readonly string[], random: Random, closest: readonly string[] = []): Pick<GrammarQuestion, 'options' | 'near'> {
  const apart = (list: readonly string[]) => list.filter((m) => !alike(m, right));
  return choicesOf({ right, near: [...closest, ...apart(near)], fillers: apart(others), lastResort: [...near, ...shuffle(others, random)] }, random);
}

/**
 * What a preposition means before the case of a real phrase: 'What does διά mean here?' over διὰ τοὺς λόγους (John 10:19). The meaning of the
 * preposition's other cases is among the choices, so a reader who ignores the case misses it.
 */
export function buildPreposition(idea: GrammarIdea, random: Random, only?: { case: PrepCase; near: boolean }): GrammarQuestion {
  const prep = PREPOSITIONS.find((p) => idea.id === `preposition-${p.key}`);
  if (!prep) throw new Error(`${idea.id} is not a preposition idea`);
  // Drill it asks one case at a time, first without the meanings of the preposition's other cases among the choices (`near` false)
  const use = (only && prep.uses.find((u) => u.case === only.case)) || pick(prep.uses, random);
  const near = only && !only.near ? [] : prep.uses.filter((u) => u !== use).map((u) => u.meaning);
  const others = PREPOSITIONS.filter((p) => p !== prep).flatMap((p) => p.uses.map((u) => u.meaning));
  return {
    kind: 'preposition',
    ideaId: idea.id,
    prompt: `What does ${prep.greek} mean here?`,
    ...meaningChoices(use.meaning, near, others, random),
    right: use.meaning,
    ref: refText(use.ref),
    form: use.phrase,
    say: use.phrase,
    facet: { id: `case-${use.case}`, label: `With the ${use.case}` },
  };
}

/** What a verb made of a preposition and a verb means: 'ἐκ + βάλλω (“throw”) makes ἐκβάλλω, as in ἐξεβάλομεν. What does ἐκβάλλω mean?' */
export function buildCompound(idea: GrammarIdea, random: Random, which?: CompoundVerb): GrammarQuestion {
  const verb = which ?? pick(COMPOUND_VERBS, random);
  return {
    kind: 'compound',
    ideaId: idea.id,
    prompt: `${verb.prefix} + ${verb.stem} (“${verb.stemMeaning}”) makes ${verb.lemma}, as in ${verb.form}. What does ${verb.lemma} mean?`,
    // the near miss is the verb without its preposition (ἐκβάλλω read as βάλλω, 'throw'): the point is what the preposition adds
    ...meaningChoices(verb.meaning, [], COMPOUND_VERBS.map((c) => c.meaning), random, [verb.stemMeaning]),
    right: verb.meaning,
    ref: refText(verb.ref),
    form: verb.lemma,
    say: verb.lemma,
    facet: { id: `prefix-${verb.prefix}`, label: `${verb.prefix} + a verb` },
  };
}

// ---- Words: stress, syllables, breathing ----

/** Words to ask about when the passage has none that will do. */
const SAMPLE_WORDS = ['λόγος', 'ἀγάπη', 'θεός', 'ἄνθρωπος', 'ζωή', 'ἅγιος', 'ὕδωρ', 'ἐν', 'ὁ', 'εὑρίσκω'];

/** The chosen pronunciation's respelling, read at each use (mw-5r3p30.268: never a scheme named here). */
const DEFAULT_RESPELL: Respell = (word) => chosenPronunciation().respell(word);

interface Spoken {
  word: string;
  ref?: string;
  code?: string;
}

/** The words of the passage, a word once however often it stands, in a random order. */
function wordsOf(passage: readonly Chapter[], random: Random): Spoken[] {
  const seen = new Set<string>();
  const found = placesOf(passage).flatMap((p) => (seen.has(p.word.t) ? [] : (seen.add(p.word.t), [{ word: p.word.t, ref: p.ref, code: p.word.p }])));
  return shuffle(found, random);
}

const shown = (s: Spoken): Pick<GrammarQuestion, 'ref' | 'form' | 'code' | 'say'> => ({ ref: s.ref, form: s.word, code: s.code, say: s.word });

/** The facet of a question about a word by its length: 'stress-2' for a word of two syllables, 'stress-4' for four or more. */
export const lengthFacet = (prefix: 'stress' | 'syllables', syllables: number): Facet => {
  const n = Math.min(Math.max(syllables, 2), 4);
  return { id: `${prefix}-${n}`, label: n === 2 ? 'Words of two syllables' : n === 3 ? 'Words of three syllables' : 'Longer words' };
};

/** The facet of a question whose answer is a breathing. */
export const breathingFacet = (breathing: 'Rough' | 'Smooth'): Facet => ({ id: `breathing-${breathing.toLowerCase()}`, label: `${breathing.toLowerCase()} breathing` });

/** The syllables of a word as its pronunciation says them, and which one is stressed; null for a word of one syllable or with no stress mark. */
export function syllablesOf(word: string, respell: Respell = DEFAULT_RESPELL): { syllables: string[]; stressed: number } | null {
  const parts = respell(word).split('-');
  const stressed = parts.findIndex((p) => /\p{Lu}/u.test(p) && p === p.toUpperCase());
  const syllables = parts.map((p) => p.toLowerCase());
  if (parts.length < 2 || stressed < 0 || new Set(syllables).size !== syllables.length) return null;
  return { syllables, stressed };
}

/** Which syllable of a word of the passage is said loudest, from the pronunciation's respell. */
export function buildStress(idea: GrammarIdea, passage: readonly Chapter[], random: Random, respell: Respell = DEFAULT_RESPELL): GrammarQuestion {
  const spoken = [...wordsOf(passage, random), ...SAMPLE_WORDS.map((word) => ({ word }))];
  for (const s of spoken) {
    const parts = syllablesOf(s.word, respell);
    if (!parts) continue;
    return {
      kind: 'stress',
      ideaId: idea.id,
      prompt: `Which part of ${s.word} is said loudest?`,
      options: parts.syllables,
      // the options are the word's own syllables in order; the near misses are the ones beside the stressed one
      near: [parts.syllables[parts.stressed - 1], parts.syllables[parts.stressed + 1]].filter((p): p is string => p !== undefined),
      right: parts.syllables[parts.stressed],
      ...shown(s),
      facet: lengthFacet('stress', parts.syllables.length),
    };
  }
  throw new Error('No word to ask the stress of');
}

/** How many syllables a word of the passage has. */
export function buildSyllables(idea: GrammarIdea, passage: readonly Chapter[], random: Random, respell: Respell = DEFAULT_RESPELL): GrammarQuestion {
  const spoken = [...wordsOf(passage, random), ...SAMPLE_WORDS.map((word) => ({ word }))];
  for (const s of spoken) {
    const count = respell(s.word).split('-').length;
    if (count < 2) continue;
    const first = Math.max(1, Math.min(count - 1, count - OPTION_COUNT + 1));
    return {
      kind: 'syllables',
      ideaId: idea.id,
      prompt: `How many syllables has ${s.word}?`,
      options: Array.from({ length: OPTION_COUNT }, (_, i) => String(first + i)),
      // the counts run in order; the near misses are one more and one fewer
      near: [String(count - 1), String(count + 1)].filter((n) => Number(n) >= first && Number(n) < first + OPTION_COUNT),
      right: String(count),
      ...shown(s),
      facet: lengthFacet('syllables', count),
    };
  }
  throw new Error('No word to count the syllables of');
}

const ROUGH = '̔';
const SMOOTH = '̓';

/** The breathing a word begins with: it sits on the first letter, or on the second of a pair of vowels. Undefined for a word that begins with a consonant other than ρ. */
export function breathingOf(word: string): 'Rough' | 'Smooth' | undefined {
  const letters = [...word.normalize('NFD')].reduce<string[]>((all, c) => {
    if (/\p{M}/u.test(c) && all.length > 0) all[all.length - 1] += c;
    else all.push(c);
    return all;
  }, []);
  if (letters.length === 0 || !'αεηιουωρ'.includes(letters[0][0].toLowerCase())) return undefined;
  const marks = letters.slice(0, 2).join('');
  return marks.includes(ROUGH) ? 'Rough' : marks.includes(SMOOTH) ? 'Smooth' : undefined;
}

/** Rough or smooth: the breathing on the first letter of a word of the passage. */
export function buildBreathing(idea: GrammarIdea, passage: readonly Chapter[], random: Random): GrammarQuestion {
  const spoken = [...wordsOf(passage, random), ...SAMPLE_WORDS.map((word) => ({ word }))];
  for (const s of spoken) {
    const breathing = breathingOf(s.word);
    if (!breathing) continue;
    return {
      kind: 'breathing',
      ideaId: idea.id,
      prompt: `Which breathing does ${s.word} begin with?`,
      options: ['Rough', 'Smooth'],
      near: [breathing === 'Rough' ? 'Smooth' : 'Rough'],
      right: breathing,
      ...shown(s),
      facet: breathingFacet(breathing),
    };
  }
  throw new Error('No word to ask the breathing of');
}

// ---- When the passage has no form of the idea ----

const BLANK = '___';
/** Words of a title or term that say nothing of the idea, so they stay in the text. */
const PLAIN_NAME_WORDS = new Set(['greek', 'word', 'words', 'form', 'forms', 'letter', 'letters', 'under', 'never', 'change', 'small', 'with', 'from', 'that']);
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The stem of a content word of an idea's name: 'participles' and 'spellings' give 'participle' and 'spell', so every wording of the word is found. */
const contentStem = (word: string): string => {
  const stem = word.replace(/(?:ing|ed|es|s)$/, '');
  return stem.length >= 5 ? stem : word.replace(/s$/, '');
};

/** Each content word (four letters or more, not a plain one) of the idea's title and terms, as a stem. */
function nameStems(idea: GrammarIdea): string[] {
  const words = [idea.title, ...idea.terms].flatMap((name) => name.toLowerCase().match(/\p{L}+/gu) ?? []);
  return [...new Set(words.filter((w) => w.length >= 4 && !PLAIN_NAME_WORDS.has(w)).map(contentStem))];
}

/** `text` with the idea's own name taken out (blankedText's work). */
function blankOut(idea: GrammarIdea, text: string): string {
  const secrets = [idea.title, idea.title.replace(/^The /, ''), ...idea.terms, ...nameStems(idea)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\w*(?:${secrets.map(escapeRegExp).join('|')})\\w*`, 'giu');
  const blanked = text.replace(/\s*\(say [^)]*\)/gi, '').replace(pattern, BLANK);
  // an idea named by a Greek word (the preposition εἰς) loses it too, whatever its accent or breathing ('ὑπό' and 'ὑπὸ')
  const greek = [...new Set((idea.title.match(/\p{Script=Greek}+/gu) ?? []).map((w) => w.normalize('NFD').replace(/\p{M}/gu, '')))];
  if (greek.length === 0) return blanked;
  const greekPattern = new RegExp(`(?:${greek.map((w) => [...w].join('\\p{M}*')).join('|')})\\p{M}*`, 'giu');
  return blanked.normalize('NFD').replace(greekPattern, BLANK).normalize('NFC');
}

/**
 * What the idea says of itself with its own name taken out (mw-86e9r1.3, .25): the pronunciation hint '(say AIR-ist)' goes, and the title, the terms
 * and every content word of both become a blank, the whole word with them ('pronoun' for the term 'noun', 'Hebrew' for 'Hebrew words'), so the text no longer
 * hands over its answer however it words the idea ('the middle and the passive', 'from Hebrew').
 */
export function blankedText(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation()): string {
  return blankOut(idea, ideaText(idea, scheme));
}

/**
 * What the concept question shows (mw-5r3p30.379): blankedText less every sentence that names a term only a later idea teaches, so a learner is never asked
 * about an idea in words he has not met. When no sentence is left the card's own first paragraph is used, which the card test holds to taught terms.
 */
export function conceptText(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation()): string {
  const kept = blankedText(idea, scheme).split(/(?<=[.!?])\s+/).filter((sentence) => laterTermsIn(sentence, idea).length === 0);
  return kept.length > 0 ? kept.join(' ') : blankOut(idea, teachOf(idea.id).whatItIs);
}

const titlesCache = new Map<string, GrammarIdea[]>();
/** The other ideas whose titles name no term that a later idea teaches than `idea`: the choices the concept question may offer. */
function titlesFor(idea: GrammarIdea): GrammarIdea[] {
  let found = titlesCache.get(idea.id);
  if (!found) {
    found = LADDER.filter((o) => o.id !== idea.id && laterTermsIn(o.title, idea).length === 0);
    titlesCache.set(idea.id, found);
  }
  return found;
}

/** Which idea this is, from what it says with its own name blanked: used only for an idea the passage gives no form of. */
export function buildConcept(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
  // the near misses are ideas of its own tier (another case for a case), the fillers any other; a title is offered only if it names no later term (the genitive is not a choice for the singular)
  const others = titlesFor(idea);
  const near = shuffle(others.filter((o) => o.tier === idea.tier), random).map((o) => o.title);
  const far = others.filter((o) => o.tier !== idea.tier).map((o) => o.title);
  return {
    kind: 'concept',
    ideaId: idea.id,
    prompt: `Which idea is this? ${conceptText(idea, scheme)}`,
    ...choicesOf({ right: idea.title, near, fillers: far }, random),
    right: idea.title,
    facet: MEANING,
  };
}

// ---- Any idea ----

/**
 * A question that drills `idea` over `passage`. A letter is asked by name or sound, and so is one diphthong, consonant pair or breathing (quickRound.ts); the sounds, the marks and the accents are asked of
 * letters and words; every other idea is asked as the ending of a form or the form to tap, whichever the first draw gives, then the
 * other when the passage cannot make the first; and an idea the passage has no form of is asked by what it says. Always gives a question. An ending is asked only
 * from a table in `tablesOpen` (buildEnding), so Review, which passes the tables he has opened, asks tap the form until he has opened the table.
 */
export function buildIdeaQuestion(
  idea: GrammarIdea,
  passage: readonly Chapter[],
  random: Random,
  respell?: Respell,
  scheme: Pronunciation = chosenPronunciation(),
  tablesOpen: ReadonlySet<string> = EVERY_TABLE,
  graded?: readonly GradedVerse[],
  strong = false,
): GrammarQuestion {
  const said = respell ?? scheme.respell;
  // one diphthong, consonant pair or breathing (mw-hqd5bz.18): heard or seen, as the quick round asks it
  if (idea.parent) return quickQuestion({ id: idea.id, mode: random() < 0.5 ? 'hear' : 'see' }, random, scheme);
  if (idea.glyphs || idea.id === 'alphabet') return random() < 0.5 ? buildLetter(idea, random, scheme) : buildSound(idea, random, scheme);
  if (idea.id.startsWith('preposition-')) return buildPreposition(idea, random);
  if (idea.id === 'compound-verbs') return buildCompound(idea, random);
  switch (idea.id) {
    case 'diphthongs':
      return buildPairs(idea, 'diphthongs', 'vowels', random, scheme);
    case 'consonant-pairs':
      return buildPairs(idea, 'consonant-pairs', 'consonants', random, scheme);
    case 'syllables':
      return buildSyllables(idea, passage, random, said);
    case 'breathings':
      return buildBreathing(idea, passage, random);
    case 'accents':
      return buildStress(idea, passage, random, said);
    case 'iota-subscript':
      return buildSubscript(idea, random);
    case 'punctuation':
      return buildPunctuation(idea, random);
    case 'movable-letters':
      return buildMovable(idea, random);
    case 'marks-change-word':
      return buildMarksChangeWord(idea, random);
    case 'enclitics':
      return buildEnclitic(idea, random);
    case 'words-sound-alike':
      return buildSoundAlike(idea, random, scheme);
  }
  // Review hands the graded verses (mw-emk3xt.2): there a word idea is also asked what a chunk says, and (mw-emk3xt.3) who does what to whom for the ideas of a subject, verb and object, and, for a `strong`
  // idea (a step of SOLID_STEP or more, PROVISIONAL), to parse a whole word; the placement and Drill it test the form alone. The first draw picks where the rotation starts.
  const first = random();
  const order: ((idea: GrammarIdea) => GrammarQuestion | null)[] = [];
  const ending = (i: GrammarIdea) => buildEnding(i, passage, random, tablesOpen);
  const tap = (i: GrammarIdea) => buildTapForm(i, passage, random);
  const meaning = (i: GrammarIdea) => buildMeaning(i, passage, random, graded);
  const roles = (i: GrammarIdea) => buildRoles(i, passage, random, graded);
  const parse = (i: GrammarIdea) => buildParse(i, passage, random, graded);
  if (!graded) order.push(...(first < 0.5 ? [ending, tap] : [tap, ending]));
  else {
    const kinds = [ending, tap, meaning, ...(ROLE_IDEAS.has(idea.id) ? [roles] : []), ...(strong ? [parse] : [])];
    const start = Math.floor(first * kinds.length);
    order.push(...kinds.slice(start), ...kinds.slice(0, start));
  }
  for (const build of order) {
    const question = build(idea);
    if (question) return question;
  }
  return buildConcept(idea, random, scheme);
}
