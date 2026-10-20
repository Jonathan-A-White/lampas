// src/data/grammar/drillItems.ts — the steps of Drill it for the ideas of the letters, sounds and marks tiers (mw-i7xe0n.1), pure. These ideas are
// built from their ITEMS (ladder.ts itemsOf: the 24 letters, the vowel pairs, the consonant pairs, the breathings), so the facets are the items: a miss
// names the letter, not 'the alphabet'. The alphabet's steps, easiest first: see a letter and pick its name; see a name and pick the letter; match a capital
// to its small letter; hear a letter (or see it and pick its sound) in the chosen pronunciation; read a short New Testament word and pick how it is said.
// A facet is a letter, or a pair of look-alikes (ν and υ, ρ and π) asked with both among the choices, so the pair he cannot tell apart is named.
// Sounds read the scheme (mw-5r3p30.229): quickRound.ts asks them, and a scheme that gives no sound is asked by ear. The prerequisites are assumed solid.
// A letter or pair whose sound the scheme changes by the next letter (mw-i7xe0n.7: χ is kh before α, hy before ε) reads words of BOTH sides of the rule, each
// offered beside itself misread by the rule, with the rule's line for a wrong pick; drilled for its own idea, each side is a facet (drillIt.ts proves it only
// when both were answered right). Every choice is built by ../choices.ts, near misses first.
// The words a step reads come from his passage first (mw-i7xe0n.8: the dictionary forms of the verses he holds, short and common first), the fixed lists
// below only to fill what the passage lacks, and a drill reads a word once while another that fits exists (the rarest letters choose first).
import type { Chapter } from '../chapter';
import { LOOK_ALIKE_LETTERS, OPTION_COUNT, choicesOf, lookAlikesOf } from '../choices';
import { mulberry32, type Random } from '../quiz';
import { soundRuleOf, soundRulesOf, type Pronunciation, type SoundRule, type SoundRuleSide } from '../../speech/pronunciation';
import { itemFacet, itemsOf, ideaOf, type Facet, type GrammarIdea } from './ladder';
import { ideaSound } from './lessons';
import { quickQuestion } from './quickRound';
import { positionRule, ruleWordQuestion } from './ruleWord';
import {
  MOVABLE_FACETS,
  breathingOf,
  buildEnclitic,
  buildMarksChangeWord,
  buildMovable,
  buildPunctuation,
  buildStress,
  buildSubscript,
  buildSyllables,
  type GrammarQuestion,
} from './questions';

/** What a step builder is given. */
export interface DrillContext {
  idea: GrammarIdea;
  passage: readonly Chapter[];
  scheme: Pronunciation;
  /** the drill's seed: the same seed gives the same questions */
  seed: number;
}

/** The questions of one step before they are numbered: its title says what is asked in it. */
export interface RawStep {
  title: string;
  questions: GrammarQuestion[];
  /** a step of words to read: a first miss there asks the same target with another word at the same step (mw-i7xe0n.12) */
  words?: true;
}

/** Questions made for one facet in one step, with different wrong choices. */
const VARIANTS = 2;

export const rng = (ctx: DrillContext, n: number): Random => mulberry32((Math.imul(ctx.seed >>> 0, 104729) + n * 7919) >>> 0);

/** What makes two questions the same question. */
export const questionKey = (q: GrammarQuestion): string => [q.kind, q.prompt, q.form ?? '', q.right, [...q.options].sort().join('|')].join('¦');

/** Questions from `make` over `tries` seeds, the same question once, each for the idea being drilled. */
export function collect(ctx: DrillContext, make: (random: Random) => GrammarQuestion | null, tries: number, offset = 0): GrammarQuestion[] {
  const seen = new Set<string>();
  const out: GrammarQuestion[] = [];
  for (let n = 0; n < tries; n += 1) {
    const q = make(rng(ctx, offset + n));
    if (!q) continue;
    const key = questionKey(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...q, ideaId: ctx.idea.id });
  }
  return out;
}

/** The questions of a list of makers, the same question once. */
function distinct(ctx: DrillContext, questions: readonly (GrammarQuestion | null)[]): GrammarQuestion[] {
  const seen = new Set<string>();
  return questions.flatMap((q) => {
    if (!q || seen.has(questionKey(q))) return [];
    seen.add(questionKey(q));
    return [{ ...q, ideaId: ctx.idea.id }];
  });
}

// ---- Letters ----

