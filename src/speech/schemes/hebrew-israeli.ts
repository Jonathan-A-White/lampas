// src/speech/schemes/hebrew-israeli.ts — Hebrew as Israelis say it today (mw-5vvlay.1), as a scheme of the one registry (mw-gdcyf98.5): the pointed word respelt in syllables an
// English reader can say, the stressed one in capitals ('be-reh-SHEET'), as the Greek schemes do; docs/pronunciation.md 'Hebrew' lists the rules. The text is spoken as written,
// pointed, to the phone's he-IL voice, which says the points as modern Hebrew does; the cantillation marks (the accents of the Masoretic text, which a voice has no sound for) are
// taken off first so it does not stumble on them. The cantillation also tells the respelling where the stress falls.
import { HEBREW_LANG } from '../languages';
import type { Pronunciation, SoundGuide } from '../pronunciation';
import type { SoundId } from '../sounds';
import { HEBREW_HEARD_AS, HEBREW_LETTER_NAMES, hebrewLessons, hebrewTutorGuide } from './hebrew-israeli-lessons';

/** The cantillation marks: the accents U+0591 to U+05AF, the meteg U+05BD, the rafe U+05BF, the paseq U+05C0, the sof pasuq U+05C3 and the upper and lower dots U+05C4 and U+05C5 and the
 * nun hafukha U+05C6. Not U+05C7, the qamats qatan, which is a vowel; nor the vowel points U+05B0 to U+05BB, the dagesh U+05BC, the maqaf U+05BE and the shin and sin dots U+05C1 and U+05C2. */
const CANTILLATION = /[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]/gu;

/** `text` without its cantillation marks: the letters, the vowel points and everything that is not Hebrew stay as they are. */
export const stripCantillation = (text: string): string => text.replace(CANTILLATION, '');

type Vowel = 'hatafSegol' | 'hatafPatach' | 'hatafQamats' | 'hiriq' | 'tsere' | 'segol' | 'patach' | 'qamats' | 'holam' | 'qubuts' | 'shuruq';

const VOWEL_OF: Readonly<Record<number, Vowel>> = {
  0x5b1: 'hatafSegol', 0x5b2: 'hatafPatach', 0x5b3: 'hatafQamats', 0x5b4: 'hiriq', 0x5b5: 'tsere', 0x5b6: 'segol', 0x5b7: 'patach', 0x5b8: 'qamats',
  0x5b9: 'holam', 0x5ba: 'holam', 0x5bb: 'qubuts', 0x5c7: 'qamats',
};

/** How each vowel is written in a syllable that is open (`open`) and one a consonant closes (`closed`): a segol or tsere is 'eh' at the end of a syllable, so it is not read 'ee',
 * and 'e' before a consonant ('rets', 'shekh'). */
const VOWEL_TEXT: Readonly<Record<Vowel, { open: string; closed: string }>> = {
  hatafSegol: { open: 'e', closed: 'e' },
  hatafPatach: { open: 'a', closed: 'a' },
  hatafQamats: { open: 'o', closed: 'o' },
  hiriq: { open: 'ee', closed: 'ee' },
  tsere: { open: 'eh', closed: 'e' },
  segol: { open: 'eh', closed: 'e' },
  patach: { open: 'a', closed: 'a' },
  qamats: { open: 'a', closed: 'a' },
  holam: { open: 'o', closed: 'o' },
  qubuts: { open: 'oo', closed: 'oo' },
  shuruq: { open: 'oo', closed: 'oo' },
};

/** The consonant a letter says, and the letters whose sound turns on a dagesh (bet, kaf, pe) or a dot (shin). The alef and the ayin are not said (the Israeli voice does not). */
const CONSONANT: Readonly<Record<string, string>> = {
  א: '', ב: 'v', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'kh', ט: 't', י: 'y', כ: 'kh', ך: 'kh', ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n',
  ס: 's', ע: '', פ: 'f', ף: 'f', צ: 'ts', ץ: 'ts', ק: 'k', ר: 'r', ש: 'sh', ת: 't',
};
const HARD: Readonly<Record<string, string>> = { ב: 'b', כ: 'k', פ: 'p' };
/** The letters whose dagesh is the hard sound at the start of a word and a doubling inside it. */
const BEGADKEFAT = 'בגדכךפףת';

