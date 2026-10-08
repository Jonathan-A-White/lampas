// src/speech/schemes/modern.ts — Modern Greek as a respelling: the Greek word in syllables an English reader can say,
// the stressed syllable in capitals ("hree-STO"). Written from Modern Greek's own rules (docs/pronunciation.md lists
// them); the other schemes (Erasmian next) are further files beside this one, registered in ../pronunciation.ts.
import type { Pronunciation } from '../pronunciation';

interface Letter {
  ch: string;
  /** an acute, grave or circumflex sits on it */
  stress: boolean;
  /** a diaeresis sits on it: it does not join the letter before it */
  split: boolean;
}

/** The word as bare lower-case letters; breathing marks, the iota under a letter and everything not a letter are dropped. */
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

interface Tok {
  kind: 'vowel' | 'consonant';
  text: string;
  /** the Greek letter(s) it stands for: decides which clusters can open a syllable */
  key: string;
  stress?: boolean;
  /** a vowel said at the front of the mouth (e, i): a g before it is y, a χ is h */
  front?: boolean;
  /** between two vowels this one ends the syllable before it (the n of ντ, the z of σμ) */
  coda?: boolean;
  /** a hard g after a nasal: written gh when it opens the stressed syllable before e or i, so it is not read as j */
  hardG?: boolean;
}

const VOICED = 'βγδζλμνρ';
const VOWELS = 'αεηιουω';
const SINGLE: Record<string, string> = {
  β: 'v', δ: 'dh', ζ: 'z', θ: 'th', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks', π: 'p', ρ: 'r', τ: 't', φ: 'f', ψ: 'ps',
};
const VOWEL_SOUND: Record<string, string> = { α: 'a', ε: 'e', η: 'ee', ι: 'ee', υ: 'ee', ο: 'o', ω: 'o' };
const DIGRAPH_SOUND: Record<string, string> = { αι: 'e', ει: 'ee', οι: 'ee', υι: 'ee', ου: 'oo' };

/** Clusters that can open a Greek syllable; any single consonant can. */
const ONSETS = new Set(
  [
    ...['π', 'β', 'φ', 'κ', 'γ', 'χ'].flatMap((a) => [`${a}ρ`, `${a}λ`]),
    'τρ', 'δρ', 'θρ',
    'στ', 'σκ', 'σπ', 'σθ', 'σχ', 'σφ',
    'πν', 'πτ', 'κτ', 'φθ', 'χθ', 'γν', 'κν', 'μν', 'θν', 'κμ',
    'στρ', 'σπρ', 'σπλ', 'σκρ', 'σκλ',
  ],
);

interface Vowel {
  text: string;
  front: boolean;
  stress: boolean;
  length: number;
}

function vowelAt(letters: Letter[], i: number): Vowel | null {
  const a = letters[i];
  if (!a || !VOWELS.includes(a.ch)) return null;
  const b = letters[i + 1];
  // a pair is one sound unless the first letter is stressed or the second carries a diaeresis
  if (b && !b.split && !a.stress) {
    const pair = a.ch + b.ch;
    if (DIGRAPH_SOUND[pair]) return { text: DIGRAPH_SOUND[pair], front: pair !== 'ου', stress: b.stress, length: 2 };
    if (b.ch === 'υ' && (a.ch === 'α' || a.ch === 'ε' || a.ch === 'η')) {
      const after = letters[i + 2]?.ch;
      const voiced = after !== undefined && (VOICED.includes(after) || VOWELS.includes(after));
      const base = a.ch === 'α' ? 'a' : a.ch === 'ε' ? 'e' : 'ee';
      return { text: base + (voiced ? 'v' : 'f'), front: a.ch !== 'α', stress: b.stress, length: 2 };
    }
  }
  return { text: VOWEL_SOUND[a.ch], front: 'εηιυ'.includes(a.ch), stress: a.stress, length: 1 };
}

/** The first vowel at or after `i`, skipping consonants. */
function nextVowel(letters: Letter[], i: number): Vowel | null {
  for (let j = i; j < letters.length; j++) {
    const v = vowelAt(letters, j);
    if (v) return v;
  }
  return null;
}

