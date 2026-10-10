// src/data/grammar/questions.ts — the questions that drill a grammar idea (mw-hqd5bz.6), pure: the ending of a form, the form to tap in
// a verse, a letter, the sound of a letter, the stressed syllable, the breathing, the syllables. Each builder takes the idea, the passage
// (the chapters of the goal, or the chapter he has open) and a random source, so a seed gives the same question twice; the placement
// uses the same builders. Nothing here touches the store or the screen. docs/grammar.md.
import type { Chapter, GreekWord, Verse } from '../chapter';
import { decodeParse, parseSegments, splitParse } from '../parseCode';
import { shuffle, type Random } from '../quiz';
import { MODERN } from '../../speech/schemes/modern';
import { LADDER, ideasOf, type GrammarIdea } from './ladder';
import { quickQuestion } from './quickRound';

export type GrammarKind = 'ending' | 'tap-form' | 'letter' | 'sound' | 'stress' | 'breathing' | 'syllables' | 'concept';

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
  /** the Greek that Hold to hear says (a letter, or the word) */
  say?: string;
}

/** The words of the pronunciation that gives the syllables: the chosen pronunciation's respell, 'hree-STO'. */
export type Respell = (word: string) => string;

const OPTION_COUNT = 4;
const nfc = (s: string): string => s.normalize('NFC');

// ---- The passage ----

interface Place {
  word: GreekWord;
  verse: Verse;
  /** '1 John 1:1' */
  ref: string;
}