/** One letter with the marks that stand on it. */
interface Cluster {
  letter: string;
  vowel?: Vowel;
  shewa: boolean;
  dagesh: boolean;
  sin: boolean;
  /** the stress-bearing cantillation mark on it, if there is one */
  accent?: number;
  meteg: boolean;
  /** a letter that only lengthens the vowel before it, or has none of its own (alef, a final he ...): it adds no sound */
  silent: boolean;
  /** what a yod after a patach or qamats ('ai') or a tsere ('ay') adds to the vowel */
  glide?: string;
  /** a patach before a final ח, ע or ה with a mappiq, which is said before the letter */
  furtive: boolean;
}

/** The accents written on the first letter whatever syllable the stress falls on (yetiv, geresh muqdam, telisha gedola, dehi) and the masora circle: no sign of the stress. */
const NO_STRESS_SIGN = new Set([0x59a, 0x59d, 0x5a0, 0x5ad, 0x5af]);

function clustersOf(word: string): { clusters: Cluster[]; maqaf: boolean; verseEnd: boolean } {
  const clusters: Cluster[] = [];
  let maqaf = false;
  let verseEnd = false;
  for (const c of word.normalize('NFD')) {
    const code = c.codePointAt(0) ?? 0;
    // whatever follows the sof pasuq (the פ and ס that close a section) is not a letter of the word
    if (verseEnd) continue;
    if (code >= 0x5d0 && code <= 0x5ea) clusters.push({ letter: c, shewa: false, dagesh: false, sin: false, meteg: false, silent: false, furtive: false });
    else if (code === 0x5be) maqaf = true;
    else if (code === 0x5c3) verseEnd = true;
    else if (clusters.length > 0) {
      const at = clusters[clusters.length - 1];
      if (code === 0x5b0) at.shewa = true;
      else if (VOWEL_OF[code]) at.vowel = VOWEL_OF[code];
      else if (code === 0x5bc) at.dagesh = true;
      else if (code === 0x5c2) at.sin = true;
      else if (code === 0x5bd) at.meteg = true;
      else if (code >= 0x591 && code <= 0x5af && !NO_STRESS_SIGN.has(code)) at.accent = code;
    }
  }
  return { clusters, maqaf, verseEnd };
}

/** Folds the letters that only carry a vowel into the letter before them (a vav with a holam or a dot, a yod after a hiriq ...) and marks the ones that are not said. */
function foldMatres(clusters: Cluster[]): void {
  const bare = (c: Cluster): boolean => !c.vowel && !c.shewa;
  // the vav first, so that the letter it gives its vowel to (an alef, a yod) is not taken for a bare one
  clusters.forEach((c, i) => {
    const prev = clusters[i - 1];
    if (c.letter === 'ו' && c.vowel === 'holam' && prev && bare(prev)) {
      prev.vowel = 'holam';
      c.silent = true;
      c.vowel = undefined;
    } else if (c.letter === 'ו' && c.dagesh && bare(c)) {
      if (prev && bare(prev)) {
        prev.vowel = 'shuruq';
        c.silent = true;
      } else if (!prev) {
        // a vav with a dot at the start of a word is the vowel u alone ('and'): a letter that is not said, with the vowel
        c.vowel = 'shuruq';
        c.letter = 'א';
      }
    }
  });
  clusters.forEach((c, i) => {
    if (c.silent) return;
    const prev = clusters.slice(0, i).reverse().find((p) => !p.silent);
    const last = i === clusters.length - 1;
    if (c.letter === 'י' && bare(c) && !c.dagesh && prev?.vowel) {
      if (prev.vowel === 'hiriq' || prev.vowel === 'segol') c.silent = true;
      else if (prev.vowel === 'tsere') {
        prev.glide = 'ay';
        c.silent = true;
      } else if (prev.vowel === 'patach' || prev.vowel === 'qamats') {
        c.silent = true;
        // the ending ָיו is 'av' (אֵלָיו 'eh-LAV'), not 'aiv': the yod only lengthens the qamats
        const ending = clusters[i + 1]?.letter === 'ו' && i + 2 === clusters.length && bare(clusters[i + 1]) && prev.vowel === 'qamats';
        if (!ending) prev.glide = 'ai';
      }
    } else if (c.letter === 'ה' && bare(c) && !c.dagesh && last && prev) c.silent = true;
    else if (c.letter === 'א' && bare(c) && prev) c.silent = true;
    else if ('חעה'.includes(c.letter) && c.vowel === 'patach' && last && prev && clusters.slice(0, i).some((p) => p.vowel) && (c.letter !== 'ה' || c.dagesh)) c.furtive = true;
  });
}

const LONG: ReadonlySet<Vowel | undefined> = new Set<Vowel | undefined>(['qamats', 'tsere', 'holam', 'shuruq']);

