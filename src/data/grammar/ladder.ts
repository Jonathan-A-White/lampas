// src/data/grammar/ladder.ts — the grammar ladder (mw-hqd5bz.1): every idea of Greek grammar a reader of the New Testament meets,
// from the alphabet and its pronunciation up, easy first, and ideasOf(code): the ideas a word with that RP parsing code needs.
// Pure: no store and no screen. An idea's id is the item id of a spaced-schedule row of kind 'grammar' (IDEA_KIND), so the same
// back-off that drills words can drill an idea. The tiers and rungs are PROVISIONAL (docs/grammar.md); other stories key on the
// ids, so an id, once shipped, is not renamed. The 'sentences' tier (mw-br588b.2) is the one tier that is not about a word: its ideas are the uses of uses.ts.
import { GRAMMAR_CONCEPTS } from '../grammar-concepts';
import { bookOf } from '../books';
import { GRAMMAR_TERMS, decodeParse, parseSegments, splitParse } from '../parseCode';
import { patternsOf } from './patterns';
import { belowIn, makePath } from './pathGraph';
import { PREPOSITIONS, type Preposition } from './prepositions';

/** The kind string of a schedule row whose item is a grammar idea (src/data/repositories/reviews.ts). */
export const IDEA_KIND = 'grammar';

export const TIERS = ['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences'] as const;
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
  /** One short paragraph in plain words (under 80 words). For an idea that is about a sound (a letter, a pair, a breathing, their groups) it names
   * no sound, and an idea of the marks names no pronunciation (how an accent is said, that a mark is not heard: mw-5r3p30.312): the sound lessons are the
   * chosen pronunciation's (src/data/grammar/lessons.ts ideaText / ideaSound, src/speech/pronunciation.ts `lessons`). */
  text: string;
  /** Ids of the ideas below it that it rests on. */
  needs: string[];
  /** A letter's lower and upper case. */
  glyphs?: [string, string];
  /** A combination item (mw-hqd5bz.18, PROVISIONAL): the group idea it belongs to ('diphthongs', 'consonant-pairs', 'breathings'). The 24 letters sit under 'alphabet' without it. */
  parent?: string;
  /** A combination's Greek, as it is written: 'ου', 'γγ'. */
  pair?: string;
}

/**
 * Every token needs these, so ideasOf never lists them, and every goal needs them (mw-86e9r1.1): the foundation a beginner meets first, in ladder
 * order. 'alphabet' is the parent of the 24 letters; Learn next and the placement walk them before any noun idea.
 */
export const ALWAYS_NEEDED: readonly string[] = ['alphabet', 'diphthongs', 'consonant-pairs', 'syllables', 'breathings', 'accents', 'iota-subscript', 'punctuation'];

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

// [id suffix, pair]. How each sounds is the chosen pronunciation's lesson (src/data/grammar/lessons.ts), never written here.
const DIPHTHONG_ITEMS: [string, string][] = [['ai', 'αι'], ['ei', 'ει'], ['oi', 'οι'], ['ui', 'υι'], ['ou', 'ου'], ['au', 'αυ'], ['eu', 'ευ'], ['eeu', 'ηυ']];
const PAIR_ITEMS: [string, string][] = [['mp', 'μπ'], ['nt', 'ντ'], ['gk', 'γκ'], ['gg', 'γγ'], ['gch', 'γχ'], ['gks', 'γξ']];

const pairItem = (parent: string, prefix: string, kind: string) => ([key, pair]: [string, string]): Def => ({
  ...def(`${prefix}-${key}`, 'sounds', `The ${kind} ${pair}`, [], [parent], `${pair} is one of the ${kind === 'vowel pair' ? 'pairs of vowels' : 'pairs of consonants'}.`),
  parent,
  pair,
});

const breathingItems = (): Def[] => [
  {
    ...def('breathing-rough', 'marks', 'The rough breathing', [], ['breathings'], 'The rough breathing (ʽ) sits over a vowel at the start of a word. You must know it when you see it.'),
    parent: 'breathings',
    pair: 'ʽ',
  },
  {
    ...def('breathing-smooth', 'marks', 'The smooth breathing', [], ['breathings'], 'The smooth breathing (᾿) sits over a vowel at the start of a word. It is the commoner of the two.'),
    parent: 'breathings',
    pair: '᾿',
  },
];

const def = (id: string, tier: Tier, title: string, terms: string[], needs: string[], text?: string): Def => ({ id, tier, title, terms, needs, text });

// ---- The letters ----

