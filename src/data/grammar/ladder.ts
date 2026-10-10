// src/data/grammar/ladder.ts — the grammar ladder (mw-hqd5bz.1): every idea of Greek grammar a reader of the New Testament meets,
// from the alphabet and its pronunciation up, easy first, and ideasOf(code): the ideas a word with that RP parsing code needs.
// Pure: no store and no screen. An idea's id is the item id of a spaced-schedule row of kind 'grammar' (IDEA_KIND), so the same
// back-off that drills words can drill an idea. The tiers and rungs are PROVISIONAL (docs/grammar.md); other stories key on the
// ids, so an id, once shipped, is not renamed.
import { GRAMMAR_CONCEPTS } from '../grammar-concepts';
import { GRAMMAR_TERMS, decodeParse, parseSegments, splitParse } from '../parseCode';

/** The kind string of a schedule row whose item is a grammar idea (src/data/repositories/reviews.ts). */
export const IDEA_KIND = 'grammar';

export const TIERS = ['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners'] as const;
export type Tier = (typeof TIERS)[number];

export interface GrammarIdea {
  /** 'alphabet', 'letter-alpha', 'case-genitive', 'tense-aorist', 'mood-participle' ... */
  id: string;
  /** 'The genitive case' */
  title: string;
  tier: Tier;
  /** The ladder's order, from 1, easy first; every idea rests on ideas of a lower rung. */
  rung: number;
  /** The GRAMMAR_TERMS this idea covers (parseCode.ts); a term belongs to exactly one idea. A letter covers none. */
  terms: string[];
  /** One short paragraph in plain words (under 80 words). */
  text: string;
  /** Ids of the ideas below it that it rests on. */
  needs: string[];
  /** A letter's lower and upper case. */
  glyphs?: [string, string];
  /** A letter's or a combination's sound, in the Modern Greek pronunciation (docs/pronunciation.md). */
  sound?: string;
  /** A combination item (mw-hqd5bz.18, PROVISIONAL): the group idea it belongs to ('diphthongs', 'consonant-pairs', 'breathings'). The 24 letters sit under 'alphabet' without it. */
  parent?: string;
  /** A combination's Greek, as it is written: 'ου', 'γγ'. */
  pair?: string;
}

/** Every token needs these, so ideasOf never lists them: 'alphabet' is the parent of the 24 letters. */
export const ALWAYS_NEEDED: readonly string[] = ['alphabet', 'breathings', 'accents'];

const wordCount = (text: string): number => text.trim().split(/\s+/).length;

/** The plain explanation of a term, from grammar-concepts.ts, with how it shows in Greek added when the whole stays under 80 words. */
function conceptText(term: string): string {
  const concept = GRAMMAR_CONCEPTS[term];
  if (!concept) throw new Error(`No grammar concept for ${JSON.stringify(term)}`);
  const both = `${concept.explanation} ${concept.greek}`;
  return wordCount(both) < 80 ? both : concept.explanation;
}

type Def = Omit<GrammarIdea, 'rung' | 'text'> & { text?: string };

// ---- The combinations (mw-hqd5bz.18, PROVISIONAL): one item per diphthong, consonant pair and breathing, under its group idea, as the letters sit under 'alphabet' ----

// [id suffix, pair, sound]. The sounds are Modern Greek's (docs/pronunciation.md).
const DIPHTHONG_ITEMS: [string, string, string][] = [
  ['ai', 'αι', 'e, as in “bed”'],
  ['ei', 'ει', 'ee, as in “feet”'],
  ['oi', 'οι', 'ee, as in “feet”'],
  ['ui', 'υι', 'ee, as in “feet”'],
  ['ou', 'ου', 'oo, as in “food”'],
  ['au', 'αυ', 'av or af'],
  ['eu', 'ευ', 'ev or ef'],
  ['eeu', 'ηυ', 'iv or if'],
];
const PAIR_ITEMS: [string, string, string][] = [
  ['mp', 'μπ', 'b at the start of a word, mb inside it'],
  ['nt', 'ντ', 'd at the start of a word, nd inside it'],
  ['gk', 'γκ', 'g at the start of a word, ng inside it'],
  ['gg', 'γγ', 'ng'],
  ['gch', 'γχ', 'ng and kh'],
  ['gks', 'γξ', 'nks'],
];