/** Which shewas are said: the first letter of a word, a letter after a long vowel, the second of two, a letter the dagesh doubles, and one before the same letter; not the last letter. `guide`
 * is the data's transliteration, whose ə marks the said ones: where the rule's count and the guide's differ, the guide settles which shewas (earliest first). */
function vocalShewas(clusters: Cluster[], guide?: string): ReadonlySet<number> {
  const vocal = new Set<number>();
  const silentShewas: number[] = [];
  let prevShewa: 'vocal' | 'silent' | null = null;
  let longBefore = false;
  let heardVowel = false;
  clusters.forEach((c, i) => {
    if (c.shewa && !c.vowel) {
      const doubled = c.dagesh && (!BEGADKEFAT.includes(c.letter) || heardVowel);
      const says =
        i === 0 ||
        (i < clusters.length - 1 &&
          (prevShewa === 'silent' || (prevShewa === null && (longBefore || doubled || clusters[i + 1]?.letter === c.letter))));
      if (says) vocal.add(i);
      else if (i > 0) silentShewas.push(i);
      prevShewa = says ? 'vocal' : 'silent';
    } else if (!c.silent) {
      prevShewa = null;
    }
    if (c.vowel && !c.silent) {
      heardVowel = true;
      longBefore = LONG.has(c.vowel) || c.glide === 'ay' || (c.vowel === 'hiriq' && clusters[i + 1]?.letter === 'י' && clusters[i + 1].silent);
      if (c.glide === 'ai') longBefore = false;
    } else if (c.shewa && vocal.has(i)) {
      heardVowel = true;
      longBefore = false;
    }
  });
  const said = guide === undefined ? null : [...guide].filter((ch) => ch === 'ə').length;
  if (said !== null && said !== vocal.size) {
    if (said > vocal.size) {
      for (const i of silentShewas) if (vocal.size < said && i < clusters.length - 1) vocal.add(i);
    } else {
      for (const i of [...vocal].filter((v) => v > 0).reverse()) if (vocal.size > said) vocal.delete(i);
    }
  }
  return vocal;
}

/** One syllable of the respelling while it is built. */
interface Syllable {
  onset: string;
  vowel: Vowel | 'shewa' | 'a';
  glide?: string;
  coda: string;
  /** the cantillation mark on it, if any */
  accent?: number;
  meteg: boolean;
  /** a shewa said in the middle of the word, written 'eh' so that it is not read 'ee' */
  medial: boolean;
  /** an alef or a final he that is not said closes it (the second syllable of דֶּשֶׁא) */
  quiet?: boolean;
}

const consonantOf = (c: Cluster): string => {
  if (c.letter === 'ש') return c.sin ? 's' : 'sh';
  if (c.dagesh && HARD[c.letter]) return HARD[c.letter];
  return CONSONANT[c.letter] ?? '';
};

function syllablesOf(clusters: Cluster[], vocal: ReadonlySet<number>): Syllable[] {
  const syllables: Syllable[] = [];
  let onset = '';
  clusters.forEach((c, i) => {
    const sound = consonantOf(c);
    const nucleus: Syllable['vowel'] | null = c.furtive ? 'a' : c.vowel ? c.vowel : c.shewa && vocal.has(i) ? 'shewa' : null;
    const last = syllables[syllables.length - 1];
    if (c.silent) {
      if (last) {
        last.accent ??= c.accent;
        last.meteg ||= c.meteg;
        if (c.letter === 'א' || c.letter === 'ה') last.quiet = true;
      }
      return;
    }
    if (c.furtive) {
      syllables.push({ onset: '', vowel: 'a', coda: sound, accent: c.accent, meteg: c.meteg, medial: false });
    } else if (nucleus !== null) {
      syllables.push({ onset: onset + sound, vowel: nucleus, glide: c.glide, coda: '', accent: c.accent, meteg: c.meteg, medial: nucleus === 'shewa' && i > 0 });
      onset = '';
    } else if (last) {
      last.coda += sound;
      last.accent ??= c.accent;
      last.meteg ||= c.meteg;
    } else onset += sound;
  });
  return syllables;
}

/** Whether the word ends as a segolate does (sefer, melekh): two syllables stressed on the first. */
function segolate(syllables: Syllable[]): boolean {
  const last = syllables[syllables.length - 1];
  const before = syllables[syllables.length - 2];
  return (
    syllables.length >= 2 &&
    (last.vowel === 'segol' || last.vowel === 'patach') &&
    (last.coda !== '' || last.quiet === true) &&
    before.coda === '' &&
    ['segol', 'qamats', 'holam', 'tsere', 'hiriq', 'patach'].includes(before.vowel) &&
    !last.glide
  );
}

