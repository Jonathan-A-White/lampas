// src/data/grammar/hebrew/ladder.ts — the Hebrew grammar ladder (mw-gdcyf98.9, PROVISIONAL, docs/grammar.md 'The Hebrew ladder'): the ideas of Biblical Hebrew a reader of the
// Old Testament meets, easy first, in the shape of the Greek ladder (src/data/grammar/ladder.ts: the same GrammarIdea, the same tiers) and one door away from it
// (ladders.ts ladderFor('hbo')). It holds the ideas of the first three tiers (mw-gdcyf98.11): the letters (the alphabet, each letter, the final forms, the pairs the dagesh makes, shin and
// sin), the sounds (a vowel point each, the shewa, the dagesh, the mappiq, the furtive patach, the syllable) and the marks (the maqaf, the cantillation, the ketiv and qere); and the
// grammar tiers (mw-gdcyf98.12): nouns, pronouns, prepositions, verbs, joiners and sentences, 26 ideas, each with the parsing terms it covers (terms.ts). Every id starts 'he-' so a grammar
// level, a review row and a drill plan of a Hebrew idea never collide with a Greek one, and an id, once shipped, is not renamed. Pure: no store and no screen.
import type { GrammarIdea, Tier } from '../ladder';
import { makePath } from '../pathGraph';
import { HEBREW_LETTERS, POINT, on } from './letters';
import { HEBREW_TERM_IDEA, hebrewTermsOf } from './terms';

/** The prefix of every Hebrew idea id. */
export const HEBREW_ID_PREFIX = 'he-';

/** Whether an idea id is a Hebrew idea's. */
export const isHebrewIdeaId = (id: string): boolean => id.startsWith(HEBREW_ID_PREFIX);

/** The Hebrew ladder's tiers, in order (PROVISIONAL): the Greek ladder's names, each Hebrew idea in the one that suits it. */
export const HEBREW_TIERS: readonly Tier[] = ['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences'];

/** The tiers a reader meets first, the foundation of a placement (the Greek ladder's are the same three). */
export const HEBREW_FOUNDATION_TIERS: readonly Tier[] = ['letters', 'sounds', 'marks'];

/** The ideas every Hebrew word needs, in ladder order (the Greek ALWAYS_NEEDED): the alphabet to start. */
export const HEBREW_ALWAYS_NEEDED: readonly string[] = ['he-alphabet'];

type Def = Omit<GrammarIdea, 'rung' | 'level'>;

const def = (id: string, tier: Tier, title: string, needs: string[], text: string): Def => ({ id, tier, title, terms: [], needs, text });

/** The vowel points, one idea each, by the ending of the id: 'he-vowel-patach' (the Israeli scheme keys its lesson by the same id, hebrew-israeli-lessons.ts). */
export const HEBREW_VOWEL_KEYS = ['patach', 'qamats', 'segol', 'tsere', 'hiriq', 'holam', 'qubuts', 'shuruq', 'shewa'] as const;

/** The ids of the vowel ideas, patach to shewa. */
export const HEBREW_VOWEL_IDEAS: readonly string[] = HEBREW_VOWEL_KEYS.map((k) => `he-vowel-${k}`);

const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth',
  'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second',
];

const BET = 'ב';
const letterIdeas = (): Def[] =>
  HEBREW_LETTERS.map((l, i) =>
    def(l.id, 'letters', l.name, ['he-alphabet'], `${l.name} is the ${ORDINALS[i]} letter of the Hebrew alphabet, written ${l.letter}${l.final ? ` and, at the end of a word, ${l.final}` : ''}. Like every Hebrew letter it is a consonant.`),
  );

