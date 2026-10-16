// src/speech/schemes/modern.ts — Modern Greek as a respelling: the Greek word in syllables an English reader can say,
// the stressed syllable in capitals ("khree-STO"). Written from Modern Greek's own rules (docs/pronunciation.md lists
// them); the other schemes (Erasmian next) are further files beside this one, registered in ../pronunciation.ts.
import type { SoundWords } from '../accents';
import type { Pronunciation, SoundRule, SoundRuleSide, Spelling } from '../pronunciation';
import type { SoundId } from '../sounds';
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
  /** the rule that decided its sound (αυ, ευ, ηυ: v or f by the next letter) and the side it took */
  decided?: Decision;
}

/** The rules whose sound turns on the letter next to it (mw-i7xe0n.7), each with its two sides; modernSoundRules gives each its ladder idea, lines and words. */
type RuleId = 'chi' | 'gamma' | 'sigma' | 'au' | 'eu' | 'eeu' | 'mp' | 'nt' | 'gk' | 'gch';
const RULE_SIDES: Readonly<Record<RuleId, readonly [string, string]>> = {
  chi: ['hard', 'soft'],
  gamma: ['hard', 'soft'],
  sigma: ['voiced', 'voiceless'],
  au: ['voiced', 'voiceless'],
  eu: ['voiced', 'voiceless'],
  eeu: ['voiced', 'voiceless'],
  mp: ['start', 'inside'],
  nt: ['start', 'inside'],
  gk: ['start', 'inside'],
  gch: ['hard', 'soft'],
};

/** A place in a word where a rule decided the sound, and the side it took. */
interface Decision {
  rule: RuleId;
  side: string;
}

/** How the word is read: `flip` reads one rule the other way (the near miss), every decision is written to `decided` and every unit to `units`. */
interface Reading {
  flip?: RuleId;
  decided?: Decision[];
  /** every spelling the reading takes as a unit, in order (spellingsModern) */
  units?: Spelling[];
}

/** The side a rule takes at one place, written down, and turned the other way when the reading flips that rule. */
function decide(rule: RuleId, side: string, reading: Reading): string {
  reading.decided?.push({ rule, side });
  if (reading.flip !== rule) return side;
  const [a, b] = RULE_SIDES[rule];
  return side === a ? b : a;
}

function vowelAt(letters: Letter[], i: number, reading: Reading = {}): Vowel | null {
  const a = letters[i];
  if (!a || !VOWELS.includes(a.ch)) return null;
  const b = letters[i + 1];
  // a pair is one sound unless the first letter is stressed or the second carries a diaeresis
  if (b && !b.split && !a.stress) {
    const pair = a.ch + b.ch;
    if (DIGRAPH_SOUND[pair]) return { text: DIGRAPH_SOUND[pair], front: pair !== 'ου', stress: b.stress, length: 2 };
    if (b.ch === 'υ' && (a.ch === 'α' || a.ch === 'ε' || a.ch === 'η')) {
      const after = letters[i + 2]?.ch;
      const rule: RuleId = a.ch === 'α' ? 'au' : a.ch === 'ε' ? 'eu' : 'eeu';
      const side = after !== undefined && (VOICED.includes(after) || VOWELS.includes(after)) ? 'voiced' : 'voiceless';
      const base = a.ch === 'α' ? 'a' : a.ch === 'ε' ? 'e' : 'ee';
      // the flip is applied here; the decision is written down by the caller that keeps the vowel, so a look ahead (kh) writes nothing
      const flipped = decide(rule, side, { flip: reading.flip });
      return { text: base + (flipped === 'voiced' ? 'v' : 'f'), front: a.ch !== 'α', stress: b.stress, length: 2, decided: { rule, side } };
    }
  }
  return { text: VOWEL_SOUND[a.ch], front: 'εηιυ'.includes(a.ch), stress: a.stress, length: 1 };
}