const pairItem = (parent: string, prefix: string, kind: string) => ([key, pair, sound]: [string, string, string]): Def => ({
  ...def(`${prefix}-${key}`, 'sounds', `The ${kind} ${pair}`, [], [parent], `${pair} is one of the ${kind === 'vowel pair' ? 'pairs of vowels' : 'pairs of consonants'}. In Modern Greek it sounds like ${sound}.`),
  parent,
  pair,
  sound,
});

const breathingItems = (): Def[] => [
  {
    ...def('breathing-rough', 'marks', 'The rough breathing', [], ['breathings'], 'The rough breathing (ʽ) sits over a vowel at the start of a word and adds an h sound in older Greek: ὁ is “ho”. In Modern Greek it is not said aloud, but you must know it when you see it.'),
    parent: 'breathings',
    pair: 'ʽ',
    sound: 'an h, which Modern Greek does not say',
  },
  {
    ...def('breathing-smooth', 'marks', 'The smooth breathing', [], ['breathings'], 'The smooth breathing (᾿) sits over a vowel at the start of a word and adds nothing: ἐν is “en”. It is the commoner of the two.'),
    parent: 'breathings',
    pair: '᾿',
    sound: 'nothing',
  },
];

const def = (id: string, tier: Tier, title: string, terms: string[], needs: string[], text?: string): Def => ({ id, tier, title, terms, needs, text });

// ---- The letters ----

// [id suffix, name, lower, upper, sound]. The sounds are Modern Greek's (docs/pronunciation.md), as an English reader says them.
const LETTERS: [string, string, string, string, string][] = [
  ['alpha', 'Alpha', 'α', 'Α', 'a, as in “father”'],
  ['beta', 'Beta', 'β', 'Β', 'v, as in “vase”'],
  ['gamma', 'Gamma', 'γ', 'Γ', 'gh, a soft throaty g; before e and i it is y, as in “yes”'],
  ['delta', 'Delta', 'δ', 'Δ', 'dh, the th of “this”'],
  ['epsilon', 'Epsilon', 'ε', 'Ε', 'e, as in “bed”'],
  ['zeta', 'Zeta', 'ζ', 'Ζ', 'z, as in “zoo”'],
  ['eta', 'Eta', 'η', 'Η', 'ee, as in “feet”'],
  ['theta', 'Theta', 'θ', 'Θ', 'th, as in “thin”'],
  ['iota', 'Iota', 'ι', 'Ι', 'ee, as in “feet”'],
  ['kappa', 'Kappa', 'κ', 'Κ', 'k, as in “kite”'],
  ['lambda', 'Lambda', 'λ', 'Λ', 'l, as in “lamp”'],
  ['mu', 'Mu', 'μ', 'Μ', 'm, as in “mother”'],
  ['nu', 'Nu', 'ν', 'Ν', 'n, as in “now”'],
  ['xi', 'Xi', 'ξ', 'Ξ', 'ks, as in “box”'],
  ['omicron', 'Omicron', 'ο', 'Ο', 'o, as in “lot”'],
  ['pi', 'Pi', 'π', 'Π', 'p, as in “pen”'],
  ['rho', 'Rho', 'ρ', 'Ρ', 'r, lightly rolled'],
  ['sigma', 'Sigma', 'σ', 'Σ', 's, as in “sun”'],
  ['tau', 'Tau', 'τ', 'Τ', 't, as in “top”'],
  ['upsilon', 'Upsilon', 'υ', 'Υ', 'ee, as in “feet”'],
  ['phi', 'Phi', 'φ', 'Φ', 'f, as in “fan”'],
  ['chi', 'Chi', 'χ', 'Χ', 'kh, like the ch of Scottish “loch”; before e and i it is a breathy h'],
  ['psi', 'Psi', 'ψ', 'Ψ', 'ps, as in “lips”'],
  ['omega', 'Omega', 'ω', 'Ω', 'o, as in “lot”, the same as omicron'],
];

const letterIdeas = (): Def[] =>
  LETTERS.map(([key, name, lower, upper, sound]) => ({
    ...def(`letter-${key}`, 'letters', name, [], ['alphabet'], letterText(name, lower, upper, sound, key)),
    glyphs: [lower, upper],
    sound,
  }));