const LETTER_IDEAS = itemsOf('alphabet');
const lower = (letter: GrammarIdea): string => letter.glyphs?.[0] ?? '';
const upper = (letter: GrammarIdea): string => letter.glyphs?.[1] ?? '';
const key = (letter: GrammarIdea): string => letter.id.replace(/^letter-/, '');

/** The letters a reader mistakes this one for (../choices.ts LOOK_ALIKE_LETTERS). */
const matesOf = (letter: GrammarIdea): GrammarIdea[] => lookAlikesOf(letter.id).map(ideaOf);

/** A letter, or two look-alikes asked together: `right` is the one asked, `mate` the one it must be told from. */
interface Subject {
  facet: Facet;
  right: GrammarIdea;
  mate?: GrammarIdea;
}

/** The subjects of a set of letters: each letter (with a look-alike among its choices when it has one), and, when `pairs`, each pair of look-alikes. */
function subjectsOf(letters: readonly GrammarIdea[], pairs: boolean): Subject[][] {
  const single = letters.map((letter): Subject[] => {
    const mates = matesOf(letter);
    return Array.from({ length: VARIANTS }, (_, v): Subject => ({ facet: itemFacet(letter), right: letter, mate: mates.length > 0 ? mates[v % mates.length] : undefined }));
  });
  const both = pairs
    ? LOOK_ALIKE_LETTERS.map(([a, b]): Subject[] => {
        const [x, y] = [ideaOf(a), ideaOf(b)];
        const facet: Facet = { id: `pair-${key(x)}-${key(y)}`, label: `${lower(x)} / ${lower(y)}` };
        return [{ facet, right: x, mate: y }, { facet, right: y, mate: x }];
      })
    : [];
  return [...single, ...both];
}

/** The choices of a letter question, each letter as `show` gives it: the letter asked, its look-alike (the near miss), then others at random (choices.ts). */
function letterChoices(s: Subject, show: (l: GrammarIdea) => string, random: Random, skip: (o: GrammarIdea) => boolean = () => false): Pick<GrammarQuestion, 'options' | 'near'> {
  const { options, near } = choicesOf({ right: s.right, near: s.mate ? [s.mate] : [], fillers: LETTER_IDEAS.filter((o) => !skip(o)), keyOf: show }, random);
  return { options: options.map(show), near: near.map(show) };
}

const soundOf = (letter: GrammarIdea, scheme: Pronunciation): string => ideaSound(letter, scheme) ?? scheme.respell(lower(letter));

const seeName = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: 'What is this letter called?',
  ...letterChoices(s, (l) => l.title, random),
  right: s.right.title,
  form: lower(s.right),
  say: lower(s.right),
  facet: s.facet,
});

const seeLetter = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: `Which letter is ${s.right.title}?`,
  ...letterChoices(s, lower, random),
  right: lower(s.right),
  facet: s.facet,
});

const seeCapital = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: `Which small letter matches ${upper(s.right)}?`,
  ...letterChoices(s, lower, random),
  right: lower(s.right),
  form: upper(s.right),
  facet: s.facet,
});

/**
 * Hear a letter and pick it, or see it and pick its sound (quickRound.ts); for two look-alikes, hear and pick with both among the choices, which a pair that
 * sounds alike in the scheme cannot be (asked by ear it would have two right answers), so there is none.
 */
function hearLetter(ctx: DrillContext, s: Subject, variant: number, random: Random): GrammarQuestion | null {
  if (s.facet.id.startsWith('pair-')) {
    if (!s.mate || soundOf(s.right, ctx.scheme) === soundOf(s.mate, ctx.scheme)) return null;
    return {
      kind: 'sound',
      ideaId: ctx.idea.id,
      prompt: 'Hear it, then tap it',
      ...letterChoices(s, lower, random, (o) => o.id !== s.right.id && soundOf(o, ctx.scheme) === soundOf(s.right, ctx.scheme)),
      right: lower(s.right),
      say: lower(s.right),
      facet: s.facet,
    };
  }
  return { ...quickQuestion({ id: s.right.id, mode: variant % 2 === 0 ? 'hear' : 'see' }, random, ctx.scheme), ideaId: ctx.idea.id, facet: s.facet };
}

// ---- Words ----

/** Short New Testament words that between them hold all 24 letters; a step reads them. */
const WORDS = ['ἀγάπη', 'λόγος', 'θεός', 'ζωή', 'ξένος', 'ψυχή', 'φῶς', 'βίβλος', 'δόξα', 'κόσμος', 'πατήρ', 'ῥῆμα', 'υἱός', 'ὕδωρ', 'ὄνομα', 'χάρις', 'ἄνθρωπος'];

