// src/speech/schemes/hebrew-israeli-lessons.ts — what the Israeli scheme teaches of each letter and vowel of Hebrew (mw-gdcyf98.5): one sound lesson per letter idea, 'he-letter-alef' to
// 'he-letter-tav', and per vowel idea, 'he-vowel-patach' to 'he-vowel-shewa', the ids story g's letter drill and idea sheets read. Each sound is named through `say`, which gives the
// symbol the respelling writes and the reader's English accent's hint for it, as the Greek lessons do (modernLessons.ts); the sounds the standard (../sounds.ts) has no id for yet
// (h, r, sh, ts) are named here without an English key word. The respelling these lessons teach is hebrew-israeli.ts's.
import type { SoundWords } from '../accents';
import type { SoundLesson } from '../pronunciation';

/** The letters of the alphabet in order, by the name their idea id ends in: 'he-letter-alef'. */
const LETTERS = [
  'alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsade', 'qof', 'resh', 'shin', 'tav',
] as const;
/** The vowel points, by the name their idea id ends in: 'he-vowel-patach'. */
const VOWELS = ['patach', 'qamats', 'segol', 'tsere', 'hiriq', 'holam', 'qubuts', 'shuruq', 'shewa'] as const;

/** The ids of the 22 letters' ideas, alef to tav. */
export const HEBREW_LETTER_IDS: readonly string[] = LETTERS.map((name) => `he-letter-${name}`);
/** The ids of the 9 vowel ideas. */
export const HEBREW_VOWEL_IDS: readonly string[] = VOWELS.map((name) => `he-vowel-${name}`);

/** The names a Hebrew voice says for each letter, by the idea id, as a recogniser writes them (Say it). */
export const HEBREW_LETTER_NAMES: Readonly<Record<string, readonly string[]>> = {
  'he-letter-alef': ['alef', 'aleph', 'alif'],
  'he-letter-bet': ['bet', 'beth', 'vet'],
  'he-letter-gimel': ['gimel', 'gimmel'],
  'he-letter-dalet': ['dalet', 'daleth'],
  'he-letter-he': ['he', 'hey', 'hay'],
  'he-letter-vav': ['vav', 'waw', 'vau'],
  'he-letter-zayin': ['zayin', 'zain'],
  'he-letter-chet': ['chet', 'het', 'khet', 'heth'],
  'he-letter-tet': ['tet', 'teth'],
  'he-letter-yod': ['yod', 'yud', 'yodh'],
  'he-letter-kaf': ['kaf', 'kaph', 'khaf'],
  'he-letter-lamed': ['lamed', 'lamedh'],
  'he-letter-mem': ['mem'],
  'he-letter-nun': ['nun'],
  'he-letter-samekh': ['samekh', 'samech', 'sameh'],
  'he-letter-ayin': ['ayin', 'ain'],
  'he-letter-pe': ['pe', 'pay'],
  'he-letter-tsade': ['tsade', 'tsadi', 'tzadi', 'sadi'],
  'he-letter-qof': ['qof', 'kof', 'koph'],
  'he-letter-resh': ['resh'],
  'he-letter-shin': ['shin', 'sin'],
  'he-letter-tav': ['tav', 'taw', 'tau'],
};

/** What a recogniser writes for each symbol of the Hebrew respelling said alone, besides the symbol itself (Say it). */
export const HEBREW_HEARD_AS: Readonly<Record<string, readonly string[]>> = {
  a: ['ah', 'aa'],
  eh: ['e', 'eh'],
  e: ['eh', 'uh'],
  ee: ['eee', 'ea'],
  o: ['oh', 'aw'],
  oo: ['ooh', 'u'],
  v: ['vee', 'vuh'],
  f: ['ef', 'eff', 'fuh'],
  z: ['zee', 'zed', 'zuh'],
  s: ['es', 'ess', 'suh'],
  b: ['bee', 'buh'],
  p: ['pee', 'puh'],
  d: ['dee', 'duh'],
  t: ['tee', 'tuh'],
  g: ['gee', 'guh'],
  k: ['kay', 'kuh', 'kah'],
  m: ['em', 'muh'],
  n: ['en', 'nuh'],
  l: ['el', 'luh'],
  kh: ['ch', 'kha', 'khuh'],
  y: ['ye', 'yeh', 'yuh'],
};