// [id suffix, name, lower, upper]. How each letter sounds is the chosen pronunciation's lesson (src/data/grammar/lessons.ts), never written here.
const LETTERS: [string, string, string, string][] = [
  ['alpha', 'Alpha', 'α', 'Α'],
  ['beta', 'Beta', 'β', 'Β'],
  ['gamma', 'Gamma', 'γ', 'Γ'],
  ['delta', 'Delta', 'δ', 'Δ'],
  ['epsilon', 'Epsilon', 'ε', 'Ε'],
  ['zeta', 'Zeta', 'ζ', 'Ζ'],
  ['eta', 'Eta', 'η', 'Η'],
  ['theta', 'Theta', 'θ', 'Θ'],
  ['iota', 'Iota', 'ι', 'Ι'],
  ['kappa', 'Kappa', 'κ', 'Κ'],
  ['lambda', 'Lambda', 'λ', 'Λ'],
  ['mu', 'Mu', 'μ', 'Μ'],
  ['nu', 'Nu', 'ν', 'Ν'],
  ['xi', 'Xi', 'ξ', 'Ξ'],
  ['omicron', 'Omicron', 'ο', 'Ο'],
  ['pi', 'Pi', 'π', 'Π'],
  ['rho', 'Rho', 'ρ', 'Ρ'],
  ['sigma', 'Sigma', 'σ', 'Σ'],
  ['tau', 'Tau', 'τ', 'Τ'],
  ['upsilon', 'Upsilon', 'υ', 'Υ'],
  ['phi', 'Phi', 'φ', 'Φ'],
  ['chi', 'Chi', 'χ', 'Χ'],
  ['psi', 'Psi', 'ψ', 'Ψ'],
  ['omega', 'Omega', 'ω', 'Ω'],
];

const letterIdeas = (): Def[] =>
  LETTERS.map(([key, name, lower, upper]) => ({
    ...def(`letter-${key}`, 'letters', name, [], ['alphabet'], letterText(name, lower, upper, key)),
    glyphs: [lower, upper],
  }));

function letterText(name: string, lower: string, upper: string, key: string): string {
  const base = `${name} is written ${lower} in small letters and ${upper} as a capital.`;
  if (key === 'sigma') return `${base} At the end of a word it is written ς.`;
  if (key === 'upsilon') return `${base} It is a vowel; after α, ε, η or ο it makes a pair of vowels (αυ, ευ, ηυ, ου), and before ι it makes υι.`;
  return base;
}

// ---- The ladder, in order; the rung of an idea is its place in this list ----

// ---- The prepositions one by one (mw-86e9r1.5, PROVISIONAL): an idea for each, its meaning per case and a real phrase in each ----

const CASE_IDEAS = { genitive: 'case-genitive', dative: 'case-dative', accusative: 'case-accusative' } as const;
const prepId = (p: Preposition): string => `preposition-${p.key}`;

/** The lesson: how it is spelt before a vowel, then each case it takes with its meaning and a New Testament phrase. */
function prepositionText(p: Preposition): string {
  const forms = p.before.length > 0 ? ` (${p.before.join(' or ')} before a vowel)` : '';
  const cases = p.uses.length === 1 ? `the ${p.uses[0].case}` : `${p.uses.length === 2 ? 'two cases' : 'three cases'}, and the case decides what it means`;
  const intro = `${p.greek}${forms} is followed by ${cases}.`;
  const uses = p.uses.map((u) => `With the ${u.case} it means “${u.meaning}”: ${u.phrase}, “${u.gloss}” (${bookOf(u.ref.book)?.name} ${u.ref.chapter}:${u.ref.verse}).`);
  return [intro, ...uses].join(' ');
}

