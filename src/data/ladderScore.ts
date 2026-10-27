// src/data/ladderScore.ts — how hard a Greek verse or word is to PRONOUNCE (mw-neuq78.1, docs/reading-ladder.md): the score scripts/ladder-el.ts writes
// public/data/ladder/el.json from, and that the reading drill (src/data/readingDrill.ts) orders its words by. Pure. The weights are a first guess.
import { greekSyllables } from '../speech/greekSyllables';

/** The reasons in the order a tie between them is broken: the first listed wins. */
export function reasons(parts: [number, string][]): string[] {
  return parts
    .map(([points, text], order) => ({ points, text, order }))
    .filter((p) => p.points > 0)
    .sort((a, b) => b.points - a.points || a.order - b.order)
    .slice(0, 3)
    .map((p) => p.text);
}

/** What each thing costs. PROVISIONAL: a first guess, to be tuned by hearing him read. */
export const WEIGHTS = {
  /** every word is one more thing to say */
  word: 1,
  /** every syllable of a word after its first */
  syllable: 1,
  /** the longest word, per syllable past LONG_WORD */
  longWord: 2,
  /** a run of two or more consonants inside a word; a run of three or more costs one more */
  cluster: 1,
  /** a pair of vowels said as one sound (αι ει οι υι ου αυ ευ ηυ) */
  diphthong: 1,
  /** a diaeresis: two vowels that are NOT a pair */
  diaeresis: 2,
  /** ξ ψ ζ */
  rareLetter: 2,
  /** γγ γκ γξ γχ: a g that is said ng */
  rarePair: 2,
};
const LONG_WORD = 3;

interface Letter {
  ch: string;
  stress: boolean;
  split: boolean;
}

/** The word as bare lower-case letters with the marks that decide how a pair is read (as modern.ts reads them). */
function lettersOf(word: string): Letter[] {
  const out: Letter[] = [];
  for (const c of word.normalize('NFD').toLowerCase()) {
    const code = c.codePointAt(0) ?? 0;
    if (code >= 0x3b1 && code <= 0x3c9) out.push({ ch: c === 'ς' ? 'σ' : c, stress: false, split: false });
    else if (out.length > 0 && (code === 0x301 || code === 0x300 || code === 0x342)) out[out.length - 1].stress = true;
    else if (out.length > 0 && code === 0x308) out[out.length - 1].split = true;
  }
  return out;
}

const VOWELS = 'αεηιουω';
const PAIRS = new Set(['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ', 'ηυ']);
const RARE_LETTERS = 'ξψζ';
const RARE_PAIRS = new Set(['γγ', 'γκ', 'γξ', 'γχ']);

interface WordFacts {
  syllables: number;
  clusters: number;
  diphthongs: number;
  diaereses: number;
  rareLetters: string[];
  rarePairs: number;
}

function factsOf(word: string): WordFacts | null {
  const letters = lettersOf(word);
  if (letters.length === 0) return null;
  const facts: WordFacts = { syllables: 0, clusters: 0, diphthongs: 0, diaereses: 0, rareLetters: [], rarePairs: 0 };
  // the spelling's syllables, the same in every pronunciation (mw-5r3p30.268: the count the Modern respelling gave, for every word of the text)
  facts.syllables = Math.max(1, greekSyllables(word).length);
  let run = 0;
  const endRun = () => {
    if (run >= 2) facts.clusters += WEIGHTS.cluster + (run >= 3 ? WEIGHTS.cluster : 0);
    run = 0;
  };
  for (let i = 0; i < letters.length; i++) {
    const { ch } = letters[i];
    const next = letters[i + 1];
    if (letters[i].split) facts.diaereses += 1;
    if (RARE_LETTERS.includes(ch)) facts.rareLetters.push(ch);
    if (next && RARE_PAIRS.has(ch + next.ch)) facts.rarePairs += 1;
    if (VOWELS.includes(ch)) {
      endRun();
      if (next && !next.split && !letters[i].stress && PAIRS.has(ch + next.ch)) {
        facts.diphthongs += 1;
        i += 1; // the pair is one sound: its second letter opens no pair of its own
      }
    } else if (letters[i - 1]?.ch !== ch) {
      run += 1; // a doubled consonant is said once
    }
  }
  endRun();
  return facts;
}