function letterText(name: string, lower: string, upper: string, sound: string, key: string): string {
  const base = `${name} is written ${lower} in small letters and ${upper} as a capital. In Modern Greek it sounds like ${sound}.`;
  if (key === 'sigma') return `${base} At the end of a word it is written ς.`;
  if (key === 'upsilon') return `${base} On its own it is a vowel; after a, e or η it makes a diphthong.`;
  return base;
}

// ---- The ladder, in order; the rung of an idea is its place in this list ----

const NOUN_CASES = ['case-nominative', 'case-genitive', 'case-dative', 'case-accusative'];
const GENDERS = ['gender-masculine', 'gender-feminine', 'gender-neuter'];
const PERSONS_AND_NUMBERS = ['person-1st', 'person-2nd', 'person-3rd', 'number-singular', 'number-plural'];

const DEFS: Def[] = [
  // letters: the alphabet is the parent of its 24 letters
  def(
    'alphabet',
    'letters',
    'The Greek alphabet',
    [],
    [],
    'Greek has 24 letters, seven of them vowels (α ε η ι ο υ ω). Each has a small and a capital form and a name, such as alpha and beta, from which our word alphabet comes. Learn the letters first: every word in the New Testament is built from them, and from here on you will say each one aloud.',
  ),
  ...letterIdeas(),

  // sounds
  def(
    'diphthongs',
    'sounds',
    'Pairs of vowels',
    [],
    ['letter-alpha', 'letter-epsilon', 'letter-eta', 'letter-iota', 'letter-omicron', 'letter-upsilon'],
    'Some vowels pair up and make one sound: αι is e, ει, οι and υι are ee, and ου is oo. In αυ, ευ and ηυ the υ is a v or an f. If the first vowel carries the stress mark, or the second has two dots over it, they are two sounds, not one.',
  ),
  ...DIPHTHONG_ITEMS.map(pairItem('diphthongs', 'diphthong', 'vowel pair')),
  def(
    'consonant-pairs',
    'sounds',
    'Pairs of consonants',
    [],
    ['letter-mu', 'letter-nu', 'letter-pi', 'letter-tau', 'letter-gamma', 'letter-kappa', 'letter-chi', 'letter-xi'],
    'Some consonants team up. In the middle of a word μπ is mb, ντ is nd and γκ is ng; at the start they are b, d and g. γγ is ng, γχ is ng plus kh, and γξ is nks. A doubled consonant is said once.',
  ),
  ...PAIR_ITEMS.map(pairItem('consonant-pairs', 'pair', 'consonant pair')),
  def(
    'syllables',
    'sounds',
    'Syllables',
    [],
    ['diphthongs', 'consonant-pairs'],
    'A Greek word is said in syllables, each built round one vowel sound. A word has as many syllables as it has vowel sounds, counting a pair of vowels once. Cut the word after each vowel and let the following consonants go with the next syllable, as long as a Greek word could begin with them.',
  ),

  // marks
  def(
    'breathings',
    'marks',
    'Breathing marks',
    [],
    ['syllables'],
    'A word that begins with a vowel carries a small mark over it. The rough breathing (ʽ) adds an h sound at the start: ὁ is “ho”. The smooth breathing (᾿) adds nothing: ἐν is “en”. Words that begin with ρ always take a rough breathing, and so does υ.',
  ),
  ...breathingItems(),
  def(
    'accents',
    'marks',
    'Accents and stress',
    [],
    ['syllables'],
    'Most Greek words carry an accent mark over a vowel: the acute (ά), the grave (ὰ) or the circumflex (ᾶ). It shows which syllable to stress, and in Modern Greek the stressed syllable is simply said louder. You do not need to tell the three marks apart to read aloud: stress the syllable that carries one.',
  ),
  def(
    'iota-subscript',
    'marks',
    'The iota under a letter',
    [],
    ['letter-iota', 'letter-alpha', 'letter-eta', 'letter-omega'],
    'A tiny iota sometimes sits under α, η or ω: ᾳ, ῃ, ῳ. It is not said aloud, but it is part of the spelling, and it often marks a form, such as the dative case. Do not skip it when you copy a word out.',
  ),
  def(
    'punctuation',
    'marks',
    'Punctuation and small marks',
    [],
    ['accents'],
    'The comma and full stop are as in English. The semicolon (;) is a question mark, and a raised dot (·) is a colon or semicolon. An apostrophe shows a dropped vowel (elision): δι᾿ is δια with its last letter gone. Two dots over a vowel (the diaeresis) say it is not part of a pair.',
  ),

  // nouns, articles, cases, gender, adjectives
  def('noun', 'nouns', 'The noun', ['noun'], ['accents']),
  def('article', 'nouns', 'The article', ['article'], ['noun']),
  def('case-nominative', 'nouns', 'The nominative case', ['nominative'], ['noun']),
  def('case-accusative', 'nouns', 'The accusative case', ['accusative'], ['case-nominative']),
  def('case-genitive', 'nouns', 'The genitive case', ['genitive'], ['case-nominative']),
  def('case-dative', 'nouns', 'The dative case', ['dative'], ['case-genitive']),
  def('case-vocative', 'nouns', 'The vocative case', ['vocative'], ['case-nominative']),
  def('gender-masculine', 'nouns', 'The masculine gender', ['masculine'], ['noun']),
  def('gender-feminine', 'nouns', 'The feminine gender', ['feminine'], ['gender-masculine']),
  def('gender-neuter', 'nouns', 'The neuter gender', ['neuter'], ['gender-masculine']),
  def('adjective', 'nouns', 'The adjective', ['adjective'], ['noun', ...GENDERS]),
  def('comparative', 'nouns', 'The comparative', ['comparative'], ['adjective']),
  def('superlative', 'nouns', 'The superlative', ['superlative'], ['comparative']),
  def('numeral', 'nouns', 'Number words', ['numeral'], ['adjective']),
  def('proper-name', 'nouns', 'Proper names', ['proper name'], ['noun']),
  def('indeclinable', 'nouns', 'Words that never change', ['indeclinable', 'letter'], ['proper-name', 'case-genitive']),

  // pronouns: person and number come first, because I, you, he, we, you, they are where they are first met
  def('person-1st', 'pronouns', 'The first person', ['1st person'], ['noun']),
  def('person-2nd', 'pronouns', 'The second person', ['2nd person'], ['person-1st']),
  def('person-3rd', 'pronouns', 'The third person', ['3rd person'], ['person-2nd']),
  def('number-singular', 'pronouns', 'The singular', ['singular'], ['person-1st']),
  def('number-plural', 'pronouns', 'The plural', ['plural'], ['number-singular']),
  def(
    'pronoun',
    'pronouns',
    'The pronoun',
    [],
    ['noun', 'person-3rd', 'number-plural'],
    'A pronoun stands in for a noun: I, you, he, she, it, this, who. It saves repeating the noun. Example: in “Paul wrote, and he sent it”, he and it are pronouns. A Greek pronoun changes its ending for case, number and gender like a noun, and the personal ones also show person.',
  ),
  def('pronoun-personal', 'pronouns', 'The personal pronoun', ['personal pronoun'], ['pronoun', ...NOUN_CASES]),
  def('pronoun-demonstrative', 'pronouns', 'The demonstrative pronoun', ['demonstrative pronoun'], ['pronoun-personal', ...GENDERS]),
  def('pronoun-relative', 'pronouns', 'The relative pronoun', ['relative pronoun'], ['pronoun-demonstrative']),
  def('pronoun-interrogative', 'pronouns', 'The interrogative pronoun', ['interrogative pronoun'], ['pronoun-relative']),
  def('pronoun-indefinite', 'pronouns', 'The indefinite pronoun', ['indefinite pronoun'], ['pronoun-interrogative']),
  def('pronoun-reflexive', 'pronouns', 'The reflexive pronoun', ['reflexive pronoun'], ['pronoun-personal']),
  def('pronoun-possessive', 'pronouns', 'The possessive pronoun', ['possessive pronoun', 'possessor'], ['pronoun-reflexive']),
  def('pronoun-reciprocal', 'pronouns', 'The reciprocal pronoun', ['reciprocal pronoun'], ['pronoun-reflexive']),
  def('pronoun-correlative', 'pronouns', 'The correlative pronoun', ['correlative pronoun'], ['pronoun-relative', 'pronoun-demonstrative']),
  def(
    'pronoun-correlative-interrogative',
    'pronouns',
    'The correlative or interrogative pronoun',
    ['correlative or interrogative pronoun'],
    ['pronoun-correlative', 'pronoun-interrogative'],
  ),

  // prepositions
  def('preposition', 'prepositions', 'The preposition', ['preposition'], ['case-genitive', 'case-dative', 'case-accusative']),

  // verbs: person and number (above) first, then the six tenses, the voices, the moods
  def('verb', 'verbs', 'The verb', ['verb'], PERSONS_AND_NUMBERS),
  def('tense-present', 'verbs', 'The present tense', ['present'], ['verb']),
  def('tense-imperfect', 'verbs', 'The imperfect tense', ['imperfect'], ['tense-present']),
  def('tense-future', 'verbs', 'The future tense', ['future'], ['tense-present']),
  def('tense-aorist', 'verbs', 'The aorist tense', ['aorist'], ['tense-imperfect']),
  def('tense-perfect', 'verbs', 'The perfect tense', ['perfect'], ['tense-aorist']),
  def('tense-pluperfect', 'verbs', 'The pluperfect tense', ['pluperfect'], ['tense-perfect']),
  def('second-tenses', 'verbs', 'Second aorists and perfects', ['second'], ['tense-aorist', 'tense-perfect']),
  def('voice-active', 'verbs', 'The active voice', ['active'], ['verb']),
  def('voice-middle', 'verbs', 'The middle voice', ['middle'], ['voice-active']),
  def('voice-passive', 'verbs', 'The passive voice', ['passive'], ['voice-active']),
  def('voice-middle-or-passive', 'verbs', 'The middle or passive voice', ['middle or passive'], ['voice-middle', 'voice-passive']),
  def('voice-middle-deponent', 'verbs', 'The middle deponent', ['middle deponent'], ['voice-middle-or-passive']),
  def('voice-passive-deponent', 'verbs', 'The passive deponent', ['passive deponent'], ['voice-middle-deponent']),
  def('voice-middle-or-passive-deponent', 'verbs', 'The middle or passive deponent', ['middle or passive deponent'], ['voice-passive-deponent']),
  def('voice-middle-significance', 'verbs', 'A middle meaning in an active form', ['middle significance'], ['voice-middle']),
  def('voice-impersonal-active', 'verbs', 'The impersonal active', ['impersonal active'], ['voice-active']),
  def('voice-none', 'verbs', 'A verb with no voice', ['no voice'], ['voice-active']),
  def('mood-indicative', 'verbs', 'The indicative mood', ['indicative'], ['tense-present', 'voice-active']),
  def('mood-imperative', 'verbs', 'The imperative mood', ['imperative'], ['mood-indicative']),
  def('mood-subjunctive', 'verbs', 'The subjunctive mood', ['subjunctive'], ['mood-indicative']),
  def('mood-optative', 'verbs', 'The optative mood', ['optative'], ['mood-subjunctive']),
  def('mood-infinitive', 'verbs', 'The infinitive', ['infinitive'], ['mood-indicative']),
  def('mood-participle', 'verbs', 'The participle', ['participle'], ['mood-infinitive', ...NOUN_CASES, ...GENDERS, 'adjective']),
  def('mood-participle-imperative', 'verbs', 'The participle with the sense of a command', ['imperative-sense participle'], ['mood-participle', 'mood-imperative']),

  // conjunctions, particles and the rest
  def('conjunction', 'joiners', 'The conjunction', ['conjunction'], ['noun', 'verb']),
  def('particle', 'joiners', 'The particle', ['particle'], ['conjunction']),
  def('adverb', 'joiners', 'The adverb', ['adverb'], ['adjective', 'verb']),
  def('negative', 'joiners', 'The negative', ['negative'], ['particle']),
  def('interrogative', 'joiners', 'Words that ask a question', ['interrogative'], ['particle']),
  def('conditional', 'joiners', 'The conditional', ['conditional'], ['conjunction', 'mood-indicative', 'mood-subjunctive']),
  def('interjection', 'joiners', 'The interjection', ['interjection'], ['particle']),
  def('attic-form', 'joiners', 'Attic spellings', ['Attic form'], ['verb']),
  def('poetic', 'joiners', 'Poetic forms', ['poetic'], ['attic-form']),
  def('crasis', 'joiners', 'Two words run together', ['crasis'], ['conjunction', 'punctuation']),
  def('aramaic', 'joiners', 'Aramaic words', ['Aramaic word'], ['indeclinable']),
  def('hebrew', 'joiners', 'Hebrew words', ['Hebrew word'], ['indeclinable']),
];