const prepositionIdeas = (): Def[] =>
  PREPOSITIONS.map((p) =>
    def(
      prepId(p),
      'prepositions',
      `The preposition ${p.greek}`,
      [],
      ['preposition', ...(p.before.length > 0 ? ['movable-letters'] : []), ...p.uses.map((u) => CASE_IDEAS[u.case])],
      prepositionText(p),
    ),
  );

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
    'Some vowels pair up and make one sound: αι, ει, οι, υι and ου. In αυ, ευ and ηυ the second vowel is υ. Marks you meet soon will show when two vowels are not a pair.',
  ),
  ...DIPHTHONG_ITEMS.map(pairItem('diphthongs', 'diphthong', 'vowel pair')),
  def(
    'consonant-pairs',
    'sounds',
    'Pairs of consonants',
    [],
    ['letter-mu', 'letter-nu', 'letter-pi', 'letter-tau', 'letter-gamma', 'letter-kappa', 'letter-chi', 'letter-xi'],
    'Some consonants team up and make a sound of their own: μπ, ντ, γκ, γγ, γχ and γξ.',
  ),
  ...PAIR_ITEMS.map(pairItem('consonant-pairs', 'pair', 'consonant pair')),
  def(
    'syllables',
    'sounds',
    'Syllables',
    [],
    ['diphthongs', 'consonant-pairs'],
    'A Greek word is said in syllables, each built round one vowel sound. A word has as many syllables as it has vowel sounds, counting a pair of vowels once. Cut the word after each vowel sound: one consonant starts the next syllable (λό-γος); of two or more, the last does (ἀρ-χῆς), unless together they can begin a word, as στ, πρ and a consonant before λ or ρ can (ἐ-στιν).',
  ),

  // marks
  def(
    'breathings',
    'marks',
    'Breathing marks',
    [],
    ['syllables'],
    'A word that begins with a vowel carries a small mark over it: the rough breathing (ʽ) or the smooth breathing (᾿). The mark is part of the spelling, and it can make one word differ from another. Words that begin with ρ always take a rough breathing, and so does υ. It sits on the second vowel of a pair (οὗτος, αὐτός). Before a capital it stands in front of the letter, not over it (Ἰησοῦς).',
  ),
  ...breathingItems(),
  def(
    'accents',
    'marks',
    'Accents and stress',
    [],
    ['syllables'],
    'Most Greek words carry an accent over a vowel: the acute (ά), the grave (ὰ) or the circumflex (ᾶ). It marks the syllable to stress. A mark can change the word (ἡ “the”, ἤ “or”), and a few small words have none because they lean on the word before. An accent on the first of two vowels shows two sounds, not a pair.',
  ),
  def(
    'iota-subscript',
    'marks',
    'The iota under a letter',
    [],
    ['letter-iota', 'letter-alpha', 'letter-eta', 'letter-omega', 'breathings', 'accents'],
    'A tiny iota sometimes sits under α, η or ω: ᾳ, ῃ, ῳ. It is not said aloud, but it is part of the spelling, and it often marks how a word ends. Do not skip it when you copy a word out.',
  ),
  def(
    'words-sound-alike',
    'marks',
    'Words that sound alike',
    [],
    ['diphthongs', 'iota-subscript'],
    'Some different words are spelt alike but for one letter, and a pronunciation may say that letter the same: ἡμεῖς “we” and ὑμεῖς “you”; λύομεν “we loose” and λύωμεν “let us loose”; λύει “he looses” and λύῃ “he may loose”. Trust the spelling, not the sound, to tell which word you have.',
  ),
  def(
    'punctuation',
    'marks',
    'Punctuation and small marks',
    [],
    ['breathings', 'accents'],
    'Punctuation is much as in English: the comma and full stop are the same. The semicolon (;) is a question mark, and a raised dot (·) is a colon or semicolon. An apostrophe shows a dropped vowel (elision): δι᾿ is δια with its last letter gone. Two dots over a vowel (the diaeresis) say it is not part of a pair.',
  ),
  def(
    'movable-letters',
    'marks',
    'Movable letters',
    [],
    ['breathings', 'punctuation'],
    'Some words change their last letter to suit the next word. A movable ν may end ἐστι(ν) and many other words, and the meaning stays. “Not” is οὐ before a consonant (οὐ κατέλαβεν), οὐκ before a smooth breathing (οὐκ ἦν) and οὐχ before a rough one (οὐχ οὗτός). “Out of” is ἐκ before a consonant (ἐκ θεοῦ) and ἐξ before a vowel (ἐξ ἧς). A dropped vowel gives ἀπ᾿ ἀρχῆς and, before a rough breathing, ἀφ᾿ ἑαυτοῦ.',
  ),
  def(
    'marks-change-word',
    'marks',
    'Marks that change the word',
    [],
    ['breathings', 'accents'],
    'Some words are spelt alike but for a breathing or an accent, and the mark makes them different words, so read the mark: ἡ “the” and ἤ “or”; ὁ “the” and ὅ “which”; εἰ “if” and εἶ “you are”; ἐν “in” and ἕν “one”; οὐ “not” and οὗ “of whom”; ἀλλά “but” and ἄλλα “other things”; αὐτή “herself” and αὕτη “this”; τίς “who?” and τις “someone”.',
  ),
  def(
    'enclitics',
    'marks',
    'Enclitics',
    [],
    ['breathings', 'accents', 'marks-change-word'],
    'An enclitic is a small word with no accent of its own: it leans on the word before it and is said with it. The commonest are the present forms of εἰμί “I am” (ἐστιν, ἐσμεν, εἰσιν; but not εἶ), τις “someone” (ἄνθρωπός τις, “a certain man”, where it hands an accent back) and μου, σου, μοι, σοι, με, σε (ὁ πατήρ μου, “my Father”). The question word τίς “who?” is not one: it keeps its accent.',
  ),

  // nouns: the noun, then number and the two joiners met in every verse (καί, δέ, οὐ), then the cases, the genders, the article and the adjective
  def('noun', 'nouns', 'The noun', ['noun'], ['breathings', 'accents', 'iota-subscript']),
  def('number-singular', 'nouns', 'The singular', ['singular'], ['noun']),
  def('number-plural', 'nouns', 'The plural', ['plural'], ['number-singular']),
  def('conjunction', 'nouns', 'The conjunction', ['conjunction'], ['noun']),
  def('negative', 'nouns', 'The negative', ['negative'], ['conjunction']),
  def('case-nominative', 'nouns', 'The nominative case', ['nominative'], ['noun', 'number-plural']),
  // the patterns of how a form is built (mw-svw421.1, PROVISIONAL): a word as a stem and an ending, the declensions, a dictionary entry
  def(
    'stem-and-ending',
    'nouns',
    'A word is a stem and an ending',
    [],
    ['noun', 'case-nominative'],
    'A Greek word is built from a stem and an ending. The stem carries the meaning and stays the same; the ending changes with the job the word does. In λόγος, “word”, the stem is λογ- and the ending is -ος; in λόγου, “of a word”, the stem is the same and the ending is -ου. Words that say what is done work alike: λύ-ω is “I loose” and λύ-ομεν is “we loose”.',
  ),
  def('case-accusative', 'nouns', 'The accusative case', ['accusative'], ['case-nominative']),
  def('case-genitive', 'nouns', 'The genitive case', ['genitive'], ['case-nominative']),
  def('case-dative', 'nouns', 'The dative case', ['dative'], ['case-genitive']),
  def('case-vocative', 'nouns', 'The vocative case', ['vocative'], ['case-nominative']),
  def('gender-masculine', 'nouns', 'The masculine gender', ['masculine'], ['noun']),
  def('gender-feminine', 'nouns', 'The feminine gender', ['feminine'], ['gender-masculine']),
  def('gender-neuter', 'nouns', 'The neuter gender', ['neuter'], ['gender-masculine', 'gender-feminine', 'case-accusative']),
  def(
    'declension-1',
    'nouns',
    'The first declension',
    [],
    ['stem-and-ending', ...NOUN_CASES, ...GENDERS],
    'Nouns whose stem ends in α or η make up the first declension: ἡμέρα “day”, δόξα “glory”, φωνή “sound” and ἀρχή “beginning” (1 John 1:1) are feminine, and προφήτης “prophet” is masculine. The nominative ends in -α or -η (-ης for a masculine) and the genitive in -ας or -ης: ἀρχή, ἀρχῆς.',
  ),
  def(
    'declension-2',
    'nouns',
    'The second declension',
    [],
    ['stem-and-ending', ...NOUN_CASES, ...GENDERS],
    'Nouns whose stem ends in ο make up the second declension: λόγος “word” (1 John 1:1) and ἄνθρωπος “man” are masculine, and τέκνον “child” is neuter. The nominative ends in -ος or -ον and the genitive in -ου: λόγος, λόγου; τέκνον, τέκνου.',
  ),
  def('article', 'nouns', 'The article', ['article'], ['noun', ...NOUN_CASES, 'number-plural', ...GENDERS]),
  def('adjective', 'nouns', 'The adjective', ['adjective'], ['noun', ...NOUN_CASES, 'number-plural', ...GENDERS]),
  def(
    'dictionary-entry',
    'nouns',
    'A dictionary entry',
    [],
    ['stem-and-ending', 'case-genitive', ...GENDERS, 'article', 'adjective'],
    'A dictionary lists a noun with three pieces: ἄγγελος, -ου, ὁ is the nominative, the ending of the genitive and the article, which shows the gender (ὁ masculine, ἡ feminine, τό neuter). An adjective is listed as ἀγαθός, -ή, -όν, one ending for each gender. A word for what is done is listed as λύω, “I loose”. Look a word up under its entry, not under the form you met.',
  ),
  def(
    'declension-3',
    'nouns',
    'The third declension',
    [],
    ['dictionary-entry', 'declension-1', 'declension-2'],
    'Every other noun is of the third declension: σάρξ “flesh”, πνεῦμα “spirit”, πίστις “faith”, πατήρ “father”, βασιλεύς “king”. Its nominative gives no clue to the stem; the genitive does: σάρξ, σαρκός shows the stem σαρκ-. So read the entry and take the stem from the genitive. χεῖρες “hands” (1 John 1:1) is the plural of χείρ, χειρός.',
  ),
  def('comparative', 'nouns', 'The comparative', ['comparative'], ['adjective']),
  def('superlative', 'nouns', 'The superlative', ['superlative'], ['comparative']),
  def('numeral', 'nouns', 'Number words', ['numeral'], ['adjective']),
  def('proper-name', 'nouns', 'Proper names', ['proper name'], ['noun', 'article']),
  def('indeclinable', 'nouns', 'Words that never change', ['indeclinable', 'letter'], ['proper-name', 'case-genitive']),

  // pronouns: person comes first, because I, you, he, we, you, they are where they are first met
  def('person-1st', 'pronouns', 'The first person', ['1st person'], ['noun']),
  def('person-2nd', 'pronouns', 'The second person', ['2nd person'], ['person-1st']),
  def('person-3rd', 'pronouns', 'The third person', ['3rd person'], ['person-2nd']),
  def(
    'pronoun',
    'pronouns',
    'The pronoun',
    [],
    ['noun', 'person-3rd', 'number-plural', ...NOUN_CASES, ...GENDERS],
    'A pronoun stands in for a noun: I, you, he, she, it, this, who. It saves repeating the noun. Example: in “Paul wrote, and he sent it”, he and it are pronouns. A Greek pronoun changes its ending for case, number and gender like a noun, and the personal ones also show person.',
  ),
  def('pronoun-personal', 'pronouns', 'The personal pronoun', ['personal pronoun'], ['pronoun', ...NOUN_CASES]),
  def('pronoun-demonstrative', 'pronouns', 'The demonstrative pronoun', ['demonstrative pronoun'], ['pronoun-personal', 'article', ...GENDERS]),
  def('pronoun-relative', 'pronouns', 'The relative pronoun', ['relative pronoun'], ['pronoun-demonstrative']),
  def('pronoun-interrogative', 'pronouns', 'The interrogative pronoun', ['interrogative pronoun'], ['pronoun-relative', 'marks-change-word']),
  def('pronoun-indefinite', 'pronouns', 'The indefinite pronoun', ['indefinite pronoun'], ['pronoun-interrogative', 'enclitics']),
  def('pronoun-reflexive', 'pronouns', 'The reflexive pronoun', ['reflexive pronoun'], ['pronoun-personal']),
  def('pronoun-possessive', 'pronouns', 'The possessive pronoun', ['possessive pronoun', 'possessor'], ['pronoun-reflexive', 'adjective']),
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
  ...prepositionIdeas(),

  // verbs: person and number (above) first, then the present, the active and the indicative, the other tenses, the voices, the moods
  def('verb', 'verbs', 'The verb', ['verb'], PERSONS_AND_NUMBERS),
  def(
    'eimi',
    'verbs',
    'The verb εἰμί',
    [],
    ['verb'],
    'εἰμί, “I am”, is the commonest verb of all, and it has forms of its own that follow no other pattern: εἰμί “I am”, εἶ “you are”, ἐστίν “he is”, ἐσμέν “we are”, ἐστέ “you are”, εἰσίν “they are”, and ἦν “he was” (1 John 1:1). You will know them by sight long before you know why they look so.',
  ),
  def(
    'compound-verbs',
    'verbs',
    'Compound verbs',
    [],
    ['verb', 'preposition', ...PREPOSITIONS.map(prepId)],
    'Many Greek verbs are a preposition joined to a verb, and the preposition keeps its meaning: ἐκ + βάλλω is ἐκβάλλω, “throw out”; εἰς + ἔρχομαι is εἰσέρχομαι, “go in”; κατά + βαίνω is καταβαίνω, “go down”. The preposition may change to fit: ἐκ becomes ἐξ before a vowel (ἐξεβάλομεν), and κατά loses its last vowel (κατέβη). Sometimes the meaning drifts: μετανοέω is “change one’s mind”.',
  ),
  def('tense-present', 'verbs', 'The present tense', ['present'], ['verb']),
  def('voice-active', 'verbs', 'The active voice', ['active'], ['verb']),
  def('mood-indicative', 'verbs', 'The indicative mood', ['indicative'], ['tense-present', 'voice-active']),
  def(
    'contract-verbs',
    'verbs',
    'Contract verbs',
    [],
    ['stem-and-ending', 'mood-indicative'],
    'Some verbs have a stem ending in α, ε or ο: ἀγαπάω “I love”, ποιέω “I do”, πληρόω “I fill”. In the present the stem’s vowel runs together with the vowel of the ending, so the joining vowel is lost: ποιέ-ομεν becomes ποιοῦμεν “we do” (1 John 1:6), ποιέ-ει becomes ποιεῖ and ἀγαπά-ει becomes ἀγαπᾷ. The dictionary lists such a verb in -άω, -έω or -όω.',
  ),
  def('tense-imperfect', 'verbs', 'The imperfect tense', ['imperfect'], ['mood-indicative']),
  def('tense-future', 'verbs', 'The future tense', ['future'], ['tense-present']),
  def('tense-aorist', 'verbs', 'The aorist tense', ['aorist'], ['tense-imperfect']),
  def(
    'augment',
    'verbs',
    'The augment',
    [],
    ['tense-aorist', 'stem-and-ending'],
    'In the indicative the imperfect and the aorist put a short ἐ- in front of the stem. It is called the augment, and it says the action is past: ἐθεασάμεθα “we beheld” (1 John 1:1) is ἐ- before the stem θεα-. A stem that begins with a vowel lengthens it instead: α becomes η, so ἀγαπάω gives ἠγάπησα “I loved”.',
  ),
  def('tense-perfect', 'verbs', 'The perfect tense', ['perfect'], ['tense-aorist']),
  def(
    'reduplication',
    'verbs',
    'Reduplication',
    [],
    ['tense-perfect', 'stem-and-ending'],
    'The perfect is marked by reduplication: it repeats the first consonant of the stem and puts ε between: λύω gives λέ-λυκα “I have loosed”, and γράφω gives γέ-γραπται “it is written”. A stem that begins with a vowel lengthens it instead: ὁράω gives ἑώρακα “I have seen”. Look for the doubled start.',
  ),
  def(
    'oida',
    'verbs',
    'The verb οἶδα',
    [],
    ['tense-perfect'],
    'οἶδα is a perfect in form and “I know” in sense: οἶδα “I know”, οἶδας “you know”, οἶδεν “he knows”, οἴδαμεν “we know” (1 John 3:2). Its past is ᾔδειν “I knew”. Some lists give it under εἴδω. The word has the endings of a perfect without the usual first-consonant repeat, and it is used as a present.',
  ),
  def('tense-pluperfect', 'verbs', 'The pluperfect tense', ['pluperfect'], ['tense-perfect']),
  def('second-tenses', 'verbs', 'Second aorists and perfects', ['second'], ['tense-aorist', 'tense-perfect']),
  def(
    'mi-verbs',
    'verbs',
    'Verbs in -μι',
    [],
    ['stem-and-ending', 'contract-verbs', 'second-tenses'],
    'A few common verbs end their dictionary entry in -μι: δίδωμι “I give”, τίθημι “I put”, ἵστημι “I set up”, ἀφίημι “I let go”. In the present the endings join the stem with no joining vowel: δίδωμι, δίδως, δίδωσιν (John 3:34). Many have a second aorist, such as ἔστην “I stood”.',
  ),
  def('voice-middle', 'verbs', 'The middle voice', ['middle'], ['voice-active']),
  def('voice-passive', 'verbs', 'The passive voice', ['passive'], ['voice-active', 'tense-present', 'tense-aorist', 'case-genitive']),
  def(
    'tense-signs',
    'verbs',
    'Tense signs',
    [],
    ['tense-future', 'tense-aorist', 'tense-perfect', 'voice-passive', 'stem-and-ending'],
    'A letter or two between the stem and the ending marks the tense. σ marks the future and the first aorist: λύσω “I shall loose”, ἔλυσα “I loosed”. θη marks the aorist passive: ἐλύθην “I was loosed”. κ marks the first perfect: ἑωράκαμεν “we have seen” (1 John 1:1).',
  ),
  def(
    'principal-parts',
    'verbs',
    'Principal parts',
    [],
    ['augment', 'tense-signs', 'reduplication'],
    'Every other form of a verb is built from its principal parts, six forms that a good dictionary lists together: λύω, λύσω, ἔλυσα, λέλυκα, λέλυμαι, ἐλύθην (present, future, aorist and perfect active, perfect and aorist passive). A verb that bends the pattern must be learnt by its parts: ἀκούω has ἤκουσα and ἀκήκοα.',
  ),
  def('voice-middle-or-passive', 'verbs', 'The middle or passive voice', ['middle or passive'], ['voice-middle', 'voice-passive']),
  def('voice-middle-deponent', 'verbs', 'The middle deponent', ['middle deponent'], ['voice-middle-or-passive']),
  def('voice-passive-deponent', 'verbs', 'The passive deponent', ['passive deponent'], ['voice-middle-deponent', 'tense-aorist']),
  def('voice-middle-or-passive-deponent', 'verbs', 'The middle or passive deponent', ['middle or passive deponent'], ['voice-passive-deponent']),
  def('voice-middle-significance', 'verbs', 'A middle meaning in an active form', ['middle significance'], ['voice-middle']),
  def('voice-impersonal-active', 'verbs', 'The impersonal active', ['impersonal active'], ['voice-active']),
  def('voice-none', 'verbs', 'A verb with no voice', ['no voice'], ['voice-active']),
  def('mood-imperative', 'verbs', 'The imperative mood', ['imperative'], ['mood-indicative', 'tense-aorist']),
  def('mood-subjunctive', 'verbs', 'The subjunctive mood', ['subjunctive'], ['mood-indicative']),
  def('mood-optative', 'verbs', 'The optative mood', ['optative'], ['mood-subjunctive']),
  def('mood-infinitive', 'verbs', 'The infinitive', ['infinitive'], ['mood-indicative', 'article']),
  def('mood-participle', 'verbs', 'The participle', ['participle'], ['mood-infinitive', ...NOUN_CASES, ...GENDERS, 'adjective']),
  def('mood-participle-imperative', 'verbs', 'The participle with the sense of a command', ['imperative-sense participle'], ['mood-participle', 'mood-imperative']),

  // particles and the rest (the conjunction and the negative are met with the noun)
  def('particle', 'joiners', 'The particle', ['particle'], ['conjunction']),
  def('adverb', 'joiners', 'The adverb', ['adverb'], ['adjective', 'verb']),
  def('interrogative', 'joiners', 'Words that ask a question', ['interrogative'], ['particle']),
  def('conditional', 'joiners', 'The conditional', ['conditional'], ['conjunction', 'mood-indicative', 'mood-subjunctive']),
  def('interjection', 'joiners', 'The interjection', ['interjection'], ['particle']),
  def('attic-form', 'joiners', 'Attic spellings', ['Attic form'], ['verb']),
  def('poetic', 'joiners', 'Poetic forms', ['poetic'], ['attic-form']),
  def('crasis', 'joiners', 'Two words run together', ['crasis'], ['conjunction', 'punctuation']),
  def('aramaic', 'joiners', 'Aramaic words', ['Aramaic word'], ['indeclinable']),
  def('hebrew', 'joiners', 'Hebrew words', ['Hebrew word'], ['indeclinable']),

  // sentences (mw-br588b.2, PROVISIONAL): one idea for each use the finder knows (uses.ts, whose ids these are), built of the word ideas below; no GRAMMAR_TERM is theirs
  def(
    'agreement',
    'sentences',
    'Words that agree',
    [],
    ['article', 'adjective', ...NOUN_CASES, 'number-plural', ...GENDERS],
    'An article or an adjective agrees with its noun: it has the same case, number and gender, so the endings show which words belong together. In ἡ ζωή “the life” (1 John 1:2) both words are nominative, singular and feminine. Words that agree usually stand side by side, but others may come between them.',
  ),
  def(
    'article-substantival',
    'sentences',
    'The article standing alone',
    [],
    ['article', 'adjective', 'preposition', 'adverb', 'mood-participle'],
    'An article with no noun after it stands for someone or something: “the one”, “those”. It leads a participle, an adjective or a phrase. οἱ μαρτυροῦντες “the ones who bear witness” (1 John 5:7); τοῖς ἐν Χριστῷ Ἰησοῦ “those in Christ Jesus” (Romans 8:1). Ask who or what the article points to.',
  ),
  def(
    'article-position',
    'sentences',
    'Where the adjective stands',
    [],
    ['article', 'adjective', 'agreement'],
    'Where an adjective stands beside the article and its noun changes the sense. Between the article and the noun, or after the noun with a second article, it says which one: τὴν ζωὴν τὴν αἰώνιον “the eternal life” (1 John 1:2). Outside them it states something: Πιστὸς ὁ λόγος “the word is faithful” (1 Timothy 4:9).',
  ),
  def(
    'postpositive',
    'sentences',
    'Words that come second',
    [],
    ['conjunction', 'particle'],
    'Some small words never stand first in their clause: δέ “and, but”, γάρ “for”, οὖν “so” and μέν come second, after the first word or phrase. In English you say them first. ἡ κοινωνία δὲ ἡ ἡμετέρα “and our fellowship” (1 John 1:3): read δέ in front of the words it follows.',
  ),
  def(
    'clause-hoti',
    'sentences',
    'A clause with ὅτι',
    [],
    ['conjunction', 'mood-indicative'],
    'ὅτι begins a clause that says what someone says, knows or sees (“that”), or gives a reason (“because”). The clause has a verb of its own. ἀναγγέλλομεν ὑμῖν ὅτι ὁ θεὸς φῶς ἐστιν “we announce to you that God is light” (1 John 1:5): the clause is ὁ θεὸς φῶς ἐστιν.',
  ),
  def(
    'clause-hina',
    'sentences',
    'A clause with ἵνα',
    [],
    ['conjunction', 'mood-subjunctive'],
    'ἵνα begins a clause of purpose or aim, “so that”, and its verb is in the subjunctive. ἀπαγγέλλομεν ὑμῖν ἵνα καὶ ὑμεῖς κοινωνίαν ἔχητε “we proclaim to you, so that you also may have fellowship” (1 John 1:3): ἔχητε is the subjunctive. English often adds “may”.',
  ),
  def(
    'participle-adverbial',
    'sentences',
    'A participle beside a verb',
    [],
    ['mood-participle', 'case-nominative'],
    'A participle in the nominative with no article often tells when, how or why the main verb happens. εἰσελθὼν διήρχετο τὴν Ἰεριχώ “he entered and was passing through Jericho” (Luke 19:1): εἰσελθών “having entered” is the participle, διήρχετο the main verb. Put it in English with “when”, “because” or “and”.',
  ),
  def(
    'genitive-absolute',
    'sentences',
    'The genitive absolute',
    [],
    ['mood-participle', 'case-genitive'],
    'A participle and a noun, both in the genitive and joined to nothing else in the clause, set the time or the reason for what follows. ἐξελθόντων αὐτῶν ἀπὸ Βηθανίας “when they had gone out from Bethany” (Mark 11:12): ἐξελθόντων and αὐτῶν are both genitive plural, and the main verb has another subject.',
  ),
  def(
    'periphrastic',
    'sentences',
    'Being plus a participle',
    [],
    ['eimi', 'mood-participle'],
    'A form of εἰμί “to be” beside a participle can act as one verb. ᾖ πεπληρωμένη “may be fulfilled” (1 John 1:4): ᾖ means “may be” and πεπληρωμένη “having been fulfilled”. The two together say what one verb would. The participle carries the meaning, and εἰμί carries the time and the mood.',
  ),
  def(
    'infinitive-articular',
    'sentences',
    'The infinitive with the article',
    [],
    ['mood-infinitive', 'article', 'preposition'],
    'An infinitive with the article τό or τοῦ works as a noun, “the doing of it”. τὸ ζῇν “living” and τὸ ἀποθανεῖν “dying” (Philippians 1:21). After a preposition it often gives a purpose or a result: εἰς τὸ φαγεῖν “so as to eat” (1 Corinthians 11:33).',
  ),
  def(
    'infinitive-complement',
    'sentences',
    'An infinitive that finishes a verb',
    [],
    ['mood-infinitive', 'verb'],
    'Some verbs need an infinitive to finish their sense: δύναμαι “I am able”, θέλω “I wish”, μέλλω “I am about to”, δεῖ “it is necessary”, ἄρχομαι “I begin”. οὐ θέλω ὑμᾶς ἀγνοεῖν “I do not wish you to be ignorant” (1 Corinthians 12:1): ἀγνοεῖν finishes θέλω, and has no article.',
  ),
  def(
    'subjunctive-hortatory',
    'sentences',
    'Let us: urging with the subjunctive',
    [],
    ['mood-subjunctive', 'person-1st', 'number-plural'],
    'A first person plural verb in the subjunctive, standing alone in its clause, urges: “let us”. Ἄγωμεν “let us go” (John 11:7); κατέχωμεν τὴν ὁμολογίαν “let us hold fast the confession” (Hebrews 10:23). A subjunctive after ἵνα or ἐάν is a different use, because a word before it begins a clause.',
  ),
  def(
    'prohibition',
    'sentences',
    'Do not: the two ways to forbid',
    [],
    ['mood-imperative', 'mood-subjunctive', 'negative', 'tense-aorist', 'particle'],
    'There are two ways to forbid something: μή with the present imperative, or μή with the aorist subjunctive. Μὴ θαυμάζετε “do not be amazed” (1 John 3:13) is the first; Μὴ θαυμάσῃς “do not be amazed” (John 3:7) is the second. Both say “do not”, and both are said to one person or to many.',
  ),
  def(
    'ou-me',
    'sentences',
    'οὐ μή: a strong no',
    [],
    ['negative', 'mood-subjunctive', 'tense-future', 'particle'],
    'οὐ μή together, with the subjunctive or the future, is the strongest no: “never”, “by no means”. It states what will not happen, and does not forbid. οἱ δὲ λόγοι μου οὐ μὴ παρέλθωσιν “my words will never pass away” (Matthew 24:35). Do not read the μή in it as “do not”.',
  ),
  def(
    'condition',
    'sentences',
    'If: the three conditions',
    [],
    ['conditional', 'mood-indicative', 'mood-subjunctive'],
    'An “if” clause is one of three kinds. εἰ with the indicative takes it as true: εἰ ζῶμεν πνεύματι “if we live by the Spirit” (Galatians 5:25). ἐάν with the subjunctive leaves it open: ἐὰν ὁμολογῶμεν “if we confess” (1 John 1:9). εἰ with a past indicative and ἄν says it was not so (1 Corinthians 11:31).',
  ),
];