const DEFS: Def[] = [
  def(
    'he-alphabet',
    'letters',
    'The Hebrew alphabet',
    [],
    'Hebrew has 22 letters, and all of them are consonants. It is written and read from right to left, so the first letter of a word is the one on the right. Each letter has a name, such as alef and bet, and five of them take a second shape at the end of a word. Learn the letters first: every word of the Old Testament is built from them.',
  ),
  ...letterIdeas(),
  def(
    'he-final-forms',
    'letters',
    'The final forms',
    ['he-letter-kaf', 'he-letter-mem', 'he-letter-nun', 'he-letter-pe', 'he-letter-tsade'],
    'Five letters are written in a second shape when they end a word: kaf, mem, nun, pe and tsade. The final shape is the same letter, and it is long: it drops below the line, or, for mem, closes all round. It is used only at the end of a word.',
  ),
  def(
    'he-pair-bet-vet',
    'letters',
    'Bet and vet',
    ['he-letter-bet'],
    `Bet is written ${BET} with no dot, and ${on(BET, POINT.dagesh)} with a dot inside it. The dot is the dagesh. A reader treats the two as two letters: bet with the dot, vet without. Which a word has depends on where the letter stands.`,
  ),
  def(
    'he-pair-kaf-khaf',
    'letters',
    'Kaf and khaf',
    ['he-letter-kaf'],
    `Kaf is written ${on('כ', POINT.dagesh)} with a dot inside it, and khaf without the dot, כ. At the end of a word the long form ך is khaf. A reader treats kaf and khaf as two letters.`,
  ),
  def(
    'he-pair-pe-fe',
    'letters',
    'Pe and fe',
    ['he-letter-pe'],
    `Pe is written ${on('פ', POINT.dagesh)} with a dot inside it, and fe without the dot, פ. At the end of a word the long form ף is fe. A reader treats pe and fe as two letters.`,
  ),
  def(
    'he-shin-sin',
    'letters',
    'Shin and sin',
    ['he-letter-shin'],
    `Shin and sin are one letter ש with a dot above it. A dot over the right arm makes it shin, ${on('ש', POINT.shinDot)}; a dot over the left arm makes it sin, ${on('ש', POINT.sinDot)}. A reader treats them as two letters.`,
  ),
  def('he-vowel-patach', 'sounds', 'Patach', ['he-alphabet'], `The patach is a short flat line under a letter: ${on(BET, POINT.patach)}. It is one of the vowel points, small marks that give a Hebrew word its vowels.`),
  def('he-vowel-qamats', 'sounds', 'Qamats', ['he-alphabet'], `The qamats is a flat line with a small stem under it, under a letter: ${on(BET, POINT.qamats)}. It is a vowel point. It looks like the patach with a foot, so look for the foot.`),
  def('he-vowel-segol', 'sounds', 'Segol', ['he-alphabet'], `The segol is three dots in a triangle under a letter, one pointing down: ${on(BET, POINT.segol)}. It is a vowel point.`),
  def('he-vowel-tsere', 'sounds', 'Tsere', ['he-alphabet'], `The tsere is two dots side by side under a letter: ${on(BET, POINT.tsere)}. It is a vowel point. Do not take it for the segol, which has a third dot.`),
  def('he-vowel-hiriq', 'sounds', 'Hiriq', ['he-alphabet'], `The hiriq is a single dot under a letter: ${on(BET, POINT.hiriq)}. It is a vowel point. A yod after it, for example ${on(BET, POINT.hiriq)}י, can lengthen it.`),
  def('he-vowel-holam', 'sounds', 'Holam', ['he-alphabet'], `The holam is a dot above and to the left of a letter: ${on(BET, POINT.holam)}. Often it stands over a vav, for example ${on('ו', POINT.holam)}, and then the vav is part of the vowel.`),
  def('he-vowel-qubuts', 'sounds', 'Qubuts', ['he-alphabet'], `The qubuts is three small dots in a slanting line under a letter: ${on(BET, POINT.qubuts)}. It is a vowel point.`),
  def('he-vowel-shuruq', 'sounds', 'Shuruq', ['he-alphabet'], `The shuruq is a vav with a dot inside it: וּ. It is a vowel, not a consonant and a dot: the vav is part of the vowel.`),
  def(
    'he-vowel-shewa',
    'sounds',
    'The shewa',
    HEBREW_VOWEL_KEYS.filter((k) => k !== 'shewa').map((k) => `he-vowel-${k}`),
    `The shewa is two dots one above the other under a consonant: ${on(BET, POINT.shewa)}. It is vocal when it begins a word or a syllable, or comes after a long vowel, and it is silent when it closes a syllable.`,
  ),
  def(
    'he-dagesh',
    'sounds',
    'The dagesh',
    ['he-pair-bet-vet', 'he-pair-kaf-khaf', 'he-pair-pe-fe'],
    'The dagesh is a dot inside a letter. A dagesh lene is in bet, gimel, dalet, kaf, pe or tav at the start of a word or after a consonant with no vowel. A dagesh forte is in any other letter, after a vowel, and doubles it.',
  ),
  def('he-mappiq', 'sounds', 'The mappiq', ['he-dagesh', 'he-letter-he'], `The mappiq is a dot inside a he at the end of a word: ${on('ה', POINT.dagesh)}. It marks that he as a consonant, not as the quiet ending of a word.`),
  def(
    'he-furtive-patach',
    'sounds',
    'The furtive patach',
    ['he-vowel-patach', 'he-letter-chet', 'he-letter-ayin'],
    'A furtive patach is a patach under the last letter of a word when that letter is chet, ayin or he with a mappiq and the vowel before it is long. It is written under the letter but is read just before it.',
  ),
  def(
    'he-syllable',
    'sounds',
    'The syllable',
    ['he-vowel-shewa'],
    'A Hebrew syllable begins with one consonant and has one vowel. It is open if it ends in its vowel and closed if a consonant follows the vowel. A word has as many syllables as it has vowels.',
  ),
  def('he-maqaf', 'marks', 'The maqaf', ['he-syllable'], `The maqaf is a short raised line between two words: ${on('עַל', POINT.maqaf)}. It joins them into one unit, with one stress between them.`),
  def(
    'he-cantillation',
    'marks',
    'The cantillation marks',
    ['he-syllable'],
    'The cantillation marks are small signs above and below the words of the Old Testament, added to the letters and the points. They mark how a verse is phrased, and the letters never depend on them.',
  ),
  def(
    'he-ketiv-qere',
    'marks',
    'Ketiv and qere',
    ['he-cantillation'],
    'In a few places the letters written in the text (the ketiv, what is written) differ from the word that is read (the qere, what is read). The most common is the name of God, written with the vowels of another word, to show that the other word is read.',
  ),
  // ---- the grammar tiers (mw-gdcyf98.12): a card for each in teach/<tier>.ts, the parsing terms each covers in terms.ts ----
  def(
    'he-gender',
    'nouns',
    'Gender: masculine and feminine',
    ['he-syllable'],
    'Every Hebrew noun is masculine or feminine; there is no neuter. A noun that ends in ה with a qamats before it, or in ת, is usually feminine; a noun with neither ending is usually masculine. A few, such as אֶרֶץ ‘earth’, are feminine with no ending at all. A describing word takes the gender of its noun.',
  ),
  def(
    'he-number',
    'nouns',
    'Number: singular, plural and dual',
    ['he-gender'],
    'A noun is singular (one), plural (many) or dual (a pair). A masculine plural usually ends in ים and a feminine plural in ות; the dual ends in ַיִם and is for things that come in twos. A number word, such as אֶחָד ‘one’, is a noun or a describing word with a gender too.',
  ),
  def(
    'he-article',
    'nouns',
    'The Hebrew article',
    ['he-gender', 'he-dagesh'],
    'Hebrew has a word for ‘the’ and none for ‘a’. ‘The’ is the letter ה written on the front of the noun, with a dagesh in the letter after it where one can be written: הַיּוֹם ‘the day’. A name, such as Jonah, needs no article: it is definite already.',
  ),
  def(
    'he-construct',
    'nouns',
    'The construct state',
    ['he-number'],
    'Hebrew writes ‘the face of the waters’ with no word for ‘of’. The first noun is changed, usually shortened, and leans on the second: פְּנֵי הַמַּיִם. The first noun is in the construct state, and it never has the article. The second noun tells what it is ‘of’.',
  ),
  def(
    'he-suffix-pronominal',
    'nouns',
    'Pronominal suffixes',
    ['he-construct'],
    'A pronoun can be written on the end of a word. On a noun it means ‘my’, ‘your’, ‘his’: אַרְצֶךָ ‘your country’. On a preposition it means ‘me’, ‘you’, ‘him’: אֵלָיו ‘to him’. The word before the suffix is changed, like a construct.',
  ),
  def(
    'he-pronoun-personal',
    'pronouns',
    'The personal pronouns',
    ['he-number'],
    'A personal pronoun takes the place of a person: I, you, he, she, we, they. Hebrew has three persons: first (I, we), second (you) and third (he, she, they). A pronoun has gender and number, as a noun does, and is a word of its own: אֲנִי ‘I’, אַתָּה ‘you’, הוּא ‘he’.',
  ),
  def(
    'he-pronoun-demonstrative',
    'pronouns',
    'This and that',
    ['he-pronoun-personal', 'he-article'],
    'A demonstrative points at something: this, that. זֶה is ‘this’ for a masculine noun and זֹאת for a feminine one; ‘that’ is הוּא or הִיא with the article. It follows its noun, and when the noun has the article it has the article too: הָרָעָה הַזֹּאת ‘this calamity’.',
  ),
  def(
    'he-pronoun-relative',
    'pronouns',
    'The relative pronoun אֲשֶׁר',
    ['he-pronoun-personal'],
    'A relative pronoun joins a clause to a noun: ‘the man who came’. Hebrew has one, אֲשֶׁר, for who, which and that, for every gender and number. It never changes, and a preposition can be written on the front of it: כַּאֲשֶׁר ‘as’.',
  ),
  def(
    'he-prep-inseparable',
    'prepositions',
    'The prefixed prepositions: in, like, to',
    ['he-article'],
    'A preposition links a noun to the rest of the sentence. Three of the commonest are one letter written on the front of the noun: בְּ ‘in’, כְּ ‘like’ and לְ ‘to’. They cannot stand alone. The others, such as עַל ‘upon’ and אֶל ‘to’, are words of their own.',
  ),
  def(
    'he-prep-min',
    'prepositions',
    'From: the preposition מִן',
    ['he-prep-inseparable'],
    'The preposition מִן means ‘from’ or ‘out of’, and, in a comparison, ‘than’. It is often written as מִ on the front of a noun, like the three prefixes; before a letter that cannot take a dagesh its vowel lengthens to מֵ. Together with another preposition it gives ‘from before’.',
  ),
  def(
    'he-object-marker',
    'prepositions',
    'The object marker אֵת',
    ['he-prep-min'],
    'A small word, אֵת or אֶת־, stands before an object that is definite: one that has the article, a suffix or a name. It marks the thing the verb acts on and is not translated. With a suffix it becomes a pronoun: אֹתוֹ ‘him’, אֹתָם ‘them’.',
  ),
  def(
    'he-vav',
    'prepositions',
    'The vav: ‘and’',
    ['he-prep-inseparable'],
    'The letter ו on the front of a word means ‘and’. It is a word written as one letter, joined to the word after it, and it can also mean ‘but’ or ‘so’. It joins words, phrases and whole sentences. Before ב, מ, פ or a shewa it is וּ.',
  ),
  def(
    'he-root',
    'verbs',
    'The root',
    ['he-number'],
    'Most Hebrew words grow from a root of three consonants that carries the basic sense. The root ק־ר־א is ‘call’: קָרָא ‘he called’, מִקְרָא ‘a calling’. Prefixes, endings and vowels are put around the root. Find its three letters and you have found the word.',
  ),
  def(
    'he-qal',
    'verbs',
    'The Qal stem',
    ['he-root'],
    'A Hebrew verb comes in stems, patterns that change its sense. The Qal is the simple one: the plain active sense, with nothing added. Most verbs are Qal: בָּרָא ‘he created’, קָרָא ‘he called’. A dictionary lists a verb as its Qal, third person masculine singular perfect.',
  ),
  def(
    'he-perfect',
    'verbs',
    'The perfect',
    ['he-qal', 'he-pronoun-personal'],
    'The perfect is the form for an action seen as a whole and complete: ‘he created’, ‘I have given’. Hebrew has no past tense as English does; the perfect is the form most used for the past. Who does it is shown by an ending: בָּרָא ‘he’, שָׁרְצוּ ‘they’, נָתַתִּי ‘I’.',
  ),
  def(
    'he-imperfect',
    'verbs',
    'The imperfect',
    ['he-perfect'],
    'The imperfect is the form for an action not seen as complete: it is under way, will happen or may happen. ‘He will be’, ‘they teem’. Who does it is shown by a letter on the front: י ‘he’, ת ‘you’, א ‘I’, נ ‘we’. A short one that wishes is a jussive, and one with ה on the end a cohortative.',
  ),
  def(
    'he-imperative',
    'verbs',
    'The imperative',
    ['he-imperfect'],
    'The imperative is the form that gives a command: ‘Go!’, ‘Get up!’. It addresses someone, so it is always second person, and it has a masculine and a feminine form, singular and plural. It is the shortest form of the verb: לֵךְ, קוּם. The plural ends in וּ.',
  ),
  def(
    'he-participle',
    'verbs',
    'The participle',
    ['he-qal', 'he-number'],
    'A participle is a verb used as a describing word: ‘going’, ‘a creeping thing’. In Hebrew it has gender and number like an adjective, but no tense: it tells what someone is doing, or the doer. It often takes the article as a noun: הָרֹמֵשׂ ‘the one that creeps’.',
  ),
  def(
    'he-infinitive',
    'verbs',
    'The infinitive',
    ['he-qal', 'he-prep-inseparable'],
    'The infinitive names an action with no one doing it: ‘to flee’, ‘fleeing’. Hebrew has two. The construct infinitive follows a preposition, most often לְ: לִבְרֹחַ ‘to flee’. The absolute infinitive stands alone, often beside the same verb, to strengthen it.',
  ),
  def(
    'he-vav-consecutive',
    'verbs',
    'The vav-consecutive',
    ['he-vav', 'he-perfect', 'he-imperfect'],
    'Hebrew tells a story with a vav on the verb. וַ joined to an imperfect, with a dagesh in the next letter, gives a past action that follows the one before: וַיִּקְרָא ‘and he called’. In the other direction, וְ joined to a perfect carries on a future or repeated action.',
  ),
  def(
    'he-stems',
    'verbs',
    'The other stems',
    ['he-qal'],
    'Six more stems change the sense of a root, each with marks of its own. Niphal: it is done, or he does it to himself. Piel: he does it strongly. Pual: the Piel done to him. Hiphil: he causes it. Hophal: it is caused. Hitpael: he does it to himself. The table spells them Nifal, Hifil and Hofal.',
  ),
  def(
    'he-person-gender-number',
    'verbs',
    'Person, gender and number on a verb',
    ['he-perfect', 'he-imperfect'],
    'A verb shows who does it in an ending or a prefix: the person (I, you, he), the gender (he, she) and the number (one or many). A parsing gives all three: third person masculine singular is ‘he’. In the first person the form is common: one form for a man or a woman.',
  ),
  def(
    'he-conjunctions',
    'joiners',
    'Conjunctions and small words',
    ['he-vav'],
    'A conjunction joins clauses: ‘because’, ‘that’, ‘but’. Besides ו ‘and’, Hebrew has small words of their own, such as כִּי ‘because’ or ‘that’. The table also names an adverb (אַל־ ‘do not’), an interjection (הִנֵּה ‘behold’) and the negative particle לֹא ‘not’.',
  ),
  def(
    'he-interrogative',
    'joiners',
    'Asking a question',
    ['he-conjunctions'],
    'A question word asks: ‘who?’, ‘what?’, ‘where?’. Hebrew has מִי ‘who’, מָה ‘what’ and אַיִן ‘where’, written alone or after a preposition: לְמִי ‘to whom’. A question that expects yes or no may have no question word, or only the prefix הֲ.',
  ),
  def(
    'he-verbless-clause',
    'sentences',
    'The verbless clause',
    ['he-pronoun-personal', 'he-article'],
    'A Hebrew sentence need not have a verb for ‘is’. Two words side by side, a subject and what is told of it, are enough: עִבְרִי אָנֹכִי ‘a Hebrew am I’. English adds ‘is’ or ‘am’. A pronoun can stand between the two.',
  ),
  def(
    'he-word-order',
    'sentences',
    'Word order',
    ['he-verbless-clause', 'he-vav-consecutive'],
    'The verb usually comes first in a Hebrew clause, then the subject, then the object: ‘created God the heavens’. English puts the subject first. When Hebrew puts a noun before the verb, the writer is setting it apart, often to begin a new scene or to give background.',
  ),
];