/** The base letters of a word, a final sigma as a sigma: 'ἄνθρωπος' is ανθρωποσ. */
export function baseLetters(text: string): string {
  // kept per text (mw-5r3p30.422): a drill sorts the passage's words by it once for every letter it asks
  let base = baseCache.get(text);
  if (base === undefined) {
    base = [...text.normalize('NFD')].filter((c) => !/\p{M}/u.test(c)).map((c) => (c === 'ς' ? 'σ' : c.toLowerCase())).join('');
    baseCache.set(text, base);
  }
  return base;
}

const baseCache = new Map<string, string>();

/** The words that hold `text` (a letter or a pair), the shortest first. */
export const wordsWith = (text: string, words: readonly string[] = WORDS): string[] =>
  words.filter((w) => baseLetters(w).includes(baseLetters(text))).sort((a, b) => baseLetters(a).length - baseLetters(b).length);

/** The facet of one side of a sound rule, when the drill is of the rule's own idea: 'letter-chi:soft', named by the scheme ('χ before ε, ι, η ...: hy'). */
export const sideFacet = (rule: SoundRule, side: SoundRuleSide): Facet => ({ id: `${rule.ideaId}:${side.id}`, label: side.label });

/**
 * How a word is said, picked from four respellings of the chosen pronunciation (mw-i7xe0n.7): the near misses are the word misread by each sound rule it
 * stands on (χάρις 'KHA-rees' beside 'HYA-rees'), the rule of `subject` (the letter or pair asked) first; the fillers are other words of the list. A wrong
 * pick names the rule of the word's side; drilled for the rule's own idea, that side is the question's facet.
 */
function readWord(ctx: DrillContext, word: string, facet: Facet, random: Random, subject?: string): GrammarQuestion | null {
  const say = ctx.scheme.respell(word);
  const own = subject === undefined ? undefined : soundRuleOf(ctx.scheme, subject);
  const rules = [...(own ? [own] : []), ...soundRulesOf(ctx.scheme).filter((r) => r !== own)].filter((r) => r.sideOf(word) !== null);
  const { options, near } = choicesOf({ right: say, near: rules.map((r) => r.misread(word)), fillers: WORDS.filter((w) => w !== word).map((w) => ctx.scheme.respell(w)) }, random);
  if (options.length < OPTION_COUNT) return null;
  const rule = rules[0];
  const side = rule?.sides.find((s) => s.id === rule.sideOf(word));
  return {
    kind: 'letter',
    ideaId: ctx.idea.id,
    prompt: 'How is this word said?',
    options,
    right: say,
    form: word,
    say: word,
    facet: side && rule.ideaId === ctx.idea.id ? sideFacet(rule, side) : facet,
    near,
    ...(side ? { rule: side.line } : {}),
  };
}

/** What a word is asked for: a letter, a pair or one side of a sound rule, and the words that fit it, best first. */
interface WordNeed {
  item: GrammarIdea;
  side?: SoundRuleSide;
  fits: string[];
}

/** The lemmas of the passage, with no mark that makes a pair of letters two sounds (a diaeresis), short first, then common first. */
export function passageWords(passage: readonly Chapter[]): string[] {
  const count = new Map<string, number>();
  for (const chapter of passage) for (const verse of chapter.verses) for (const word of verse.g) if (word.l) count.set(word.l, (count.get(word.l) ?? 0) + 1);
  return [...count.keys()]
    .filter((w) => !w.normalize('NFD').includes('\u0308'))
    .sort((a, b) => baseLetters(a).length - baseLetters(b).length || count.get(b)! - count.get(a)! || (a < b ? -1 : 1));
}

/** The words of the passage that hold `text` (a letter or pair) and pass `also`, then the fallback words only to fill what the passage lacks (VARIANTS words), none twice. */
const fitting = (ctx: DrillContext, text: string, fallback: readonly string[], also: (word: string) => boolean = () => true): string[] => {
  const base = baseLetters(text);
  const own = [...new Set(passageWords(ctx.passage).filter((w) => baseLetters(w).includes(base)).filter(also))];
  return [...new Set([...own, ...fallback.filter(also)].slice(0, Math.max(own.length, VARIANTS)))];
};