function placesOf(passage: readonly Chapter[]): Place[] {
  return passage.flatMap((c) => c.verses.flatMap((verse) => verse.g.map((word) => ({ word, verse, ref: `${c.book} ${c.chapter}:${verse.n}` }))));
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

const pick = <T>(items: readonly T[], random: Random): T => items[Math.floor(random() * items.length)];

// ---- Tap the form ----

/** Every choice of `size` items from `items`, in order. */
function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

/**
 * The fewest terms, starting from the idea's own, that make the word the only one in its verse to have them all: more of its
 * features first, its part of speech last. Null when the verse has the word's text twice, or cannot tell it from another.
 */
function describe(idea: GrammarIdea, place: Place): string[] | null {
  const terms = termsOf(place.word.p);
  const [pos, ...features] = terms;
  if (place.verse.g.filter((g) => g.t === place.word.t).length > 1) return null;
  // an idea with no term of its own (the pronoun) is asked by the word's part of speech
  const seed = idea.terms.filter((t) => terms.includes(t));
  if (seed.length === 0) seed.push(pos);
  const extras = [...features.filter((t) => !seed.includes(t)), ...(seed.includes(pos) ? [] : [pos])];
  for (let size = 0; size <= extras.length; size += 1) {
    for (const added of combinations(extras, size)) {
      const chosen = [...seed, ...added];
      const holders = place.verse.g.filter((g) => {
        const has = termsOf(g.p);
        return chosen.every((t) => has.includes(t));
      });
      if (holders.length === 1) return terms.filter((t) => chosen.includes(t));
    }
  }
  return null;
}

/** 'Tap the dative article', 'Tap the word that is genitive singular', 'Tap the preposition'. */
function tapPrompt(terms: readonly string[], pos: string): string {
  const features = terms.filter((t) => t !== pos).join(' ');
  if (!terms.includes(pos)) return `Tap the word that is ${features}`;
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
    return {
      kind: 'tap-form',
      ideaId: idea.id,
      prompt: tapPrompt(terms, termsOf(place.word.p)[0]),
      options: place.verse.g.map((g) => g.t),
      right: place.word.t,
      ref: place.ref,
      code: place.word.p,
    };
  }
  return null;
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

/**
 * The stem the lemma and the form share and the ending after it: ἀρχή and ἀρχῆς share ἀρχ, ending ῆς. The stem keeps at least one
 * letter and the ending at least one, a stem vowel goes to the ending (λόγος, λόγου: λόγ + ου), and a form that is mostly ending has none.
 */
export function stemOf(lemma: string, form: string): { stem: string; ending: string } | null {
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

/** What a form of a word that inflects is: 'genitive singular feminine', 'present active indicative 3rd person singular'. */
const featuresOf = (code: string): string => splitParse(code).features.map((f) => f.value).join(' ');

const COMMON_ENDINGS: Record<'noun' | 'verb', string[]> = {
  noun: ['ος', 'ου', 'ῳ', 'ον', 'οι', 'ων', 'οις', 'ους', 'α', 'ης', 'ῃ', 'ην', 'ας', 'αις', 'ις', 'ι', 'ες', 'εως'],
  verb: ['ω', 'εις', 'ει', 'ομεν', 'ετε', 'ουσιν', 'ον', 'ες', 'ε', 'ομαι', 'εται', 'ονται', 'ῃ', 'α', 'ασιν'],
};

/**
 * The ending of a form from the passage: the form with its ending blanked ('ἀρχ_'), what the form is ('genitive singular feminine of ἀρχή') and
 * four endings. Three wrong endings are the endings of other inflected words of the same part of speech in the passage; a passage that
 * has too few lends the common endings. Null when the idea has no form in the passage that shares a stem with its dictionary form.
 */
export function buildEnding(idea: GrammarIdea, passage: readonly Chapter[], random: Random): GrammarQuestion | null {
  const places = placesOf(passage).filter((p) => splitParse(p.word.p).features.length > 0);
  const stems = (p: Place) => stemOf(p.word.l, p.word.t);
  const candidates = shuffle(places.filter((p) => needsIdea(p.word.p, idea.id) && stems(p)), random);
  const place = candidates[0];
  if (!place) return null;
  const { stem, ending } = stems(place)!;
  const pos = splitParse(place.word.p).pos;
  const sameKind = shuffle(
    places.filter((p) => splitParse(p.word.p).pos === pos),
    random,
  ).flatMap((p) => stems(p)?.ending ?? []);
  const wrong: string[] = [];
  const taken = new Set([keyOf(ending)]);
  for (const e of [...sameKind, ...shuffle(COMMON_ENDINGS[pos === 'verb' ? 'verb' : 'noun'], random)]) {
    if (wrong.length === OPTION_COUNT - 1) break;
    if (taken.has(keyOf(e))) continue;
    taken.add(keyOf(e));
    wrong.push(nfc(e));
  }
  return {
    kind: 'ending',
    ideaId: idea.id,
    prompt: `Fill in the ending: ${featuresOf(place.word.p)} of ${place.word.l}`,
    options: shuffle([ending, ...wrong], random),
    right: ending,
    ref: place.ref,
    form: `${stem}_`,
    code: place.word.p,
  };
}

// ---- Letters and sounds ----

const LETTER_IDEAS = LADDER.filter((i) => i.glyphs);
const glyphOf = (idea: GrammarIdea): string => idea.glyphs?.[0] ?? '';

/** The letter an idea is about; the alphabet is about any of them. */
const letterOf = (idea: GrammarIdea, random: Random): GrammarIdea => (idea.glyphs ? idea : pick(LETTER_IDEAS, random));

/** Four glyphs: `right` and three others from `others`, shuffled. */
const glyphs = (right: string, others: readonly string[], random: Random): string[] =>
  shuffle([right, ...shuffle(others, random).slice(0, OPTION_COUNT - 1)], random);

/**
 * A letter: 'Which letter is Beta?' or 'Which letter sounds like v, as in “vase”?', over four glyphs. A letter that sounds like another (η ι υ,
 * ο ω) is never offered beside it when the sound is asked.
 */
export function buildLetter(idea: GrammarIdea, random: Random): GrammarQuestion {
  const letter = letterOf(idea, random);
  const bySound = random() < 0.5;
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && (!bySound || o.sound !== letter.sound));
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: bySound ? `Which letter sounds like ${letter.sound}?` : `Which letter is ${letter.title}?`,
    options: glyphs(glyphOf(letter), others.map(glyphOf), random),
    right: glyphOf(letter),
  };
}

/** Which letter he hears: Hold to hear says it, and no other letter of its sound is among the four glyphs. */
export function buildSound(idea: GrammarIdea, random: Random): GrammarQuestion {
  const letter = letterOf(idea, random);
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && o.sound !== letter.sound);
  return {
    kind: 'sound',
    ideaId: idea.id,
    prompt: 'Hold to hear a letter, then tap it',
    options: glyphs(glyphOf(letter), others.map(glyphOf), random),
    right: glyphOf(letter),
    say: glyphOf(letter),
  };
}

// [pair, sound] — one pair for each sound, from the sounds ideas' text
const DIPHTHONGS: [string, string][] = [['αι', 'e, as in “bed”'], ['ει', 'ee, as in “feet”'], ['ου', 'oo, as in “food”'], ['αυ', 'av or af'], ['ευ', 'ev or ef']];
const CONSONANT_PAIRS: [string, string][] = [['μπ', 'mb'], ['ντ', 'nd'], ['γκ', 'ng'], ['γχ', 'ng and kh']];
const PUNCTUATION: [string, string][] = [['Which mark is a question mark in Greek?', ';'], ['Which mark is a colon or a semicolon in Greek?', '·']];