/** The score of one verse from its Greek words (as written, with their marks), and up to three reasons for it. */
export function scoreWords(greek: string[]): { score: number; why: string[] } {
  const all = greek.map(factsOf).filter((f): f is WordFacts => f !== null);
  const sum = (pick: (f: WordFacts) => number): number => all.reduce((n, f) => n + pick(f), 0);
  const longest = all.reduce((n, f) => Math.max(n, f.syllables), 0);
  const letters = all.flatMap((f) => f.rareLetters);
  const extra = sum((f) => f.syllables - 1);
  const clusters = sum((f) => f.clusters);
  const diphthongs = sum((f) => f.diphthongs);
  const diaereses = sum((f) => f.diaereses);
  const pairs = sum((f) => f.rarePairs);
  const parts: [number, string][] = [
    [all.length * WEIGHTS.word, `${all.length} ${all.length === 1 ? 'word' : 'words'}`],
    [extra * WEIGHTS.syllable, `${extra + all.length} ${extra + all.length === 1 ? 'syllable' : 'syllables'}`],
    [Math.max(0, longest - LONG_WORD) * WEIGHTS.longWord, `a ${longest}-syllable word`],
    [clusters, `${clusters / WEIGHTS.cluster} consonant ${clusters === WEIGHTS.cluster ? 'cluster' : 'clusters'}`],
    [diphthongs * WEIGHTS.diphthong, `${diphthongs} vowel ${diphthongs === 1 ? 'pair' : 'pairs'}`],
    [diaereses * WEIGHTS.diaeresis, `${diaereses} diaeresis`],
    [letters.length * WEIGHTS.rareLetter, `rare letters ${[...new Set(letters)].join(' ')}`],
    [pairs * WEIGHTS.rarePair, `${pairs} g said ng`],
  ];
  return { score: parts.reduce((n, [points]) => n + points, 0), why: reasons(parts) };
}

// ---- Hebrew (mw-gdcyf98.14, docs/reading-ladder.md 'Hebrew'): the same idea over the words' syllabified transliteration (`tr` of public/data/<book>/<chapter>.json: 'way·hî', 'hag·gə·ḏō·w·lāh') ----

/** What each thing costs in a Hebrew verse. PROVISIONAL: a first guess, to be tuned by hearing him read. */
export const HEBREW_WEIGHTS = {
  /** every word is one more thing to say */
  word: 1,
  /** every syllable of a word after its first */
  syllable: 1,
  /** the longest word, per syllable past LONG_WORD */
  longWord: 2,
  /** a run of two or more consonants inside a word; a run of three or more costs one more */
  cluster: 1,
  /** a shewa (ə) or a reduced vowel (the hatafs): a vowel that is hardly there */
  shewa: 1,
  /** a letter doubled by a dagesh (written twice in the transliteration, said once in Israeli Hebrew) */
  dagesh: 1,
  /** ḥ ḵ ṣ ʿ: the throat and the ts an English reader has no letter for */
  rareLetter: 2,
};

/** The letters of a Hebrew word's transliteration that are an English reader's hardest: ḥ (khet), ḵ (khaf), ṣ (tsadi), ʿ (ayin). */
const HEBREW_RARE = new Set(['ḥ', 'ḵ', 'ṣ', 'ʿ']);
const HEBREW_VOWELS = 'aeiouåɛə';

interface HebrewFacts {
  syllables: number;
  clusters: number;
  shewas: number;
  doublings: number;
  rareLetters: string[];
  /** the form has no vowel to say (an unpointed word, a ketiv, a paragraph sign): it is counted as one word and one syllable, nothing more */
  unsyllabified: boolean;
}

interface Unit {
  /** the letter with its marks, NFC */
  ch: string;
  vowel: boolean;
  /** a stop between sounds: aleph and ayin never join a run of consonants */
  stop: boolean;
  reduced: boolean;
}

/** The transliteration piece as letters with their marks (a breve on a vowel makes it a reduced one). */
function unitsOf(piece: string): Unit[] {
  const out: { base: string; marks: string }[] = [];
  for (const c of piece.normalize('NFD').toLowerCase()) {
    const code = c.codePointAt(0) ?? 0;
    if (code >= 0x300 && code <= 0x36f && out.length > 0) out[out.length - 1].marks += c;
    else if (/\p{L}/u.test(c)) out.push({ base: c, marks: '' });
    else if (code === 0x2018 || code === 0x2bf) out.push({ base: 'ʿ', marks: '' }); // ayin
    else if (code === 0x2019 || code === 0x2be) out.push({ base: 'ʾ', marks: '' }); // aleph
  }
  return out.map(({ base, marks }) => ({
    ch: (base + marks).normalize('NFC'),
    vowel: HEBREW_VOWELS.includes(base),
    stop: base === 'ʾ' || base === 'ʿ',
    reduced: base === 'ə' || (HEBREW_VOWELS.includes(base) && marks.includes('̆')),
  }));
}