/** The Hebrew ladder, easy first. */
export const HEBREW_LADDER: readonly GrammarIdea[] = DEFS.map((d, i) => ({ ...d, terms: hebrewTermsOf(d.id), rung: i + 1, level: i + 1 }));

/** The ideas that are about how something sounds: a letter and a vowel, each of which the Israeli scheme gives a lesson (hebrew-israeli-lessons.ts). */
export const HEBREW_SOUND_IDEAS: ReadonlySet<string> = new Set([...HEBREW_LETTERS.map((l) => l.id), ...HEBREW_VOWEL_IDEAS]);

/** Whether the Hebrew idea with this id is a letter or a vowel, which the scheme's lesson sounds. */
export const isHebrewSoundIdea = (id: string): boolean => HEBREW_SOUND_IDEAS.has(id);

/** The Hebrew ladder as a path (pathGraph.ts): makePath throws, naming it, on an idea listed twice, a need that is no idea, a need of a higher rung or a cycle. */
export const HEBREW_PATH = makePath(HEBREW_LADDER);

for (const [term, id] of Object.entries(HEBREW_TERM_IDEA)) if (!HEBREW_LADDER.some((i) => i.id === id)) throw new Error(`Hebrew term ${JSON.stringify(term)} belongs to ${JSON.stringify(id)}, which the Hebrew ladder has not`);
for (const idea of HEBREW_LADDER) if (!isHebrewIdeaId(idea.id)) throw new Error(`Hebrew idea ${JSON.stringify(idea.id)} does not start ${JSON.stringify(HEBREW_ID_PREFIX)}`);