export function hebrewLessons(say: SoundWords): Readonly<Record<string, SoundLesson>> {
  /** As an idea's sound: 'b, as in “bed”'. */
  const keyed = say.keyed;
  const choice = say.choice;
  const one = (symbol: string): SoundLesson => ({ sound: keyed(symbol), choice: choice(symbol), sounds: [symbol] });
  const two = (hard: string, soft: string, rule: string): SoundLesson => ({ sound: `${keyed(hard)} with a dot inside it, ${keyed(soft)} without${rule}`, choice: choice(hard), sounds: [hard, soft] });

  const letters: Record<string, SoundLesson> = {
    alef: { sound: 'nothing: it holds a vowel, and the Israeli voice does not say it' },
    bet: two('b', 'v', ' (the dot is the dagesh)'),
    gimel: one('g'),
    dalet: one('d'),
    he: { sound: 'h, a soft breath; at the end of a word it is silent, and only shows the vowel before it', choice: 'h, a soft breath', sounds: ['h'] },
    vav: { sound: `${keyed('v')}; with a dot above it (holam) it is the vowel o, and with a dot inside it (shuruq) the vowel oo`, choice: choice('v'), sounds: ['v'] },
    zayin: one('z'),
    chet: one('kh'),
    tet: one('t'),
    yod: { sound: `${keyed('y')}; after a vowel it can join it (ai, ay) or only lengthen it (ee)`, choice: choice('y'), sounds: ['y'] },
    kaf: two('k', 'kh', ', and the same at the end of a word (ך)'),
    lamed: one('l'),
    mem: { sound: `${keyed('m')}, and the same at the end of a word (ם)`, choice: choice('m'), sounds: ['m'] },
    nun: { sound: `${keyed('n')}, and the same at the end of a word (ן)`, choice: choice('n'), sounds: ['n'] },
    samekh: one('s'),
    ayin: { sound: 'nothing: it holds a vowel, and the Israeli voice does not say it' },
    pe: two('p', 'f', ', and the same at the end of a word (ף)'),
    tsade: { sound: 'ts, the t and the s said together as one sound; the same at the end of a word (ץ)', choice: 'ts, the t and the s said together', sounds: ['ts'] },
    qof: one('k'),
    resh: { sound: 'r, the English r (an Israeli says it further back in the throat)', choice: 'r, the English r', sounds: ['r'] },
    shin: { sound: 'sh, the English sh sound, with its dot at the right; with the dot at the left (sin) it is s', choice: 'sh, the English sh sound', sounds: ['sh', 's'] },
    tav: one('t'),
  };
  const vowels: Record<string, SoundLesson> = {
    patach: one('a'),
    qamats: { ...one('a'), also: 'In a closed syllable that is not stressed it is o (a qamats qatan): כָּל is kol.' },
    segol: { sound: `${keyed('eh')}, at the end of a syllable; before a consonant just ${keyed('e')}`, choice: choice('eh'), sounds: ['eh', 'e'] },
    tsere: { sound: `${keyed('eh')}, at the end of a syllable; before a consonant just ${keyed('e')}`, choice: choice('eh'), sounds: ['eh', 'e'], also: 'With a yod after it, it is ay.' },
    hiriq: one('ee'),
    holam: one('o'),
    qubuts: one('oo'),
    shuruq: { sound: `${keyed('oo')}, the vav with a dot inside it`, choice: choice('oo'), sounds: ['oo'] },
    shewa: { sound: `${keyed('e')} when it is said, at the start of a word or after a long vowel (eh in the middle of a word); nothing when it only closes a syllable`, choice: choice('e'), sounds: ['e', 'eh'] },
  };
  const lessons: Record<string, SoundLesson> = {};
  for (const [name, lesson] of Object.entries(letters)) lessons[`he-letter-${name}`] = lesson;
  for (const [name, lesson] of Object.entries(vowels)) lessons[`he-vowel-${name}`] = lesson;
  return lessons;
}

/** What the tutor is told of the Israeli scheme: the rules the respelling writes by, and the sounds in the reader's accent's words (`say`). tests/unit/hebrew-respell.test.ts holds its examples. */
export const hebrewTutorGuide = (say: SoundWords): string =>
  'Israeli Hebrew, as Hebrew is spoken in Israel today: never by English spelling habit. ' +
  'The app respells a pointed word in syllables, the stressed one in capitals: בְּרֵאשִׁית is be-reh-SHEET, נִינְוֵה is nee-neh-VEH, הָאָרֶץ is ha-A-rets. ' +
  `The vowels, each ${say.hintedBy}: ${['a', 'e', 'ee', 'o', 'oo'].map(say.asIn).join('; ')}. ` +
  'A segol or tsere at the end of a syllable is eh; a shewa is e when it is said (at the start of a word or after a long vowel), and nothing when it only closes a syllable. ' +
  'ai is a patach or qamats with a yod, ay a tsere with a yod. ' +
  `ב, כ and פ are ${say.asIn('v')}, kh and f without a dot inside, and b, k and p with one; ו is v; ח and כ are ${say.asIn('kh')}; צ is ts; שׁ is sh and שׂ is s. ` +
  'The alef and the ayin are not said, and a final he is silent. A dot inside a letter that is not b, k or p only doubles it, which is not said.';