function textOf(s: Syllable, stressed: boolean): string {
  const closed = s.coda !== '';
  let vowel: string;
  if (s.glide) vowel = s.glide;
  else if (s.vowel === 'shewa') vowel = s.medial ? 'eh' : 'e';
  else if (s.vowel === 'a') vowel = 'a';
  // a qamats in a closed syllable that is not stressed is the o of 'kol' (the qamats qatan)
  else if (s.vowel === 'qamats' && closed && !stressed && !s.meteg) vowel = 'o';
  else vowel = VOWEL_TEXT[s.vowel][closed ? 'closed' : 'open'];
  return s.onset + vowel + s.coda;
}

/** The syllable the cantillation puts the stress on, or -1. A word with two different marks (a munach on a secondary stress, a zaqef on the main one) is stressed by the last; the
 * same mark twice (the pashta, written on the stress and again on the last letter) is the first. */
function markedSyllable(syllables: Syllable[]): number {
  const marks = syllables.flatMap((s, i) => (s.accent === undefined ? [] : [{ at: i, code: s.accent }]));
  if (marks.length === 0) return -1;
  return (marks.every((m) => m.code === marks[0].code) ? marks[0] : marks[marks.length - 1]).at;
}

/** A pointed Hebrew word as syllables an English reader can say, the stressed one in capitals ('בְּרֵאשִׁית' is 'be-reh-SHEET'). The stress is the syllable of the cantillation's
 * accent (or the silluq at a verse's end), the last syllable of a word with none, and the first of one that ends as a segolate; a word joined to the next by a maqaf, and a word of
 * one syllable, has none. A text with no Hebrew letter comes back as it is. */
export function respellHebrew(word: string, guide?: string): string {
  const { clusters, maqaf, verseEnd } = clustersOf(word);
  if (clusters.length === 0) return word;
  foldMatres(clusters);
  const syllables = syllablesOf(clusters, vocalShewas(clusters, guide));
  if (syllables.length === 0) return '';
  const marked = markedSyllable(syllables);
  const silluq = verseEnd ? syllables.findIndex((s) => s.meteg) : -1;
  const stressed = maqaf ? -1 : marked >= 0 ? marked : silluq >= 0 ? silluq : segolate(syllables) ? syllables.length - 2 : syllables.length - 1;
  return syllables
    .map((s, i) => {
      const text = textOf(s, i === stressed);
      return syllables.length > 1 && i === stressed ? text.toUpperCase() : text;
    })
    .filter((s) => s !== '')
    .join('-');
}

/** The standard sounds the Israeli respelling writes (./hebrew-israeli-lessons.ts teaches them; the optional course 'Learn the IPA sounds' teaches them as IPA, mw-gdcyf98.24). The h, r, sh, ts and
 * y are ones Greek has no use for: sounds.ts gained '/h/', '/ʁ/', '/ʃ/', '/ts/' and '/j/' for them (the Israeli resh is the back r; the lessons call it 'the English r', which the key word 'red' keeps). */
const ISRAELI_SOUNDS: Readonly<Record<string, SoundId>> = {
  a: '/a/', eh: '/e/', e: '/e/', ee: '/i/', o: '/o/', oo: '/u/',
  v: '/v/', f: '/f/', z: '/z/', s: '/s/', b: '/b/', p: '/p/', d: '/d/', t: '/t/', g: '/ɡ/', k: '/k/', m: '/m/', n: '/n/', l: '/l/', kh: '/x/', y: '/j/',
  h: '/h/', r: '/ʁ/', sh: '/ʃ/', ts: '/ts/',
};

/** What the course 'Learn the IPA sounds' teaches of each sound the Israeli scheme says (mw-gdcyf98.24): the Hebrew letters (or a vowel point on the letter bet, as a carrier) that make it, and a
 * Hebrew word the voice says that has it, at its start or inside it. Each word is held to the respelling by tests/unit/hebrew-ipa-course.test.ts (it has the sound, starts with it where `at`
 * says so, and none of the sound's confusable partners). The alef and the ayin are not said (the Israeli voice does not), so they have no sound to teach. */