/** The ladder, easy first. */
export const LADDER: readonly GrammarIdea[] = DEFS.map((d, i) => ({ ...d, rung: i + 1, text: d.text ?? conceptText(d.terms[0]) }));

const BY_ID = new Map<string, GrammarIdea>();
for (const idea of LADDER) {
  if (BY_ID.has(idea.id)) throw new Error(`Grammar idea ${idea.id} is listed twice`);
  BY_ID.set(idea.id, idea);
}
for (const idea of LADDER) {
  for (const need of idea.needs) {
    const below = BY_ID.get(need);
    if (!below || below.rung >= idea.rung) throw new Error(`Grammar idea ${idea.id} needs ${need}, which is not an idea of a lower rung`);
  }
}

const IDEA_OF_TERM = new Map<string, string>();
for (const idea of LADDER) {
  for (const term of idea.terms) {
    if (IDEA_OF_TERM.has(term)) throw new Error(`Grammar term ${JSON.stringify(term)} is covered by two ideas`);
    IDEA_OF_TERM.set(term, idea.id);
  }
}
for (const term of GRAMMAR_TERMS) {
  if (!IDEA_OF_TERM.has(term)) throw new Error(`Grammar term ${JSON.stringify(term)} has no idea`);
}

/** The groups whose items the quick round asks one by one, in the order they are named: the 24 letters, the diphthongs, the consonant pairs, the breathings. */
export const ITEM_GROUPS: readonly string[] = ['alphabet', 'diphthongs', 'consonant-pairs', 'breathings'];

