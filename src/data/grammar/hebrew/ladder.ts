// src/data/grammar/hebrew/ladder.ts — the Hebrew grammar ladder (mw-gdcyf98.9, PROVISIONAL, docs/grammar.md 'The Hebrew ladder'): the ideas of Biblical Hebrew a reader of the
// Old Testament meets, easy first, in the shape of the Greek ladder (src/data/grammar/ladder.ts: the same GrammarIdea, the same tiers) and one door away from it
// (ladders.ts ladderFor('hbo')). It holds the ideas of the first three tiers (mw-gdcyf98.11): the letters (the alphabet, each letter, the final forms, the pairs the dagesh makes, shin and
// sin), the sounds (a vowel point each, the shewa, the dagesh, the mappiq, the furtive patach, the syllable) and the marks (the maqaf, the cantillation, the ketiv and qere); the
// grammar tiers come with story 12. Every id starts 'he-' so a grammar
// level, a review row and a drill plan of a Hebrew idea never collide with a Greek one, and an id, once shipped, is not renamed. Pure: no store and no screen.
import type { GrammarIdea, Tier } from '../ladder';
import { makePath } from '../pathGraph';
import { HEBREW_LETTERS, POINT, on } from './letters';

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
];

/** The Hebrew ladder, easy first. */
export const HEBREW_LADDER: readonly GrammarIdea[] = DEFS.map((d, i) => ({ ...d, rung: i + 1, level: i + 1 }));

/** The ideas that are about how something sounds: a letter and a vowel, each of which the Israeli scheme gives a lesson (hebrew-israeli-lessons.ts). */
export const HEBREW_SOUND_IDEAS: ReadonlySet<string> = new Set([...HEBREW_LETTERS.map((l) => l.id), ...HEBREW_VOWEL_IDEAS]);

/** Whether the Hebrew idea with this id is a letter or a vowel, which the scheme's lesson sounds. */
export const isHebrewSoundIdea = (id: string): boolean => HEBREW_SOUND_IDEAS.has(id);

/** The Hebrew ladder as a path (pathGraph.ts): makePath throws, naming it, on an idea listed twice, a need that is no idea, a need of a higher rung or a cycle. */
export const HEBREW_PATH = makePath(HEBREW_LADDER);

for (const idea of HEBREW_LADDER) if (!isHebrewIdeaId(idea.id)) throw new Error(`Hebrew idea ${JSON.stringify(idea.id)} does not start ${JSON.stringify(HEBREW_ID_PREFIX)}`);