const UNSYLLABIFIED: HebrewFacts = { syllables: 1, clusters: 0, shewas: 0, doublings: 0, rareLetters: [], unsyllabified: true };

function hebrewFactsOf(piece: string): HebrewFacts {
  const parts = piece.replace(/[-־]/g, '').split('·').filter((p) => /\p{L}/u.test(p));
  const partUnits = parts.map(unitsOf);
  const sounding = partUnits.filter((u) => u.some((x) => x.vowel));
  if (sounding.length === 0) return UNSYLLABIFIED;
  // a part with no vowel is the letter of the one before ('yō·w·nāh': the w of a holam-vav) or, said apart, the consonant that opens or closes a syllable
  const units = partUnits.filter((u, i) => u.some((x) => x.vowel) || !(i > 0 && u.length === 1 && /^[wy]$/.test(u[0].ch) && partUnits[i - 1].some((x) => x.vowel))).flat();
  const facts: HebrewFacts = { syllables: sounding.length, clusters: 0, shewas: 0, doublings: 0, rareLetters: [], unsyllabified: false };
  let run = 0;
  let before = '';
  const endRun = () => {
    if (run >= 2) facts.clusters += HEBREW_WEIGHTS.cluster + (run >= 3 ? HEBREW_WEIGHTS.cluster : 0);
    run = 0;
  };
  for (const u of units) {
    if (u.reduced) facts.shewas += 1;
    if (HEBREW_RARE.has(u.ch)) facts.rareLetters.push(u.ch);
    if (u.vowel || u.stop) {
      endRun();
      before = '';
    } else if (u.ch === before) {
      facts.doublings += 1; // a doubled consonant is said once, and is no cluster
    } else {
      run += 1;
      before = u.ch;
    }
  }
  endRun();
  return facts;
}

/** A word's transliteration as the pieces it is scored in (a `tr` of two forms is two pieces; a word with no `tr` is one empty piece, counted and not syllabified). */
const piecesOf = (tr: string): string[] => (tr.trim() === '' ? [''] : tr.split(/\s+/).filter(Boolean));

/** The words of a Hebrew verse the scorer cannot syllabify (an unpointed form, a ketiv, a paragraph sign, a word with no `tr`): each as its transliteration, or, with none, its Hebrew `t`. */
export const unsyllabifiedHebrew = (words: readonly { t: string; tr?: string }[]): string[] =>
  words.flatMap((w) => piecesOf(w.tr ?? '').map((piece) => ({ piece, shown: piece === '' ? w.t : piece }))).filter(({ piece }) => hebrewFactsOf(piece).unsyllabified).map(({ shown }) => shown);

/** The score of one Hebrew verse from its words' syllabified transliteration (`tr`, as written with its · between syllables), and up to three reasons for it. A word with no
 * vowel to say, or no `tr` (unsyllabifiedHebrew lists them), is counted as one word and one syllable, nothing more. */
export function scoreHebrewWords(trs: readonly string[]): { score: number; why: string[] } {
  const W = HEBREW_WEIGHTS;
  const all = trs.flatMap(piecesOf).map(hebrewFactsOf);
  const sum = (pick: (f: HebrewFacts) => number): number => all.reduce((n, f) => n + pick(f), 0);
  const longest = all.reduce((n, f) => Math.max(n, f.syllables), 0);
  const letters = all.flatMap((f) => f.rareLetters);
  const extra = sum((f) => f.syllables - 1);
  const clusters = sum((f) => f.clusters);
  const shewas = sum((f) => f.shewas);
  const doublings = sum((f) => f.doublings);
  const parts: [number, string][] = [
    [all.length * W.word, `${all.length} ${all.length === 1 ? 'word' : 'words'}`],
    [extra * W.syllable, `${extra + all.length} ${extra + all.length === 1 ? 'syllable' : 'syllables'}`],
    [Math.max(0, longest - LONG_WORD) * W.longWord, `a ${longest}-syllable word`],
    [clusters, `${clusters / W.cluster} consonant ${clusters === W.cluster ? 'cluster' : 'clusters'}`],
    [shewas * W.shewa, `${shewas} ${shewas === 1 ? 'shewa' : 'shewas'}`],
    [doublings * W.dagesh, `${doublings} doubled ${doublings === 1 ? 'letter' : 'letters'}`],
    [letters.length * W.rareLetter, `rare letters ${[...new Set(letters)].join(' ')}`],
  ];
  return { score: parts.reduce((n, [points]) => n + points, 0), why: reasons(parts) };
}
