// src/data/grammar/drillItems.ts — the steps of Drill it for the ideas of the letters, sounds and marks tiers (mw-i7xe0n.1), pure. These ideas are
// built from their ITEMS (ladder.ts itemsOf: the 24 letters, the vowel pairs, the consonant pairs, the breathings), so the facets are the items: a miss
// names the letter, not 'the alphabet'. The alphabet's steps, easiest first: see a letter and pick its name; see a name and pick the letter; match a capital
// to its small letter; hear a letter (or see it and pick its sound) in the chosen pronunciation; read a short New Testament word and pick how it is said.
// A facet is a letter, or a pair of look-alikes (ν and υ, ρ and π) asked with both among the choices, so the pair he cannot tell apart is named.
// Sounds read the scheme (mw-5r3p30.229): quickRound.ts asks them, and a scheme that gives no sound is asked by ear. The prerequisites are assumed solid.
import type { Chapter } from '../chapter';
import { mulberry32, shuffle, type Random } from '../quiz';
import type { Pronunciation } from '../../speech/pronunciation';
import { itemFacet, itemsOf, ideaOf, type Facet, type GrammarIdea } from './ladder';
import { ideaSound } from './lessons';
import { quickQuestion } from './quickRound';
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
}

const OPTION_COUNT = 4;
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

/** Letters a reader mistakes for each other: by look (ν for υ, ρ for p, η for n, χ for x) or by the sound of the look-alike (ρ and π). */
const LOOKALIKES: readonly [string, string][] = [['nu', 'upsilon'], ['rho', 'pi'], ['eta', 'nu'], ['chi', 'xi'], ['omicron', 'omega']];

const matesOf = (letter: GrammarIdea): GrammarIdea[] =>
  LOOKALIKES.flatMap(([a, b]) => (key(letter) === a ? [ideaOf(`letter-${b}`)] : key(letter) === b ? [ideaOf(`letter-${a}`)] : []));

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
    ? LOOKALIKES.map(([a, b]): Subject[] => {
        const [x, y] = [ideaOf(`letter-${a}`), ideaOf(`letter-${b}`)];
        const facet: Facet = { id: `pair-${a}-${b}`, label: `${lower(x)} / ${lower(y)}` };
        return [{ facet, right: x, mate: y }, { facet, right: y, mate: x }];
      })
    : [];
  return [...single, ...both];
}

/** `count` letters to stand beside `right`: its look-alike first, then others at random, none repeated and none the answer. */
function beside(right: GrammarIdea, mate: GrammarIdea | undefined, random: Random, count = OPTION_COUNT - 1, skip: (o: GrammarIdea) => boolean = () => false): GrammarIdea[] {
  const others = shuffle(LETTER_IDEAS.filter((o) => o.id !== right.id && o.id !== mate?.id && !skip(o)), random);
  return [...(mate ? [mate] : []), ...others].slice(0, count);
}

const soundOf = (letter: GrammarIdea, scheme: Pronunciation): string => ideaSound(letter, scheme) ?? scheme.respell(lower(letter));

const seeName = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: 'What is this letter called?',
  options: shuffle([s.right, ...beside(s.right, s.mate, random)].map((l) => l.title), random),
  right: s.right.title,
  form: lower(s.right),
  say: lower(s.right),
  facet: s.facet,
});

const seeLetter = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: `Which letter is ${s.right.title}?`,
  options: shuffle([s.right, ...beside(s.right, s.mate, random)].map(lower), random),
  right: lower(s.right),
  facet: s.facet,
});

