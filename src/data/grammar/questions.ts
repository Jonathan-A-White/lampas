// src/data/grammar/questions.ts — the questions that drill a grammar idea (mw-hqd5bz.6), pure: the ending of a form, the form to tap in
// a verse, a letter, the sound of a letter, the stressed syllable, the breathing, the syllables. Each builder takes the idea, the passage
// (the chapters of the goal, or the chapter he has open) and a random source, so a seed gives the same question twice; the placement
// uses the same builders. Nothing here touches the store or the screen. docs/grammar.md. Every wrong choice comes from ../choices.ts, a near miss of the point
// the question tests first (mw-i7xe0n.7): a look-alike letter, the same word's other ending, the twin with the other mark, the preposition's other case.
import { bookOf } from '../books';
import { OPTION_COUNT, choicesOf, lookAlikesOf, pairMates } from '../choices';
import type { Chapter, GreekWord, Verse } from '../chapter';
import { decodeParse, parseSegments, splitParse } from '../parseCode';
import { shuffle, type Random } from '../quiz';
import { chosenPronunciation } from '../../speech/greek';
import type { Pronunciation } from '../../speech/pronunciation';
import { LADDER, itemFacet, itemsOf, ideasOf, type Facet, type GrammarIdea } from './ladder';
import { ideaSound, ideaText } from './lessons';
import { ENCLITIC_USES, MARK_PAIRS, blankWord } from './marks';
import { SOUND_ALIKE } from './soundAlike';
import { COMPOUND_VERBS, PREPOSITIONS, type CompoundVerb, type PrepCase, type VerseRef } from './prepositions';
import { quickQuestion } from './quickRound';

export type GrammarKind = 'ending' | 'tap-form' | 'letter' | 'sound' | 'stress' | 'breathing' | 'syllables' | 'preposition' | 'compound' | 'concept';

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
  /** the wrong options that are near misses of the point it tests (src/data/choices.ts, mw-i7xe0n.7): a Hint takes the others away first */
  near?: string[];
  /** the one line a wrong pick shows under the answer: the sound rule of the word's side, the scheme's ('χ before ε, ι, η ... is soft: hy ...') */
  rule?: string;
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

/** The facets of the questions about a passage (mw-i7xe0n.1): what the idea is, finding it in a verse, and its ending. */
export const MEANING: Facet = { id: 'meaning', label: 'What it is' };
export const SPOT: Facet = { id: 'spot', label: 'Finding it in a verse' };
export const ENDING: Facet = { id: 'ending', label: 'Its ending' };

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
    // the near misses are the verse's words that have all the prompt names but one (the genitive plural beside the genitive singular asked)
    const near = place.verse.g.filter((g) => g.t !== place.word.t && terms.filter((t) => !termsOf(g.p).includes(t)).length === 1).map((g) => g.t);
    return {
      kind: 'tap-form',
      ideaId: idea.id,
      prompt: tapPrompt(terms, termsOf(place.word.p)[0]),
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
 */
export function buildEnding(idea: GrammarIdea, passage: readonly Chapter[], random: Random): GrammarQuestion | null {
  const places = placesOf(passage).filter((p) => splitParse(p.word.p).features.length > 0);
  const stems = (p: Place) => stemOf(p.word.l, p.word.t);
  const candidates = shuffle(places.filter((p) => needsIdea(p.word.p, idea.id) && stems(p)), random);
  const place = candidates[0];
  if (!place) return null;
  const { stem, ending: plainEnding } = stems(place)!;
  const pos = splitParse(place.word.p).pos;
  const right = shownEnding(plainEnding, pos);
  const shownOf = (endings: readonly string[]) => endings.map((e) => shownEnding(e, pos));
  // the near misses are the same word's other endings in the passage (another case or tense of it), then other words' of its kind, then the common ones
  const sameWord = shuffle(places.filter((p) => p.word.l === place.word.l && p.word.p !== place.word.p), random).flatMap((p) => stems(p)?.ending ?? []);
  const sameKind = places.filter((p) => splitParse(p.word.p).pos === pos).flatMap((p) => stems(p)?.ending ?? []);
  const { options, near } = choicesOf(
    { right, near: shownOf(sameWord), fillers: shownOf(sameKind), lastResort: shownOf(shuffle(COMMON_ENDINGS[pos === 'verb' ? 'verb' : 'noun'], random)), keyOf: (e) => e.key },
    random,
  );
  return {
    kind: 'ending',
    ideaId: idea.id,
    prompt: `Fill in the ending: ${featuresOf(place.word.p)} of ${place.word.l}`,
    options: options.map((e) => e.text),
    near: near.map((e) => e.text),
    right: right.text,
    ref: place.ref,
    form: `${stem}_`,
    code: place.word.p,
    facet: ENDING,
  };
}

// ---- Letters and sounds ----

const LETTER_IDEAS = LADDER.filter((i) => i.glyphs);
const glyphOf = (idea: GrammarIdea): string => idea.glyphs?.[0] ?? '';

/** The letter an idea is about; the alphabet is about any of them. */
const letterOf = (idea: GrammarIdea, random: Random): GrammarIdea => (idea.glyphs ? idea : pick(LETTER_IDEAS, random));

/** Four glyphs: `right`, its near misses among `others` first (choices.ts), then others at random. */
const glyphs = (right: string, near: readonly string[], others: readonly string[], random: Random): Pick<GrammarQuestion, 'options' | 'near'> =>
  choicesOf({ right, near: near.filter((g) => others.includes(g)), fillers: others }, random);

/** The glyphs of the letters a reader mistakes `letter` for. */
const lookAlikeGlyphs = (letter: GrammarIdea): string[] => lookAlikesOf(letter.id).map((id) => glyphOf(LETTER_IDEAS.find((l) => l.id === id)!));

/** What a letter or pair sounds like in `scheme`: its lesson's sound, else the scheme's own respelling of it, so two that sound alike are never told apart by a missing lesson. */
const soundKey = (idea: GrammarIdea, scheme: Pronunciation): string => ideaSound(idea, scheme) ?? scheme.respell(glyphOf(idea) || (idea.pair ?? ''));

/**
 * A letter: 'Which letter is Beta?' or 'Which letter sounds like v, as in “vase”?' (the sound is the chosen pronunciation's, mw-5r3p30.229; a
 * scheme that gives none asks by name), over four glyphs. A letter that sounds like another (η ι υ, ο ω) is never offered beside it when the sound is asked.
 */
export function buildLetter(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
  const letter = letterOf(idea, random);
  const sound = ideaSound(letter, scheme);
  const bySound = random() < 0.5 && sound !== undefined;
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && (!bySound || ideaSound(o, scheme) !== sound));
  return {
    kind: 'letter',
    ideaId: idea.id,
    prompt: bySound ? `Which letter sounds like ${sound}?` : `Which letter is ${letter.title}?`,
    ...glyphs(glyphOf(letter), lookAlikeGlyphs(letter), others.map(glyphOf), random),
    right: glyphOf(letter),
    facet: itemFacet(letter),
  };
}