/** The text (letter or pair) of an item: 'ψ', 'ου'. */
const textOf = (item: GrammarIdea): string => item.glyphs?.[0] ?? item.pair ?? '';

/**
 * The needs of a set of items: one for each, or for each side of its sound rule when the scheme has one. `plain` gives an item's fixed words, the fallback.
 */
function needsOf(ctx: DrillContext, items: readonly GrammarIdea[], plain: (item: GrammarIdea) => readonly string[]): WordNeed[] {
  return items.flatMap((item): WordNeed[] => {
    const rule = soundRuleOf(ctx.scheme, item.id);
    if (!rule) return [{ item, fits: fitting(ctx, textOf(item), plain(item)) }];
    return rule.sides.map((side) => ({ item, side, fits: fitting(ctx, textOf(item), side.examples, (w) => rule.sideOf(w) === side.id) }));
  });
}

/** Words a drill's word step holds in all, shared among its needs (mw-i7xe0n.13): one letter keeps every word that fits, up to this many. */
const WORD_STEP_MAX = 12;

/**
 * The words to read for each need, a word read once in the whole drill while another that fits exists: the needs with the fewest words choose first, so a rare
 * letter keeps its few. A need keeps every word that fits, up to WORD_STEP_MAX shared among the needs and at least VARIANTS, so a Hint, which keeps the walk on
 * the step, never brings a word back while another that fits is unasked (mw-i7xe0n.13). A need whose words are all taken reads its best again, and one with
 * only one word reads it VARIANTS times.
 */
function assignWords(needs: readonly WordNeed[], once = VARIANTS): string[][] {
  const cap = Math.max(once, Math.floor(WORD_STEP_MAX / Math.max(1, needs.length)));
  const taken = new Set<string>();
  const given = needs.map((): string[] => []);
  [...needs.keys()]
    .sort((a, b) => needs[a].fits.length - needs[b].fits.length || a - b)
    .forEach((i) => {
      const { fits } = needs[i];
      given[i] = fits.filter((w) => !taken.has(w)).slice(0, cap);
      if (given[i].length === 0 && fits.length > 0) given[i] = Array.from({ length: fits.length === 1 ? once : 1 }, () => fits[0]);
      given[i].forEach((w) => taken.add(w));
    });
  return given;
}

// ---- The steps ----

/** Questions a step needs to ask each of them once before one comes round again. */
const STEP_MIN = 2;

/**
 * A step of words that holds fewer than STEP_MIN questions (his goal has no word with the letter, the fixed list one: mw-i7xe0n.14) gets questions of the
 * letter or pair made by `make`, none the same as one already in the drill, so the walk never asks its one word again.
 */
function filled(ctx: DrillContext, step: GrammarQuestion[], others: readonly GrammarQuestion[], make: (n: number, random: Random) => GrammarQuestion | null): GrammarQuestion[] {
  const seen = new Set([...step, ...others].map(questionKey));
  const out = [...step];
  for (let n = 0; n < 40 && out.length < STEP_MIN; n += 1) {
    const q = make(n, rng(ctx, 1000 + n));
    if (!q || seen.has(questionKey(q))) continue;
    seen.add(questionKey(q));
    out.push({ ...q, ideaId: ctx.idea.id });
  }
  return out;
}

function letterSteps(ctx: DrillContext, letters: readonly GrammarIdea[], pairs: boolean): RawStep[] {
  const subjects = subjectsOf(letters, pairs).flat();
  let n = 0;
  const each = (make: (s: Subject, v: number, random: Random) => GrammarQuestion | null): GrammarQuestion[] =>
    distinct(ctx, subjects.map((s, i) => make(s, i % VARIANTS, rng(ctx, (n += 1)))));
  const needs = needsOf(ctx, letters, (letter) => wordsWith(lower(letter)));
  const given = assignWords(needs);
  const words = needs.flatMap((need, i) => given[i].map((word) => readWord(ctx, word, itemFacet(need.item), rng(ctx, (n += 1)), need.item.id)));
  const steps: RawStep[] = [
    { title: 'See a letter, pick its name', questions: each((s, _v, random) => seeName(ctx, s, random)) },
    { title: 'See a name, pick the letter', questions: each((s, _v, random) => seeLetter(ctx, s, random)) },
    { title: 'Match a capital to its small letter', questions: each((s, _v, random) => seeCapital(ctx, s, random)) },
    { title: 'Hear a letter and pick it, or see it and pick its sound', questions: each((s, v, random) => hearLetter(ctx, s, v, random)) },
  ];
  const read = filled(ctx, distinct(ctx, words), steps.flatMap((s) => s.questions), (i, random) => hearLetter(ctx, subjects[i % subjects.length], i % VARIANTS, random));
  return [...steps, { title: 'Read a word and pick how it is said', questions: read, words: true }];
}