export const ISRAELI_SOUND_GUIDE: Readonly<Partial<Record<SoundId, SoundGuide>>> = {
  '/a/': { letters: ['בַ (patach)', 'בָ (qamats)'], word: 'אָב', at: 'start' },
  '/e/': { letters: ['בֶ (segol)', 'בֵ (tsere)', 'בְ (a shewa that is said)'], word: 'אֵל', at: 'start' },
  '/i/': { letters: ['בִ (hiriq)', 'בִי (hiriq with a yod)'], word: 'אִישׁ', at: 'start' },
  '/o/': { letters: ['בֹ (holam)', 'וֹ (vav with a dot above)'], word: 'אוֹר', at: 'start' },
  '/u/': { letters: ['בֻ (qubuts)', 'וּ (vav with a dot inside)'], word: 'אוּר', at: 'start' },
  '/v/': { letters: ['ו (vav)', 'ב (bet, without a dot inside)'], word: 'דָּוִד', at: 'inside' },
  '/f/': { letters: ['פ (pe, without a dot inside)', 'ף (final pe)'], word: 'סֵפֶר', at: 'inside' },
  '/z/': { letters: ['ז (zayin)'], word: 'זָהָב', at: 'start' },
  '/s/': { letters: ['ס (samekh)', 'שׂ (sin: shin with its dot at the left)'], word: 'סוּס', at: 'start' },
  '/b/': { letters: ['בּ (bet, with a dot inside)'], word: 'בֵּן', at: 'start' },
  '/p/': { letters: ['פּ (pe, with a dot inside)'], word: 'פֶּתַח', at: 'start' },
  '/d/': { letters: ['ד (dalet)'], word: 'דָּג', at: 'start' },
  '/t/': { letters: ['ט (tet)', 'ת (tav)'], word: 'תּוֹרָה', at: 'start' },
  '/ɡ/': { letters: ['ג (gimel)'], word: 'גָּדוֹל', at: 'start' },
  '/k/': { letters: ['כּ (kaf, with a dot inside)', 'ק (qof)'], word: 'כָּתַב', at: 'start' },
  '/m/': { letters: ['מ (mem)', 'ם (final mem)'], word: 'מֶלֶךְ', at: 'start' },
  '/n/': { letters: ['נ (nun)', 'ן (final nun)'], word: 'נֵר', at: 'start' },
  '/l/': { letters: ['ל (lamed)'], word: 'לֶחֶם', at: 'start' },
  '/x/': { letters: ['ח (chet)', 'כ (kaf, without a dot inside)', 'ך (final kaf)'], word: 'חָכָם', at: 'start' },
  '/h/': { letters: ['ה (he; silent at the end of a word)'], word: 'הַר', at: 'start' },
  '/ʁ/': { letters: ['ר (resh)'], word: 'רֶגֶל', at: 'start' },
  '/ʃ/': { letters: ['שׁ (shin, with its dot at the right)'], word: 'שֵׁם', at: 'start' },
  '/ts/': { letters: ['צ (tsade)', 'ץ (final tsade)'], word: 'צֵל', at: 'start' },
  '/j/': { letters: ['י (yod)'], word: 'יָד', at: 'start' },
};

/** The symbols of the respelling, longest first: a pair of letters is one symbol ('sh') before it is two ('s', 'h'). 'ai' and 'ay' are the vowel with the yod it joins. */
const RESPELT_SYMBOLS = /sh|kh|ts|ee|oo|eh|ai|ay|[abdefghklmnoprstvyz]/g;

/** The standard sounds `word` is said with, in order, as the respelling writes them (`ai` is a and the glide j, `ay` is e and j). The course 'Learn the IPA sounds' holds each lesson's word to it. */
export function soundsInHebrew(word: string): SoundId[] {
  const symbols = respellHebrew(word).toLowerCase().match(RESPELT_SYMBOLS) ?? [];
  return symbols.flatMap((symbol): SoundId[] => (symbol === 'ai' ? ['/a/', '/j/'] : symbol === 'ay' ? ['/e/', '/j/'] : [ISRAELI_SOUNDS[symbol]]));
}

export const ISRAELI: Pronunciation = {
  id: 'israeli',
  language: 'he',
  label: 'Israeli',
  lang: HEBREW_LANG,
  scoringLang: 'he',
  note: "Modern Israeli Hebrew, as the phone's Hebrew voice says the pointed text.",
  respell: respellHebrew,
  sounds: ISRAELI_SOUNDS,
  soundGuide: ISRAELI_SOUND_GUIDE,
  soundsIn: soundsInHebrew,
  // a Hebrew word of one letter (a prefix: ו, ב, ל ...) is not said as a sound of its own: the voice names it or says it with its vowel
  loneLetterForm: () => null,
  loneLetterClip: () => null,
  voiceForm: stripCantillation,
  letterForm: (letter) => letter,
  letterNames: HEBREW_LETTER_NAMES,
  heardAs: HEBREW_HEARD_AS,
  tutorGuide: hebrewTutorGuide,
  lessons: hebrewLessons,
};