/** A question over a short table of marks: the right one and the others of the table, then fillers up to four. */
function fromTable(idea: GrammarIdea, prompt: string, right: string, others: readonly string[], random: Random): GrammarQuestion {
  return { kind: 'letter', ideaId: idea.id, prompt, options: glyphs(right, others, random), right };
}

function buildPairs(idea: GrammarIdea, table: readonly [string, string][], what: string, random: Random): GrammarQuestion {
  const [pair, sound] = pick(table, random);
  return fromTable(idea, `Which pair of ${what} sounds like ${sound}?`, pair, table.map(([p]) => p).filter((p) => p !== pair), random);
}

function buildSubscript(idea: GrammarIdea, random: Random): GrammarQuestion {
  return fromTable(idea, 'Which letter has a tiny iota under it?', pick(['ᾳ', 'ῃ', 'ῳ'], random), ['α', 'η', 'ω', 'ι', 'ο'], random);
}

function buildPunctuation(idea: GrammarIdea, random: Random): GrammarQuestion {
  const [prompt, right] = pick(PUNCTUATION, random);
  return fromTable(idea, prompt, right, [';', '·', '.', ','].filter((m) => m !== right), random);
}

// ---- Words: stress, syllables, breathing ----

/** Words to ask about when the passage has none that will do. */
const SAMPLE_WORDS = ['λόγος', 'ἀγάπη', 'θεός', 'ἄνθρωπος', 'ζωή', 'ἅγιος', 'ὕδωρ', 'ἐν', 'ὁ', 'εὑρίσκω'];

const DEFAULT_RESPELL: Respell = MODERN.respell;

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
      right: parts.syllables[parts.stressed],
      ...shown(s),
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
      right: String(count),
      ...shown(s),
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
      right: breathing,
      ...shown(s),
    };
  }
  throw new Error('No word to ask the breathing of');
}

// ---- When the passage has no form of the idea ----

/** Which idea this is, from what it says: used only for an idea the passage gives no form of. */
export function buildConcept(idea: GrammarIdea, random: Random): GrammarQuestion {
  const near = shuffle(LADDER.filter((o) => o.id !== idea.id && o.tier === idea.tier), random);
  const far = shuffle(LADDER.filter((o) => o.id !== idea.id && o.tier !== idea.tier), random);
  return {
    kind: 'concept',
    ideaId: idea.id,
    prompt: `Which idea is this? ${idea.text}`,
    options: shuffle([idea.title, ...[...near, ...far].slice(0, OPTION_COUNT - 1).map((o) => o.title)], random),
    right: idea.title,
  };
}

// ---- Any idea ----

/**
 * A question that drills `idea` over `passage`. A letter is asked by name or sound, and so is one diphthong, consonant pair or breathing (quickRound.ts); the sounds, the marks and the accents are asked of
 * letters and words; every other idea is asked as the ending of a form or the form to tap, whichever the first draw gives, then the
 * other when the passage cannot make the first; and an idea the passage has no form of is asked by what it says. Always gives a question.
 */
export function buildIdeaQuestion(idea: GrammarIdea, passage: readonly Chapter[], random: Random, respell: Respell = DEFAULT_RESPELL): GrammarQuestion {
  // one diphthong, consonant pair or breathing (mw-hqd5bz.18): heard or seen, as the quick round asks it
  if (idea.parent) return quickQuestion({ id: idea.id, mode: random() < 0.5 ? 'hear' : 'see' }, random);
  if (idea.glyphs || idea.id === 'alphabet') return random() < 0.5 ? buildLetter(idea, random) : buildSound(idea, random);
  switch (idea.id) {
    case 'diphthongs':
      return buildPairs(idea, DIPHTHONGS, 'vowels', random);
    case 'consonant-pairs':
      return buildPairs(idea, CONSONANT_PAIRS, 'consonants', random);
    case 'syllables':
      return buildSyllables(idea, passage, random, respell);
    case 'breathings':
      return buildBreathing(idea, passage, random);
    case 'accents':
      return buildStress(idea, passage, random, respell);
    case 'iota-subscript':
      return buildSubscript(idea, random);
    case 'punctuation':
      return buildPunctuation(idea, random);
  }
  const endingFirst = random() < 0.5;
  const builders = endingFirst ? [buildEnding, buildTapForm] : [buildTapForm, buildEnding];
  for (const build of builders) {
    const question = build(idea, passage, random);
    if (question) return question;
  }
  return buildConcept(idea, random);
}