/** One word of the New Testament that holds each pair, to read. */
const PAIR_WORDS: Record<string, string> = {
  'diphthong-ai': 'καί',
  'diphthong-ei': 'εἰς',
  'diphthong-oi': 'οἶκος',
  'diphthong-ui': 'υἱός',
  'diphthong-ou': 'οὐρανός',
  'diphthong-au': 'αὐτός',
  'diphthong-eu': 'εὐθύς',
  'diphthong-eeu': 'ηὗρον',
  'pair-mp': 'πέμπω',
  'pair-nt': 'ἐντολή',
  'pair-gk': 'ἐγκρατής',
  'pair-gg': 'ἄγγελος',
  'pair-gch': 'ἔλεγχος',
  'pair-gks': 'σάλπιγξ',
};
export const PAIR_WORD_OF = PAIR_WORDS;

function pairSteps(ctx: DrillContext, items: readonly GrammarIdea[]): RawStep[] {
  let n = 0;
  // a pair whose sound changes by its place is never asked alone (ruleWord.ts): the first step shows it in a word of each side of its rule, marked
  const ruled = (item: GrammarIdea) => positionRule(item, soundRuleOf(ctx.scheme, item.id));
  const ask = (mode: 'see' | 'hear'): GrammarQuestion[] =>
    distinct(
      ctx,
      items
        .filter((item) => mode === 'hear' || !ruled(item))
        .flatMap((item) => Array.from({ length: VARIANTS }, () => ({ ...quickQuestion({ id: item.id, mode }, rng(ctx, (n += 1)), ctx.scheme), facet: itemFacet(item) }))),
    );
  // a pair with a sound rule reads words of both its sides; a word that only the fixed list has is read VARIANTS times, with other wrong choices
  const needs = needsOf(ctx, items, (item) => (PAIR_WORDS[item.id] ? [PAIR_WORDS[item.id]] : []));
  const given = assignWords(needs);
  const words = needs.flatMap((need, i) => given[i].map((w) => readWord(ctx, w, itemFacet(need.item), rng(ctx, (n += 1)), need.item.id)));
  const marked = needs.flatMap((need, i) => {
    const rule = ruled(need.item) ? soundRuleOf(ctx.scheme, need.item.id) : undefined;
    if (!rule || !need.side) return [];
    const facet = ctx.idea.id === need.item.id ? sideFacet(rule, need.side) : itemFacet(need.item);
    return given[i].map((w) => {
      const q = ruleWordQuestion(need.item, rule, need.side!, w, rng(ctx, (n += 1)), ctx.scheme);
      return q ? { ...q, facet } : null;
    });
  });
  const everyRuled = items.every((item) => ruled(item));
  const see = [...ask('see'), ...distinct(ctx, marked)];
  const steps: RawStep[] = [
    { title: everyRuled ? 'See it in a word and pick its sound' : 'See it and pick its sound', questions: see, ...(everyRuled ? { words: true as const } : {}) },
    { title: 'Hear it and pick it', questions: ask('hear') },
  ];
  const read = filled(ctx, distinct(ctx, words), steps.flatMap((s) => s.questions), (i, random) => {
    const item = items[i % items.length];
    return { ...quickQuestion({ id: item.id, mode: i % 2 === 0 ? 'see' : 'hear' }, random, ctx.scheme), facet: itemFacet(item) };
  });
  return [...steps, { title: 'Read a word that has it', questions: read, words: true }];
}

/** Words whose breathing is not on the first letter of a plain vowel: on the second of a pair, on a ρ, or on a capital. */
const HARD_BREATHING = ['οὗτος', 'αὐτός', 'εὐθύς', 'Ἰησοῦς', 'ῥῆμα', 'Ἑβραῖος', 'οὐρανός', 'αἷμα', 'Ἰωάννης', 'ὑπέρ'];

