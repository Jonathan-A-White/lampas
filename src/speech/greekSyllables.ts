// src/speech/greekSyllables.ts — a Greek word cut into syllables in Greek letters, the marks left where they were. The tutor lists syllables
// for a Sound it out question and the app reads them aloud one after another; this is the app's check that those syllables are good
// (mw-5r3p30.241): they spell the word and no boundary falls inside a diphthong. When they do not, the word is cut here instead.
// The rules are the ones modern.ts respells by: a pair is one vowel sound unless the first letter is stressed or the second has a diaeresis.
import { ONSETS } from './schemes/modern';

interface Piece {
  /** the letter with its marks, as written */
  text: string;
  /** the bare lower-case letter (a final sigma is a sigma) */
  ch: string;
  /** an acute, grave or circumflex sits on it */
  stress: boolean;
  /** a diaeresis sits on it: it does not join the letter before it */
  split: boolean;
}

const VOWELS = 'αεηιουω';
/** The pairs of vowel letters that say one sound. */
const DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ', 'ηυ']);

const isMark = (code: number): boolean => code >= 0x300 && code <= 0x36f;

function piecesOf(word: string): Piece[] {
  const out: Piece[] = [];
  for (const c of word.normalize('NFD')) {
    const code = c.codePointAt(0) ?? 0;
    const last = out[out.length - 1];
    if (isMark(code) && last) {
      last.text += c;
      if (code === 0x301 || code === 0x300 || code === 0x342) last.stress = true;
      if (code === 0x308) last.split = true;
    } else {
      const lower = c.toLowerCase();
      out.push({ text: c, ch: lower === 'ς' ? 'σ' : lower, stress: false, split: false });
    }
  }
  return out;
}

const isVowel = (p: Piece | undefined): p is Piece => p !== undefined && VOWELS.includes(p.ch);

/** Whether `b` joins `a` in one vowel sound. */
const joins = (a: Piece, b: Piece | undefined): boolean => isVowel(b) && !b.split && !a.stress && DIPHTHONGS.has(a.ch + b.ch);

/** Where the consonants between two vowels are cut: the longest tail that can open a Greek syllable goes with the next one. */
function cutCluster(cluster: Piece[]): number {
  for (let s = 0; s < cluster.length; s++) {
    const tail = cluster.slice(s);
    if (tail.length === 1 || (tail.length <= 3 && ONSETS.has(tail.map((p) => p.ch).join('')))) return s;
  }
  return cluster.length;
}

/** The word in syllables, in Greek letters (NFC): 'ταῦτα' is 'ταῦ', 'τα'. A word with no vowel is one piece. */
export function greekSyllables(word: string): string[] {
  const pieces = piecesOf(word);
  // where each vowel sound starts and how many letters it takes
  const nuclei: { at: number; length: number }[] = [];
  for (let i = 0; i < pieces.length; ) {
    if (!isVowel(pieces[i])) {
      i += 1;
      continue;
    }
    const length = joins(pieces[i], pieces[i + 1]) ? 2 : 1;
    nuclei.push({ at: i, length });
    i += length;
  }
  if (nuclei.length === 0) return word.length > 0 ? [word.normalize('NFC')] : [];
  const starts = [0];
  for (let k = 0; k + 1 < nuclei.length; k++) {
    const from = nuclei[k].at + nuclei[k].length;
    starts.push(from + cutCluster(pieces.slice(from, nuclei[k + 1].at)));
  }
  return starts.map((start, k) => pieces.slice(start, starts[k + 1] ?? pieces.length).map((p) => p.text).join('').normalize('NFC'));
}

/** Whether a boundary between two of these syllables falls inside a diphthong (αυ, ευ, ηυ, ου, αι, ει, οι, υι), where the second letter has no diaeresis. */
export function splitsDiphthong(syllables: string[]): boolean {
  for (let i = 0; i + 1 < syllables.length; i++) {
    const before = piecesOf(syllables[i]);
    const after = piecesOf(syllables[i + 1]);
    const last = before[before.length - 1];
    if (last && isVowel(last) && joins(last, after[0])) return true;
  }
  return false;
}

const fold = (text: string): string => text.normalize('NFC').toLowerCase();

/**
 * The syllables to read aloud for a Sound it out question about `form`: the tutor's `syllables` when joined they spell the word and none
 * cuts a diphthong in two, else the app's own cut of the word. (A tutor that lists τα, ῦ, τα for ταῦτα is read as ταῦ, τα.)
 */
export function checkedSyllables(form: string, syllables: string[]): string[] {
  const spells = syllables.length > 0 && fold(syllables.join('')) === fold(form);
  return spells && !splitsDiphthong(syllables) ? syllables : greekSyllables(form);
}