const seeCapital = (ctx: DrillContext, s: Subject, random: Random): GrammarQuestion => ({
  kind: 'letter',
  ideaId: ctx.idea.id,
  prompt: `Which small letter matches ${upper(s.right)}?`,
  options: shuffle([s.right, ...beside(s.right, s.mate, random)].map(lower), random),
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
    const apart = beside(s.right, s.mate, random, OPTION_COUNT - 1, (o) => soundOf(o, ctx.scheme) === soundOf(s.right, ctx.scheme));
    return {
      kind: 'sound',
      ideaId: ctx.idea.id,
      prompt: 'Hear it, then tap it',
      options: shuffle([s.right, ...apart].map(lower), random),
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
export const baseLetters = (text: string): string => [...text.normalize('NFD')].filter((c) => !/\p{M}/u.test(c)).map((c) => (c === 'ς' ? 'σ' : c.toLowerCase())).join('');

/** The words that hold `text` (a letter or a pair), the shortest first. */
export const wordsWith = (text: string, words: readonly string[] = WORDS): string[] =>
  words.filter((w) => baseLetters(w).includes(baseLetters(text))).sort((a, b) => baseLetters(a).length - baseLetters(b).length);

/** How a word is said, picked from four respellings of the chosen pronunciation; the others are other words of the list. */
function readWord(ctx: DrillContext, word: string, facet: Facet, random: Random): GrammarQuestion | null {
  const say = ctx.scheme.respell(word);
  const others = shuffle(WORDS.filter((w) => w !== word), random).map((w) => ctx.scheme.respell(w)).filter((r, i, all) => r !== say && all.indexOf(r) === i);
  if (others.length < OPTION_COUNT - 1) return null;
  return {
    kind: 'letter',
    ideaId: ctx.idea.id,
    prompt: 'How is this word said?',
    options: shuffle([say, ...others.slice(0, OPTION_COUNT - 1)], random),
    right: say,
    form: word,
    say: word,
    facet,
  };
}

// ---- The steps ----

function letterSteps(ctx: DrillContext, letters: readonly GrammarIdea[], pairs: boolean): RawStep[] {
  const subjects = subjectsOf(letters, pairs).flat();
  let n = 0;
  const each = (make: (s: Subject, v: number, random: Random) => GrammarQuestion | null): GrammarQuestion[] =>
    distinct(ctx, subjects.map((s, i) => make(s, i % VARIANTS, rng(ctx, (n += 1)))));
  const words = letters.flatMap((letter) =>
    wordsWith(lower(letter))
      .slice(0, VARIANTS)
      .map((word) => readWord(ctx, word, itemFacet(letter), rng(ctx, (n += 1)))),
  );
  return [
    { title: 'See a letter, pick its name', questions: each((s, _v, random) => seeName(ctx, s, random)) },
    { title: 'See a name, pick the letter', questions: each((s, _v, random) => seeLetter(ctx, s, random)) },
    { title: 'Match a capital to its small letter', questions: each((s, _v, random) => seeCapital(ctx, s, random)) },
    { title: 'Hear a letter and pick it, or see it and pick its sound', questions: each((s, v, random) => hearLetter(ctx, s, v, random)) },
    { title: 'Read a word and pick how it is said', questions: distinct(ctx, words) },
  ];
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
  const ask = (mode: 'see' | 'hear'): GrammarQuestion[] =>
    distinct(ctx, items.flatMap((item) => Array.from({ length: VARIANTS }, () => ({ ...quickQuestion({ id: item.id, mode }, rng(ctx, (n += 1)), ctx.scheme), facet: itemFacet(item) }))));
  const words = items.flatMap((item) => {
    const word = PAIR_WORDS[item.id];
    return word ? Array.from({ length: VARIANTS }, () => readWord(ctx, word, itemFacet(item), rng(ctx, (n += 1)))) : [];
  });
  return [
    { title: 'See it and pick its sound', questions: ask('see') },
    { title: 'Hear it and pick it', questions: ask('hear') },
    { title: 'Read a word that has it', questions: distinct(ctx, words) },
  ];
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
    return [{ kind: 'breathing', ideaId: ctx.idea.id, prompt: `Which breathing does ${word} begin with?`, options: ['Rough', 'Smooth'], right: breathing, form: word, say: word, facet: itemFacet(item) }];
  });
  return [
    { title: 'Find the breathing on a plain word', questions: distinct(ctx, easy) },
    { title: 'Find the breathing in a harder word', questions: distinct(ctx, hard) },
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