function tokensOf(letters: Letter[]): Tok[] {
  const toks: Tok[] = [];
  const seenVowel = () => toks.some((t) => t.kind === 'vowel');
  const consonant = (text: string, key: string, extra: Partial<Tok> = {}) => toks.push({ kind: 'consonant', text, key, ...extra });
  const kh = (i: number) => (nextVowel(letters, i)?.front ? 'h' : 'kh');

  for (let i = 0; i < letters.length; ) {
    const ch = letters[i].ch;
    const next = letters[i + 1]?.ch;
    const v = vowelAt(letters, i);
    if (v) {
      toks.push({ kind: 'vowel', text: v.text, key: '', stress: v.stress, front: v.front });
      i += v.length;
      continue;
    }
    if (ch === 'μ' && next === 'π') {
      if (seenVowel()) consonant('m', 'μ', { coda: true });
      consonant('b', 'β');
      i += 2;
    } else if (ch === 'ν' && next === 'τ') {
      if (seenVowel()) consonant('n', 'ν', { coda: true });
      consonant('d', 'δ');
      i += 2;
    } else if (ch === 'γ' && (next === 'γ' || next === 'κ')) {
      if (seenVowel()) consonant('n', 'ν', { coda: true });
      consonant('g', 'γ', { hardG: true });
      i += 2;
    } else if (ch === 'γ' && next === 'χ') {
      consonant('ng', 'ν', { coda: true });
      consonant(kh(i + 2), 'χ');
      i += 2;
    } else if (ch === 'γ' && next === 'ξ') {
      consonant('n', 'ν', { coda: true });
      consonant('ks', 'ξ');
      i += 2;
    } else if (ch === 'γ') {
      consonant(vowelAt(letters, i + 1)?.front ? 'y' : 'gh', 'γ');
      i += 1;
    } else if (ch === 'χ') {
      consonant(kh(i + 1), 'χ');
      i += 1;
    } else if (ch === 'σ') {
      if (next !== undefined && VOICED.includes(next)) consonant('z', 'σ', { coda: true });
      else consonant('s', 'σ');
      i += 1;
    } else if (SINGLE[ch]) {
      const last = toks[toks.length - 1];
      // a doubled consonant is said once
      if (!(last && last.kind === 'consonant' && last.key === ch && last.text === SINGLE[ch])) consonant(SINGLE[ch], ch);
      i += 1;
    } else {
      i += 1;
    }
  }
  return toks;
}

interface Syllable {
  onset: Tok[];
  nucleus: Tok;
  coda: Tok[];
}

/** Cuts the consonants between two vowels: the longest tail that can open a syllable goes to the next one,
 * but a token marked `coda` always stays with the vowel before it. */
function splitCluster(cluster: Tok[]): number {
  let forced = 0;
  cluster.forEach((t, i) => {
    if (t.coda) forced = i + 1;
  });
  for (let s = forced; s < cluster.length; s++) {
    const tail = cluster.slice(s);
    if (tail.length === 1 || (tail.length <= 3 && ONSETS.has(tail.map((t) => t.key).join('')))) return s;
  }
  return cluster.length;
}

function syllablesOf(toks: Tok[]): Syllable[] {
  const at = toks.flatMap((t, i) => (t.kind === 'vowel' ? [i] : []));
  if (at.length === 0) return [];
  const syllables: Syllable[] = at.map((i) => ({ onset: [], nucleus: toks[i], coda: [] }));
  syllables[0].onset = toks.slice(0, at[0]);
  syllables[at.length - 1].coda = toks.slice(at[at.length - 1] + 1);
  for (let k = 0; k + 1 < at.length; k++) {
    const cluster = toks.slice(at[k] + 1, at[k + 1]);
    const cut = splitCluster(cluster);
    syllables[k].coda = cluster.slice(0, cut);
    syllables[k + 1].onset = cluster.slice(cut);
  }
  return syllables;
}

/** The Greek word in Modern Greek sounds: 'χριστῷ' is 'hree-STO'. */
export function respellModern(word: string): string {
  const toks = tokensOf(lettersOf(word));
  const syllables = syllablesOf(toks);
  // a word with no vowel (the elided δ') is its consonants
  if (syllables.length === 0) return toks.map((t) => t.text).join('');
  const stressed = syllables.findIndex((s) => s.nucleus.stress);
  const parts = syllables.map((s, i) => {
    const onset = s.onset.map((t) => (t.hardG && i === stressed && s.nucleus.front ? 'gh' : t.text));
    return [...onset, s.nucleus.text, ...s.coda.map((t) => t.text)].join('');
  });
  // one syllable has nothing to be louder than
  return parts.map((p, i) => (i === stressed && parts.length > 1 ? p.toUpperCase() : p)).join('-');
}

export const MODERN: Pronunciation = {
  id: 'modern',
  label: 'Modern Greek',
  lang: 'el-GR',
  scoringLang: 'el',
  note: "How Greek is spoken today, by the phone's Greek voice.",
  respell: respellModern,
};
