// src/speech/schemes/modern.ts — Modern Greek as a respelling: the Greek word in syllables an English reader can say,
// the stressed syllable in capitals ("khree-STO"). Written from Modern Greek's own rules (docs/pronunciation.md lists
// them); the other schemes (Erasmian next) are further files beside this one, registered in ../pronunciation.ts.
import type { Pronunciation } from '../pronunciation';
import { ONSETS } from '../greekSyllables';
import { modernLessons } from './modernLessons';

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
  /** a vowel said at the front of the mouth (e, i): a g before it is y, a χ is hy */
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

function tokensOf(letters: Letter[]): Tok[] {
  const toks: Tok[] = [];
  const seenVowel = () => toks.some((t) => t.kind === 'vowel');
  const consonant = (text: string, key: string, extra: Partial<Tok> = {}) => toks.push({ kind: 'consonant', text, key, ...extra });
  // χ is the ch of loch (kh) before a, o, ou and a consonant, and the softer hy before e and i (χαίρετε is HYE-re-te; mw-5r3p30.264)
  const kh = (i: number) => (vowelAt(letters, i)?.front ? 'hy' : 'kh');

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

/** The Greek word in Modern Greek sounds: 'χριστῷ' is 'khree-STO'. */
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

/** The sounds respellModern writes, each with an English word that has it; the lessons say 'e as in pet'. */
export const MODERN_KEY_WORDS: Readonly<Record<string, string>> = {
  a: 'father', e: 'pet', ee: 'see', o: 'lot', oo: 'food',
  v: 'vase', f: 'fan', b: 'bed', d: 'dog', g: 'go', y: 'yes', hy: 'huge', s: 'sun', z: 'zoo',
  mb: 'number', nd: 'under', ng: 'finger', nks: 'thanks', kh: 'loch',
};

/** The bundled clip of the sound of a Greek word of ONE letter (mw-5r3p30.347): ὁ, Ὃ and ὦ play the o, ἡ and ἤ the ee, ἃ the a. A Greek voice handed one
 * letter names it, whatever accent it carries (mw-5r3p30.262 handed it 'ό', and his phone said 'Omicron'), so the word is never handed to a voice: the
 * clip, public/sounds/modern/<sound>.mp3, is named by the sound respellModern writes for the vowel and was made with eSpeak NG's phoneme input
 * (scripts/sounds-build.sh), which says a sound and cannot spell a letter. A consonant alone (no Greek word is one) has no clip: null. */
export function loneLetterClipModern(word: string): string | null {
  const bare = word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const sound = [...bare].length === 1 ? VOWEL_SOUND[bare] : undefined;
  return sound ? `/sounds/modern/${sound}.mp3` : null;
}

/** Every clip the Modern Greek scheme plays for a one-letter word (the sounds of its single vowels), for the tests that hold them to the files. */
export const MODERN_LONE_CLIPS: readonly string[] = [...new Set(Object.values(VOWEL_SOUND))].map((sound) => `/sounds/modern/${sound}.mp3`);

/** The pairs said with a nasal inside a word (the respelling writes it: πάντοτε is 'PAN-do-te'), each with the nasal letter that says it. */
const NASAL_PAIRS: Readonly<Record<string, string>> = { ντ: 'ν', μπ: 'μ', γκ: 'ν' };

const bareLetter = (c: string | undefined): string => (c ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Greek text as the Modern Greek voice is handed it, so it says the sounds respellModern writes (mw-5r3p30.264). A Greek voice reads ντ, μπ and γκ
 * inside a word as a bare d, b, g (Πάντοτε heard 'PA-do-te'), while the respelling and the lessons keep the nasal ('PAN-do-te'); so the nasal is
 * written to end the part before and the pair opens the next part, where a voice says it as at a word's start: 'πάν-ντοτε', 'συμ-μπάσχω',
 * 'ἀν-γκάλη'. A pair at the start of a word (no vowel before it), and γγ, γχ, γξ, which a voice says with their nasal, are left as they are.
 * PROVISIONAL until the Governor has heard it on his phone: espeak-ng's el says 'pˈadotˌe' for πάντοτε and 'pˈandˈote' for this form. */
export function voiceFormModern(text: string): string {
  return text.replace(/[\p{Script=Greek}\p{M}]+/gu, (word) => {
    const chars = [...word.normalize('NFC')];
    let out = '';
    let seenVowel = false;
    let changed = false;
    chars.forEach((c, i) => {
      const nasal = NASAL_PAIRS[bareLetter(c) + bareLetter(chars[i + 1])];
      if (nasal && seenVowel) {
        out += `${c === c.toLowerCase() ? nasal : nasal.toUpperCase()}-`;
        changed = true;
      }
      out += c;
      if (VOWELS.includes(bareLetter(c))) seenVowel = true;
    });
    return changed ? out : word;
  });
}

/** What the tutor is told of Modern Greek (mw-5r3p30.268): the rules respellModern writes, and the ones the lessons teach, so its answers say the sounds
 * the app speaks and respells. tests/unit/one-pronunciation-scheme.test.ts holds its examples to respellModern. */
export const MODERN_TUTOR_GUIDE =
  'Modern Greek, as Greek is spoken in Greece today: never by English spelling habit and never by the Erasmian (school) pronunciation. ' +
  'The app respells a word in syllables, the stressed one in capitals: ταῦτα is TAF-ta, Πάντοτε is PAN-do-te, χαίρετε is HYE-re-te. ' +
  'αυ and ευ are af and ef before θ κ ξ π σ τ φ χ ψ, and av and ev before a voiced consonant or a vowel (never "aw", never "ow"); ηυ is eef or eev the same way. ' +
  'αι is e; ει, οι, υι, η, ι and υ are ee; ου is oo; ω and ο are o. ' +
  'β is v; δ is dh as in "this"; γ is gh (or y before e or i); θ is th as in "thin"; φ is f; ' +
  'χ is kh, the ch of "loch", before a, o, ou and a consonant, and the softer hy before e or i. ' +
  'μπ, ντ and γκ are b, d and g at the start of a word and mb, nd and ng inside it; γγ is ng; γχ is ng plus kh (or hy before e or i); γξ is nks. ' +
  'σ is z before β γ δ ζ λ μ ν ρ. A doubled consonant is said once. Both breathings are silent, and the iota under a letter is not said.';

export const MODERN: Pronunciation = {
  id: 'modern',
  label: 'Modern Greek',
  lang: 'el-GR',
  scoringLang: 'el',
  note: "How Greek is spoken today, by the phone's Greek voice.",
  respell: respellModern,
  keyWords: MODERN_KEY_WORDS,
  loneLetterClip: loneLetterClipModern,
  voiceForm: voiceFormModern,
  // a Greek voice names a bare lower-case letter the modern way ('vita' for β); a capital would be read 'capital ...'
  letterForm: (letter) => letter.toLowerCase(),
  tutorGuide: MODERN_TUTOR_GUIDE,
  lessons: modernLessons(MODERN_KEY_WORDS),
};