/** The items of a group: the 24 letters of 'alphabet', or the combinations that name it as their parent; none for any other idea. */
export const itemsOf = (group: string): GrammarIdea[] => (group === 'alphabet' ? LADDER.filter((i) => i.glyphs) : LADDER.filter((i) => i.parent === group));

/** The group an item sits under ('alphabet' for a letter), or undefined for an idea that is no item. */
export const groupOfItem = (idea: GrammarIdea): string | undefined => idea.parent ?? (idea.glyphs ? 'alphabet' : undefined);

/** How an item is written when it is named in a line: 'ξ', 'ου', 'rough breathing'. */
export const itemName = (idea: GrammarIdea): string => idea.glyphs?.[0] ?? (idea.id.startsWith('breathing-') ? idea.title.replace(/^The /, '') : (idea.pair ?? idea.title));

/** The id of the idea that covers this grammar term ('genitive' is 'case-genitive'), or undefined for a word that is no term. */
export const ideaOfTerm = (term: string): string | undefined => IDEA_OF_TERM.get(term);

/** The idea with this id. Throws on one the ladder does not have. */
export function ideaOf(id: string): GrammarIdea {
  const idea = BY_ID.get(id);
  if (!idea) throw new Error(`Unknown grammar idea: ${JSON.stringify(id)}`);
  return idea;
}