/** The ladder, easy first. */
export const LADDER: readonly GrammarIdea[] = DEFS.map((d, i) => ({ ...d, rung: i + 1, text: d.text ?? conceptText(d.terms[0]) }));

const BY_ID = new Map<string, GrammarIdea>();
for (const idea of LADDER) {
  if (BY_ID.has(idea.id)) throw new Error(`Grammar idea ${idea.id} is listed twice`);
  BY_ID.set(idea.id, idea);
}
/** The ladder as a path (pathGraph.ts): the same graph functions answer for any other path; makePath throws, naming it, on a cycle. */
export const LADDER_PATH = makePath(LADDER);

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

/** One thing a drill can find he knows or does not (mw-i7xe0n.1, drillIt.ts): a short id and the label that names it to him. */
export interface Facet {
  id: string;
  label: string;
}

/** An item as a facet: a letter is 'ν (Nu)', a pair 'ου', a breathing 'rough breathing'; its id is the item's. */
export const itemFacet = (idea: GrammarIdea): Facet => ({ id: idea.id, label: idea.glyphs ? `${idea.glyphs[0]} (${idea.title})` : itemName(idea) });

/** The id of the idea that covers this grammar term ('genitive' is 'case-genitive'), or undefined for a word that is no term. */
export const ideaOfTerm = (term: string): string | undefined => IDEA_OF_TERM.get(term);