function tokensOf(letters: Letter[], reading: Reading = {}): Tok[] {
  const toks: Tok[] = [];
  const seenVowel = () => toks.some((t) => t.kind === 'vowel');
  const consonant = (text: string, key: string, extra: Partial<Tok> = {}) => toks.push({ kind: 'consonant', text, key, ...extra });
  // χ is the ch of loch (kh) before a, o, ou and a consonant, and the softer hy before e and i (χαίρετε is HYE-re-te; mw-5r3p30.264)
  const kh = (i: number, rule: RuleId) => (decide(rule, vowelAt(letters, i)?.front ? 'soft' : 'hard', reading) === 'soft' ? 'hy' : 'kh');
  // μπ, ντ and γκ have their nasal inside a word and none at its start
  const inside = (rule: RuleId) => decide(rule, seenVowel() ? 'inside' : 'start', reading) === 'inside';
  const unit = (from: number, length: number, sound: string) => reading.units?.push({ from, to: from + length, sound });

  for (let i = 0; i < letters.length; ) {
    const ch = letters[i].ch;
    const next = letters[i + 1]?.ch;
    const v = vowelAt(letters, i, reading);
    if (v) {
      if (v.decided) reading.decided?.push(v.decided);
      toks.push({ kind: 'vowel', text: v.text, key: '', stress: v.stress, front: v.front });
      unit(i, v.length, v.text);
      i += v.length;
      continue;
    }
    if (ch === 'μ' && next === 'π') {
      const nasal = inside('mp');
      if (nasal) consonant('m', 'μ', { coda: true });
      consonant('b', 'β');
      unit(i, 2, nasal ? 'mb' : 'b');
      i += 2;
    } else if (ch === 'ν' && next === 'τ') {
      const nasal = inside('nt');
      if (nasal) consonant('n', 'ν', { coda: true });
      consonant('d', 'δ');
      unit(i, 2, nasal ? 'nd' : 'd');
      i += 2;
    } else if (ch === 'γ' && next === 'γ') {
      const nasal = seenVowel();
      if (nasal) consonant('n', 'ν', { coda: true });
      consonant('g', 'γ', { hardG: true });
      unit(i, 2, nasal ? 'ng' : 'g');
      i += 2;
    } else if (ch === 'γ' && next === 'κ') {
      const nasal = inside('gk');
      if (nasal) consonant('n', 'ν', { coda: true });
      consonant('g', 'γ', { hardG: true });
      unit(i, 2, nasal ? 'ng' : 'g');
      i += 2;
    } else if (ch === 'γ' && next === 'χ') {
      const after = kh(i + 2, 'gch');
      consonant('ng', 'ν', { coda: true });
      consonant(after, 'χ');
      unit(i, 2, `ng${after}`);
      i += 2;
    } else if (ch === 'γ' && next === 'ξ') {
      consonant('n', 'ν', { coda: true });
      consonant('ks', 'ξ');
      unit(i, 2, 'nks');
      i += 2;
    } else if (ch === 'γ') {
      const sound = decide('gamma', vowelAt(letters, i + 1)?.front ? 'soft' : 'hard', reading) === 'soft' ? 'y' : 'gh';
      consonant(sound, 'γ');
      unit(i, 1, sound);
      i += 1;
    } else if (ch === 'χ') {
      const sound = kh(i + 1, 'chi');
      consonant(sound, 'χ');
      unit(i, 1, sound);
      i += 1;
    } else if (ch === 'σ') {
      // before a consonant the rule decides: z before a voiced one, s before any other; before a vowel or at the end it is s
      const voiced = next !== undefined && VOICED.includes(next);
      const said = next !== undefined && !VOWELS.includes(next) ? decide('sigma', voiced ? 'voiced' : 'voiceless', reading) === 'voiced' : voiced;
      if (said) consonant('z', 'σ', { coda: true });
      else consonant('s', 'σ');
      unit(i, 1, said ? 'z' : 's');
      i += 1;
    } else if (SINGLE[ch]) {
      const last = toks[toks.length - 1];
      // a doubled consonant is said once
      if (!(last && last.kind === 'consonant' && last.key === ch && last.text === SINGLE[ch])) consonant(SINGLE[ch], ch);
      unit(i, 1, SINGLE[ch]);
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
export const respellModern = (word: string): string => respellAs(word, {});

/** The word respelled as `reading` reads it: with one rule turned the other way (a near miss, modernSoundRules), its decisions written down. */
function respellAs(word: string, reading: Reading): string {
  const toks = tokensOf(lettersOf(word), reading);
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

/** How Modern Greek reads the word, unit by unit (mw-5r3p30.351): a letter alone, or a pair it says as one sound (οι, ου, αυ, μπ, γκ ...), with the sound
 * the respelling writes for it. A letter is read in the context the rules look at, so σ before μ is 'z' and γ before ε is 'y'. */
export function spellingsModern(word: string): Spelling[] {
  const units: Spelling[] = [];
  tokensOf(lettersOf(word), { units });
  return units;
}

/** The sounds respellModern writes, each as the standard sound it is (../sounds.ts, mw-5r3p30.352): the lessons say each through the reader's
 * English accent ('o, as in “or”, short' in American English), never by an English word of their own. */
export const MODERN_SOUNDS: Readonly<Record<string, SoundId>> = {
  a: '/a/', e: '/e/', ee: '/i/', o: '/o/', oo: '/u/',
  v: '/v/', f: '/f/', dh: '/ð/', th: '/θ/', gh: '/ɣ/', y: '/ʝ/', kh: '/x/', hy: '/ç/', z: '/z/', s: '/s/',
  b: '/b/', p: '/p/', d: '/d/', t: '/t/', g: '/ɡ/', k: '/k/', m: '/m/', n: '/n/', l: '/l/', r: '/ɾ/',
  ks: '/ks/', ps: '/ps/', mb: '/mb/', nd: '/nd/', ng: '/ŋɡ/', nks: '/ŋks/',
};

/** What the Modern Greek voice is handed for a Greek word of ONE letter: the vowel bare, in lower case, doubled ('οο' for ὁ and Ὃ, 'ωω' for ὦ, 'ηη' for ἡ,
 * 'αα' for ἃ). A Greek voice handed the letter alone names it, whatever accent it carries (mw-5r3p30.262 handed it 'ό', and his phone said 'Omicron');
 * handed it doubled, his phone's own Greek voice says the sound: the Governor's pick on the listening trial, 'the best sound for the vowels is actually the
 * double ones from the phone itself' (mw-5r3p30.395, 2026-10-15; mw-5r3p30.421). A consonant has no form the voice says as a sound (there is no bare v
 * to double): null, and it is named as before. */
export function loneLetterFormModern(word: string): string | null {
  const bare = word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return [...bare].length === 1 && VOWEL_SOUND[bare] ? bare + bare : null;
}

/** The bundled clip of the sound of a Greek word of ONE letter (mw-5r3p30.347), for a phone with no Greek voice to say loneLetterFormModern (mw-5r3p30.421):
 * ὁ, Ὃ and ὦ play the o, ἡ and ἤ the ee, ἃ the a. The clip, public/sounds/modern/<sound>.mp3, is named by the sound respellModern writes for the vowel and
 * was made with eSpeak NG's phoneme input (scripts/sounds-build.sh), which says a sound and cannot spell a letter. A consonant alone (no Greek word is one)
 * has no clip: null. */
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

/** Greek text in monotonic marks, as Greece writes it today: an acute, grave or circumflex (oxia, varia, perispomeni) is the one tonos, the breathings and the
 * iota under a letter go, a diaeresis stays. A Modern Greek voice reads the tonos; one may pass over an accent it was not made for (mw-5r3p30.357). */
export function monotonicModern(text: string): string {
  let out = '';
  let accent = false;
  let diaeresis = false;
  const flush = () => {
    out += (diaeresis ? '\u0308' : '') + (accent ? '\u0301' : '');
    accent = false;
    diaeresis = false;
  };
  for (const c of text.normalize('NFD')) {
    if (!/\p{M}/u.test(c)) {
      flush();
      out += c;
    } else if (/[\u0300\u0301\u0340\u0341\u0342]/u.test(c)) accent = true;
    else if (c === '\u0308') diaeresis = true;
    else if (c === '\u0344') {
      accent = true;
      diaeresis = true;
    } else if (!/[\u0313\u0314\u0343\u0345\u0304\u0306]/u.test(c)) out += c;
  }
  flush();
  return out.normalize('NFC');
}

/** A Greek word said alone, as the Modern Greek voice is handed it (mw-5r3p30.357): its voiceForm in monotonic marks, with '!'. His phone said πατήρ alone
 * 'PA-teer', 'the Voice goes high and then low': a lone word is said as a statement, its pitch high at the start and falling, so a final stress sounds
 * initial. espeak-ng el, measured on the box (Praat's pitch tracker over its phoneme times; docs/pronunciation.md 'A word said alone'): the bare πατήρ is
 * 99 Hz on πα and 102 on τήρ, falling to 79 (no peak to hear); 'πατήρ!' is 99 on πα and 115 on τήρ; ἀγάπη! 116 on γά, 83 after; λόγος! 116, then 83. A
 * comma, a question mark, '…' and a carrier before the word ('λέμε πατήρ') put no clearer peak on the stress. Each word keeps one tonos, the first. PROVISIONAL
 * until the Governor has heard it. */
export const wordFormModern = (word: string): string => `${voiceFormModern(oneStressEach(monotonicModern(word))).replace(/[\s.,;:·!?]+$/u, '')}!`;

/** Each Greek word of `text` with its first tonos only: the word said alone has one stress, the one respelling stresses; a second accent is one an enclitic
 * gave it (πρῶτός μου), said with the enclitic. */
const oneStressEach = (text: string): string =>
  text.replace(/[\p{Script=Greek}\p{M}]+/gu, (word) => {
    let seen = false;
    return [...word.normalize('NFD')]
      .filter((c) => {
        if (c !== '\u0301') return true;
        const keep = !seen;
        seen = true;
        return keep;
      })
      .join('')
      .normalize('NFC');
  });

/** The side each rule took in `word`: one side, or null when the word has no such place or has it on both sides. */
function sideIn(word: string, rule: RuleId): string | null {
  const decided: Decision[] = [];
  respellAs(word, { decided });
  const sides = new Set(decided.filter((d) => d.rule === rule).map((d) => d.side));
  return sides.size === 1 ? [...sides][0] : null;
}

const FRONT = 'ε, ι, η, υ, αι, ει or οι';
const BACK = 'α, ο, ω, ου or a consonant';
const VOICED_LIST = 'β, γ, δ, ζ, λ, μ, ν or ρ';

/** The sounds of Modern Greek that change by the next letter (mw-i7xe0n.7), each with its two sides, the line a wrong pick shows, and New Testament words of
 * each side (tests/unit/sound-rule-sides.test.ts holds every word to its side and to the text). No word of the text begins with μπ, ντ or γκ, so their start side has none. */
function modernSoundRules(say: SoundWords): SoundRule[] {
  const asIn = say.keyed;
  const side = (id: string, label: string, line: string, words: readonly string[] = []): SoundRuleSide => ({ id, label, line, words });
  const rule = (ideaId: string, id: RuleId, sides: [SoundRuleSide, SoundRuleSide]): SoundRule => ({
    ideaId,
    sides,
    sideOf: (word) => sideIn(word, id),
    misread: (word) => respellAs(word, { flip: id }),
  });
  const vowelPair = (ideaId: string, id: RuleId, pair: string, base: string, voiced: readonly string[], voiceless: readonly string[]): SoundRule =>
    rule(ideaId, id, [
      side('voiced', `${pair} before a vowel or a voiced consonant: ${base}v`, `${pair} before a vowel or ${VOICED_LIST} is ${base}v, with the ${asIn('v')}`, voiced),
      side('voiceless', `${pair} before any other letter: ${base}f`, `${pair} before any other letter, or at the end of a word, is ${base}f, with the ${asIn('f')}`, voiceless),
    ]);
  const nasal = (ideaId: string, id: RuleId, pair: string, start: string, within: string, words: readonly string[]): SoundRule =>
    rule(ideaId, id, [
      side('start', `${pair} at the start of a word: ${start}`, `${pair} at the start of a word is ${asIn(start)}`),
      side('inside', `${pair} inside a word: ${within}`, `${pair} inside a word is ${asIn(within)}`, words),
    ]);
  return [
    rule('letter-chi', 'chi', [
      side('hard', `χ before ${BACK}: kh`, `χ before ${BACK} is hard: ${asIn('kh')}`, ['χάρις', 'χαρά', 'ἔχω']),
      side('soft', `χ before ${FRONT}: hy`, `χ before ${FRONT} is soft: ${asIn('hy')}`, ['χεῖρες', 'ψυχή', 'ἔχει']),
    ]),
    rule('letter-gamma', 'gamma', [
      side('hard', `γ before ${BACK}: gh`, `γ before ${BACK} is ${asIn('gh')}`, ['λόγος', 'γάρ', 'λέγω']),
      side('soft', `γ before ${FRONT}: y`, `γ before ${FRONT} is ${asIn('y')}`, ['γῆ', 'λέγει', 'ἡγεμών']),
    ]),
    rule('letter-sigma', 'sigma', [
      side('voiced', `σ before a voiced consonant: z`, `σ before ${VOICED_LIST} is ${asIn('z')}`, ['κόσμος', 'Ἰσραήλ']),
      side('voiceless', `σ before any other consonant: s`, `σ before any other consonant is ${asIn('s')}`, ['ἐστίν', 'ἀπόστολος']),
    ]),
    vowelPair('diphthong-au', 'au', 'αυ', 'a', ['Παῦλος', 'αὔριον'], ['αὐτός', 'ταῦτα']),
    vowelPair('diphthong-eu', 'eu', 'ευ', 'e', ['εὐαγγέλιον', 'εὐλογία'], ['εὐθύς', 'εὐχαριστῶ']),
    vowelPair('diphthong-eeu', 'eeu', 'ηυ', 'ee', ['ηὐλίζετο'], ['ηὔξανεν', 'προσηύχετο']),
    nasal('pair-mp', 'mp', 'μπ', 'b', 'mb', ['πέμπω', 'ἐμπορίαν']),
    nasal('pair-nt', 'nt', 'ντ', 'd', 'nd', ['ἐντολή', 'πάντοτε']),
    nasal('pair-gk', 'gk', 'γκ', 'g', 'ng', ['ἀνάγκη', 'ἤνεγκεν']),
    rule('pair-gch', 'gch', [
      side('hard', `γχ before ${BACK}: ngkh`, `γχ before ${BACK} is ${asIn('ng')}, plus ${asIn('kh')}`, ['ἔλεγχος', 'ἔλεγχον']),
      side('soft', `γχ before ${FRONT}: nghy`, `γχ before ${FRONT} is ${asIn('ng')}, plus ${asIn('hy')}`, ['ἐλέγχει', 'συγχαίρω']),
    ]),
  ];
}

/** What the tutor is told of Modern Greek (mw-5r3p30.268): the rules respellModern writes, and the ones the lessons teach, so its answers say the sounds
 * the app speaks and respells; each sound's English hint is the reader's accent's (`say`, mw-5r3p30.352), so the tutor's examples fit his ear.
 * tests/unit/one-pronunciation-scheme.test.ts holds its examples to respellModern. */
export const modernTutorGuide = (say: SoundWords): string =>
  'Modern Greek, as Greek is spoken in Greece today: never by English spelling habit and never by the Erasmian (school) pronunciation. ' +
  'The app respells a word in syllables, the stressed one in capitals: ταῦτα is TAF-ta, Πάντοτε is PAN-do-te, χαίρετε is HYE-re-te. ' +
  `The vowels, each ${say.hintedBy}: ${['a', 'e', 'ee', 'o', 'oo'].map(say.asIn).join('; ')}. ` +
  'αυ and ευ are af and ef before θ κ ξ π σ τ φ χ ψ, and av and ev before a voiced consonant or a vowel (never "aw", never "ow"); ηυ is eef or eev the same way. ' +
  'αι is e; ει, οι, υι, η, ι and υ are ee; ου is oo; ω and ο are o. ' +
  `β is v; δ is ${say.asIn('dh')}; γ is gh (or y before e or i); θ is ${say.asIn('th')}; φ is f; ρ is ${say.asIn('r')}; ` +
  `χ is ${say.asIn('kh')}, before a, o, ou and a consonant, and the softer hy before e or i. ` +
  'μπ, ντ and γκ are b, d and g at the start of a word and mb, nd and ng inside it; γγ is ng; γχ is ng plus kh (or hy before e or i); γξ is nks. ' +
  'σ is z before β γ δ ζ λ μ ν ρ. A doubled consonant is said once. Both breathings are silent, and the iota under a letter is not said.';

export const MODERN: Pronunciation = {
  id: 'modern',
  label: 'Modern Greek',
  lang: 'el-GR',
  scoringLang: 'el',
  note: "How Greek is spoken today, by the phone's Greek voice.",
  respell: respellModern,
  spellings: spellingsModern,
  sounds: MODERN_SOUNDS,
  loneLetterForm: loneLetterFormModern,
  loneLetterClip: loneLetterClipModern,
  voiceForm: voiceFormModern,
  wordForm: wordFormModern,
  // a Greek voice names a bare lower-case letter the modern way ('vita' for β); a capital would be read 'capital ...'
  letterForm: (letter) => letter.toLowerCase(),
  tutorGuide: modernTutorGuide,
  lessons: modernLessons,
  soundRules: modernSoundRules,
};