/** Every idea this one rests on, however far down, sorted by rung. */
export function ideasBelow(id: string): GrammarIdea[] {
  const seen = new Set<string>();
  const walk = (at: string): void => {
    for (const need of ideaOf(at).needs) {
      if (!seen.has(need)) {
        seen.add(need);
        walk(need);
      }
    }
  };
  walk(id);
  return [...seen].map(ideaOf).sort((a, b) => a.rung - b.rung);
}

/** The ids of the ideas a word with this RP parsing code needs, sorted by rung: its part of speech, and one idea for each case,
 * number, gender, person, tense, voice, mood and suffix its parsing names. ALWAYS_NEEDED are not listed. Throws on an unknown code. */
export function ideasOf(code: string): string[] {
  const { pos } = splitParse(code);
  const ids = new Set<string>();
  ids.add(pos === 'pronoun' ? 'pronoun' : termIdea(pos));
  for (const segment of parseSegments(decodeParse(code))) if (segment.term) ids.add(termIdea(segment.term));
  return [...ids].sort((a, b) => ideaOf(a).rung - ideaOf(b).rung);
}

function termIdea(term: string): string {
  const id = IDEA_OF_TERM.get(term);
  if (!id) throw new Error(`Grammar term ${JSON.stringify(term)} has no idea`);
  return id;
}