function breathingSteps(ctx: DrillContext, items: readonly GrammarIdea[]): RawStep[] {
  const wanted = new Set(items.map((i) => (i.id === 'breathing-rough' ? 'Rough' : 'Smooth')));
  const easy = items.flatMap((item, i) => collect({ ...ctx, seed: ctx.seed + i }, (random) => ({ ...quickQuestion({ id: item.id, mode: 'see' }, random, ctx.scheme), facet: itemFacet(item) }), 8));
  const hard = HARD_BREATHING.flatMap((word): GrammarQuestion[] => {
    const breathing = breathingOf(word);
    if (!breathing || !wanted.has(breathing)) return [];
    const item = ideaOf(breathing === 'Rough' ? 'breathing-rough' : 'breathing-smooth');
    return [{ kind: 'breathing', ideaId: ctx.idea.id, prompt: `Which breathing does ${word} begin with?`, options: ['Rough', 'Smooth'], right: breathing, near: [breathing === 'Rough' ? 'Smooth' : 'Rough'], form: word, say: word, facet: itemFacet(item) }];
  });
  return [
    { title: 'Find the breathing on a plain word', questions: distinct(ctx, easy) },
    { title: 'Find the breathing in a harder word', questions: distinct(ctx, hard), words: true },
  ];
}

// ---- Marks, tables ----

const rank = (q: GrammarQuestion): number => Number(q.facet?.id.split('-').pop()) || 0;

/** Questions grouped by word length (the syllables and the stress): a step for two syllables, then three, then longer. */
function byLength(ctx: DrillContext, make: (random: Random) => GrammarQuestion): RawStep[] {
  const questions = collect(ctx, make, 60);
  const lengths = [...new Set(questions.map(rank))].sort((a, b) => a - b);
  return lengths.map((length) => ({ title: length === 2 ? 'Words of two syllables' : length === 3 ? 'Words of three syllables' : 'Longer words', questions: questions.filter((q) => rank(q) === length).slice(0, 12) }));
}

export function perFacet(questions: readonly GrammarQuestion[], most: number): GrammarQuestion[] {
  const count = new Map<string, number>();
  return questions.filter((q) => {
    const id = q.facet?.id ?? '';
    count.set(id, (count.get(id) ?? 0) + 1);
    return count.get(id)! <= most;
  });
}

/** The steps of an idea of the letters, sounds and marks tiers, or null for any other idea (the preposition ideas, the nouns and the rest: drillIt.ts). */
export function itemSteps(ctx: DrillContext): RawStep[] | null {
  const { idea, passage, scheme } = ctx;
  const respell = scheme.respell;
  if (idea.id === 'alphabet') return letterSteps(ctx, LETTER_IDEAS, true);
  if (idea.glyphs) return letterSteps(ctx, [idea], false);
  if (idea.id === 'diphthongs' || idea.id === 'consonant-pairs') return pairSteps(ctx, itemsOf(idea.id));
  if (idea.parent === 'diphthongs' || idea.parent === 'consonant-pairs') return pairSteps(ctx, [idea]);
  if (idea.id === 'breathings') return breathingSteps(ctx, itemsOf('breathings'));
  if (idea.parent === 'breathings') return breathingSteps(ctx, [idea]);
  switch (idea.id) {
    case 'syllables':
      return byLength(ctx, (random) => buildSyllables(idea, passage, random, respell));
    case 'accents':
      return byLength(ctx, (random) => buildStress(idea, passage, random, respell));
    case 'iota-subscript':
      return [{ title: 'Find the iota under a letter', questions: perFacet(collect(ctx, (random) => buildSubscript(idea, random), 20), 4) }];
    case 'punctuation':
      return [{ title: 'Know the small marks', questions: perFacet(collect(ctx, (random) => buildPunctuation(idea, random), 20), 4) }];
    case 'movable-letters': {
      const all = collect(ctx, (random) => buildMovable(idea, random), 60);
      const first: string[] = [MOVABLE_FACETS.not.id, MOVABLE_FACETS.out.id];
      return [
        { title: 'οὐ, οὐκ and οὐχ; ἐκ and ἐξ', questions: all.filter((q) => first.includes(q.facet?.id ?? '')) },
        { title: 'A dropped vowel and a movable ν', questions: all.filter((q) => !first.includes(q.facet?.id ?? '')) },
      ];
    }
    case 'marks-change-word':
      return [{ title: 'Tell two words apart by their marks', questions: perFacet(collect(ctx, (random) => buildMarksChangeWord(idea, random), 80), 3) }];
    case 'enclitics':
      return [{ title: 'Know a word that leans on the one before it', questions: perFacet(collect(ctx, (random) => buildEnclitic(idea, random), 40), 3) }];
  }
  return null;
}