/** Which letter he hears: Tap to hear says it, and no other letter of its sound is among the four glyphs. */
export function buildSound(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
  const letter = letterOf(idea, random);
  const others = LETTER_IDEAS.filter((o) => o.id !== letter.id && soundKey(o, scheme) !== soundKey(letter, scheme));
  return {
    kind: 'sound',
    ideaId: idea.id,
    prompt: 'Tap to hear a letter, then tap it',
    ...glyphs(glyphOf(letter), lookAlikeGlyphs(letter), others.map(glyphOf), random),
    right: glyphOf(letter),
    say: glyphOf(letter),
    facet: itemFacet(letter),
  };
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

/**
 * What the idea says of itself with its own name taken out (mw-86e9r1.3, .25): the pronunciation hint '(say AIR-ist)' goes, and the title, the terms
 * and every content word of both become a blank, the whole word with them ('pronoun' for the term 'noun', 'Hebrew' for 'Hebrew words'), so the text no longer
 * hands over its answer however it words the idea ('the middle and the passive', 'from Hebrew').
 */
export function blankedText(idea: GrammarIdea, scheme: Pronunciation = chosenPronunciation()): string {
  const secrets = [idea.title, idea.title.replace(/^The /, ''), ...idea.terms, ...nameStems(idea)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\w*(?:${secrets.map(escapeRegExp).join('|')})\\w*`, 'giu');
  const blanked = ideaText(idea, scheme).replace(/\s*\(say [^)]*\)/gi, '').replace(pattern, BLANK);
  // an idea named by a Greek word (the preposition εἰς) loses it too, whatever its accent or breathing ('ὑπό' and 'ὑπὸ')
  const greek = [...new Set((idea.title.match(/\p{Script=Greek}+/gu) ?? []).map((w) => w.normalize('NFD').replace(/\p{M}/gu, '')))];
  if (greek.length === 0) return blanked;
  const greekPattern = new RegExp(`(?:${greek.map((w) => [...w].join('\\p{M}*')).join('|')})\\p{M}*`, 'giu');
  return blanked.normalize('NFD').replace(greekPattern, BLANK).normalize('NFC');
}

/** Which idea this is, from what it says with its own name blanked: used only for an idea the passage gives no form of. */
export function buildConcept(idea: GrammarIdea, random: Random, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
  // the near misses are ideas of its own tier (another case for a case), the fillers any other
  const near = shuffle(LADDER.filter((o) => o.id !== idea.id && o.tier === idea.tier), random).map((o) => o.title);
  const far = LADDER.filter((o) => o.id !== idea.id && o.tier !== idea.tier).map((o) => o.title);
  return {
    kind: 'concept',
    ideaId: idea.id,
    prompt: `Which idea is this? ${blankedText(idea, scheme)}`,
    ...choicesOf({ right: idea.title, near, fillers: far }, random),
    right: idea.title,
    facet: MEANING,
  };
}

// ---- Any idea ----

/**
 * A question that drills `idea` over `passage`. A letter is asked by name or sound, and so is one diphthong, consonant pair or breathing (quickRound.ts); the sounds, the marks and the accents are asked of
 * letters and words; every other idea is asked as the ending of a form or the form to tap, whichever the first draw gives, then the
 * other when the passage cannot make the first; and an idea the passage has no form of is asked by what it says. Always gives a question.
 */
export function buildIdeaQuestion(idea: GrammarIdea, passage: readonly Chapter[], random: Random, respell?: Respell, scheme: Pronunciation = chosenPronunciation()): GrammarQuestion {
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
  const endingFirst = random() < 0.5;
  const builders = endingFirst ? [buildEnding, buildTapForm] : [buildTapForm, buildEnding];
  for (const build of builders) {
    const question = build(idea, passage, random);
    if (question) return question;
  }
  return buildConcept(idea, random, scheme);
}