/** The idea with this id. Throws on one the ladder does not have. */
export function ideaOf(id: string): GrammarIdea {
  const idea = BY_ID.get(id);
  if (!idea) throw new Error(`Unknown grammar idea: ${JSON.stringify(id)}`);
  return idea;
}

/** Every idea this one rests on, however far down, sorted by rung. */
export const ideasBelow = (id: string): GrammarIdea[] => belowIn(LADDER_PATH, id);

/** The ids of the ideas a word with this RP parsing code needs, sorted by rung: its part of speech, and one idea for each case,
 * number, gender, person, tense, voice, mood and suffix its parsing names. ALWAYS_NEEDED are not listed. Throws on an unknown code. */
export function ideasOf(code: string): string[] {
  const { pos } = splitParse(code);
  const ids = new Set<string>();
  ids.add(pos === 'pronoun' ? 'pronoun' : termIdea(pos));
  for (const segment of parseSegments(decodeParse(code))) if (segment.term) ids.add(termIdea(segment.term));
  return [...ids].sort((a, b) => ideaOf(a).rung - ideaOf(b).rung);
}

const PREPOSITION_IDEA_OF_LEMMA = new Map(PREPOSITIONS.map((p) => [p.greek.normalize('NFC'), prepId(p)]));

/** ideasOf for a word of the text (mw-86e9r1.5): a preposition of the twelve also needs its own idea, which its parsing code cannot name, and (mw-svw421.1)
 * a word also needs the pattern ideas its dictionary form and code show (patterns.ts patternsOf): its declension, the augment, its tense signs and the rest. */
export function ideasOfWord(word: { l: string; p: string; t?: string }): string[] {
  const own = word.p === 'PREP' ? PREPOSITION_IDEA_OF_LEMMA.get(word.l.normalize('NFC')) : undefined;
  const ids = [...new Set([...ideasOf(word.p), ...patternsOf(word), ...(own ? [own] : [])])];
  return ids.sort((a, b) => ideaOf(a).rung - ideaOf(b).rung);
}

function termIdea(term: string): string {
  const id = IDEA_OF_TERM.get(term);
  if (!id) throw new Error(`Grammar term ${JSON.stringify(term)} has no idea`);
  return id;
}
