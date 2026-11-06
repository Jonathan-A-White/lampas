// scripts/lxx/morpheus.ts — Morpheus, the Perseus Project's analyzer, as the second method on the words with no candidate (docs/lxx-derivation.md, 'Morpheus';
// docs/sources/lxx-derivation-probe.md, 'Lampas's paradigm data, or an open analyzer?' and 'Error checks', 2(d); story mw-u2w5klk.6).
// Morpheus (https://github.com/perseids-tools/morpheus, commit ab6898ffed335fc6169fa02c9940657a9b5a78e0, MPL-2.0) is a BUILD TOOL: derive.ts runs it from its
// Docker image over the forms layers 1 and 2 leave with no candidate and over the guesses in the choices files, maps what it prints to TAGNT's codes where
// the mapping is one reading to one code, and keeps the result in data/lxx/morpheus/<book>.tsv (git-ignored, a derived cache). Its analyses reach the data as
// candidates, never its code or its tables. When Docker or the image is absent the step is skipped with one line and nothing else changes. Nothing of it is in
// the app. The tests never run it (tests/fixtures/lxx/morpheus-sample.tsv stands for its output).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { bareOf, hasLower, keyOf, PUNCT } from './swete';

export const MORPHEUS = {
  repo: 'https://github.com/perseids-tools/morpheus',
  commit: 'ab6898ffed335fc6169fa02c9940657a9b5a78e0',
  licence: 'MPL-2.0',
  /** The image the step runs: the pinned commit built from the repository's own Dockerfile (LAMPAS_MORPHEUS_IMAGE names another, such as perseidsproject/morpheus). */
  image: 'lampas-morpheus',
  build: 'docker build -t lampas-morpheus https://github.com/perseids-tools/morpheus.git#ab6898ffed335fc6169fa02c9940657a9b5a78e0',
};

/** Where a book's cache is kept: data/lxx/morpheus/<book>.tsv, under the derivation's output directory. */
export const MORPHEUS_DIR = join('data', 'lxx', 'morpheus');

/** Note on a word that Morpheus gave candidates. */
export const NOTE_MORPHEUS = 'morpheus: candidates from the second method, for the model';

// ---------------------------------------------------------------------------------------------------------------------------------- beta code

const LETTERS: Readonly<Record<string, string>> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'h', θ: 'q', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'c', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'u', φ: 'f', χ: 'x', ψ: 'y', ω: 'w',
};
const GREEK_OF: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(LETTERS).filter(([g]) => g !== 'ς').map(([g, b]) => [b, g]));
/** The marks of beta code, by their combining characters, in the order a letter carries them: breathing, diaeresis, accent, iota subscript. */
const MARKS: ReadonlyArray<readonly [string, string]> = [
  ['̓', ')'],
  ['̔', '('],
  ['̈', '+'],
  ['́', '/'],
  ['̀', '\\'],
  ['͂', '='],
  ['ͅ', '|'],
];
const MARK_OF = new Map(MARKS.map(([u, b]) => [b, u]));
const COMBINING = new Map(MARKS);

/** Greek as Perseus beta code (`ἐξέθρεψεν` is `e)ce/qreyen`, `Γενηθήτωσαν` is `*genhqh/twsan`); undefined when the form holds a character beta code has no letter for. */
export function toBeta(greek: string): string | undefined {
  let out = '';
  for (const unit of greek.normalize('NFD').match(/\P{M}\p{M}*/gu) ?? []) {
    const base = unit[0];
    const letter = LETTERS[base.toLowerCase()];
    if (!letter) {
      if (base === "'" || base === '’') {
        out += "'";
        continue;
      }
      return undefined;
    }
    const present = new Set([...unit.slice(1)].map((c) => COMBINING.get(c)).filter((b): b is string => Boolean(b)));
    if ([...unit.slice(1)].some((c) => !COMBINING.has(c))) return undefined;
    const marks = MARKS.map(([, b]) => b).filter((b) => present.has(b)).join('');
    out += base !== base.toLowerCase() ? `*${marks}${letter}` : `${letter}${marks}`;
  }
  return out;
}

/** Beta code as NFC Greek, a final sigma where a word ends; the marks of quantity (`_`, `^`) and a homograph number (`pa/reimi1`, `edo#1`) are dropped. */
export function fromBeta(beta: string): string {
  let out = '';
  let capital = false;
  let marks = '';
  for (const c of beta.replace(/#?\d+$/, '').replace(/[_^]/g, '')) {
    if (c === '*') capital = true;
    else if (MARK_OF.has(c)) {
      if (capital) marks += MARK_OF.get(c);
      else out += MARK_OF.get(c);
    } else if (GREEK_OF[c.toLowerCase()]) {
      out += (capital ? GREEK_OF[c.toLowerCase()].toUpperCase() : GREEK_OF[c.toLowerCase()]) + marks;
      capital = false;
      marks = '';
    } else out += c === "'" ? '\u2019' : c;
  }
  return out.replace(/σ(?=\p{M}*$)/u, 'ς').normalize('NFC');
}

/**
 * The form as the cache and Morpheus see it: the look-up key (punctuation and brackets off, grave read as acute, an enclitic's second accent dropped, NFC) with
 * the capital that begins a word written with lower case kept (`Γενηθήτωσαν`): a name is looked up as `*`-and-letter. A word all in capitals is lower case.
 */
export function morpheusKey(form: string): string {
  const key = keyOf(form);
  const bare = form.replace(PUNCT, '');
  const first = [...bare][0];
  return first && first !== first.toLowerCase() && hasLower(bare) ? (key.charAt(0).toUpperCase() + key.slice(1)).normalize('NFC') : key;
}

// -------------------------------------------------------------------------------------------------------------------------------- its output

/** One `<NL>` segment of Morpheus's Perseus-format output, split into its fields: `N pai=s  masc/fem nom/voc pl<TAB><TAB>indeclform<TAB>irreg_decl3`. */
export interface RawAnalysis {
  /** N (noun, adjective, pronoun, article, indeclinable), V, P (participle), E (an English gloss of an N) */
  pos: string;
  /** the last of the comma-separated names it gives, in beta code: the lemma */
  lemma: string;
  features: string;
  dialects: string;
  flags: string;
  classes: string;
}

/** A segment (the text between `<NL>` and `</NL>`) as fields; undefined when it is not one. */
export function parseAnalysis(segment: string): RawAnalysis | undefined {
  const [head, dialects = '', flags = '', classes = ''] = segment.split('\t');
  const m = /^([A-Z])\s+(\S+)\s*(.*)$/.exec(head);
  if (!m) return undefined;
  return { pos: m[1], lemma: m[2].split(',').at(-1)!, features: m[3].trim(), dialects: dialects.trim(), flags: flags.trim(), classes: classes.trim() };
}

export interface CrunchEntry {
  /** the line cruncher echoed: the form it was asked about */
  input: string;
  raws: RawAnalysis[];
}

/**
 * Cruncher's output: for each form it KNOWS an echo line, then its `<NL>…</NL>` segments. A form it does not know has no line on standard output at all (cruncher
 * says it on standard error, which `crunch` does not return), so with `inputs` an input without an echo is an entry with no readings, and the echoes must be
 * inputs, in that order. Without `inputs` the entries are the echoes (an unknown form is not seen).
 */
export function parseCruncher(output: string, inputs?: readonly string[]): CrunchEntry[] {
  const echoed: CrunchEntry[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith('<NL>')) {
      echoed.push({ input: line.trim(), raws: [] });
      continue;
    }
    const entry = echoed.at(-1);
    if (!entry) throw new Error(`Morpheus: an analysis before any form: ${line}`);
    for (const m of line.matchAll(/<NL>(.*?)<\/NL>/g)) {
      const raw = parseAnalysis(m[1]);
      if (raw) entry.raws.push(raw);
    }
  }
  if (!inputs) return echoed;
  const entries: CrunchEntry[] = [];
  let next = 0;
  for (const input of inputs) {
    if (echoed[next]?.input === input) entries.push(echoed[next++]);
    else entries.push({ input, raws: [] });
  }
  if (next !== echoed.length) throw new Error(`Morpheus answered '${echoed[next].input}' where it was not asked, or out of order (${echoed.length} echoes for ${inputs.length} forms)`);
  return entries;
}

// -------------------------------------------------------------------------------------------------------------------------------- the mapping

export interface Mapped {
  /** NFC */
  lemma: string;
  /** TAGNT's code, a noun's semantic tags dropped */
  code: string;
}

const CASES: Readonly<Record<string, string>> = { nom: 'N', gen: 'G', dat: 'D', acc: 'A', voc: 'V' };
const GENDERS: Readonly<Record<string, string>> = { masc: 'M', fem: 'F', neut: 'N' };
const NUMBERS: Readonly<Record<string, string>> = { sg: 'S', pl: 'P' };
const PERSONS: Readonly<Record<string, string>> = { '1st': '1', '2nd': '2', '3rd': '3' };
const TENSES: Readonly<Record<string, string>> = { pres: 'P', imperf: 'I', fut: 'F' };
const VOICES: ReadonlySet<string> = new Set(['act', 'mid', 'pass', 'mp']);
const MOODS: Readonly<Record<string, string>> = { ind: 'I', subj: 'S', opt: 'O', imperat: 'M', inf: 'N', part: 'P' };
/** Morpheus's ending tables of adjectives (stemlib/Greek/endtables); every other table that holds a case and number is a noun's. */
const ADJECTIVE_TABLES: ReadonlySet<string> = new Set([
  'os_h_on', 'os_a_on', 'os_on', 'oos_oh_oon', 'oos_oon', 'us_eia_u', 'hs_es', 'wn_on', 'wn_on_comp', 'wn_ousa_on', 'ws_wn', 'ws_wn_long', 'as_asa_an', 'eis_essa',
  'hn_eina_en', 'heis_hessa', 'oeis_oessa', 'ous_ontos', 'is_idos_adj', 'is_itos_adj', 'n_nos_adj', 'art_adj', 'irreg_adj3',
]);
/** The class after `indeclform`: the indeclinable words the mapping covers. */
const INDECLINABLE: Readonly<Record<string, readonly string[]>> = { conj: ['CONJ'], particle: ['PRT', 'CONJ'], adverb: ['ADV'], prep: ['PREP'] };
/** The ending tables and classes of Morpheus's pronouns (personal, reflexive, demonstrative, relative, indefinite, interrogative): not mapped, TAGNT's codes for them are of their own kinds. */
const PRONOUN_CLASSES: ReadonlySet<string> = new Set(['pron1', 'pron_adj1', 'pron_adj3', 'demonstr', 'relative', 'indef', 'interrog', 'reflex']);
/**
 * Lemmas Morpheus declines as a noun or an adjective (αὐτός is `fem nom pl`, class art_adj) where TAGNT gives every form a pronoun's code of its own (P-, D-, S-, F-, C-,
 * K-, Q-, I-): a candidate with N- or A- would be false. Found as the cache's mapped lemmas that TAGNT never writes with that kind of code, in the sweep's 11,091 readings, and
 * in the known-answer chapters (Jhn.1, Rom.8): the personal, demonstrative, possessive, reflexive, reciprocal, correlative and interrogative pronouns and adjectives. By bare letters.
 */
const PRONOUN_LEMMAS: ReadonlySet<string> = new Set(
  ['αὐτός', 'ἐκεῖνος', 'οὗτος', 'ὅδε', 'ἐμός', 'σός', 'ἡμός', 'ὑμός', 'ὅσος', 'πόσος', 'οἷος', 'τοσοῦτος', 'ποῖος', 'ἀλλήλων', 'ἑαυτοῦ', 'σαυτοῦ', 'ἐμαυτοῦ'].map(bareOf),
);
/**
 * The ending tables of an athematic verb's aorist (τίθημι, ἵημι, ἵστημι, δίδωμι and their compounds: θές, ὑποστῇ, παρῇς; story mw-u2w5klk.287). They say neither first nor second, as `aor1` and
 * `aor2` do. TAGNT writes these verbs' aorist as the second (V-2AAI-3S ἔστη, V-2AAM-2S θές, V-2AAS-3S παρῇ), and the indicative active of τίθημι, δίδωμι and ἵημι also as the first
 * (the κ-aorist, V-AAI-1S ἔθηκα, ἔδωκα, ἀφῆκα): `kAorist`.
 */
const ATHEMATIC_AORISTS: ReadonlySet<string> = new Set(['emi_aor', 'ami_aor', 'ath_secondary', 'irreg_mi']);
/** Whether an aorist indicative active has a κ before its ending (ἔθηκα, ἔδωκαν, ἀφῆκεν): the first aorist an athematic verb makes in the indicative active. */
export const kAorist = (form: string): boolean => /κ(?:α|ας|ε|εν|αμεν|ατε|ασιν?)$/u.test(form.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());

/** More readings than this from one segment (every gender and case it lists) are too loose to be candidates. */
const MAX_READINGS = 6;
/** The flags of a noun or adjective reading that leave it one reading to one code: a contracted form, an enclitic, a movable nu, an alpha privative. */
const NOUN_FLAGS: ReadonlySet<string> = new Set(['contr', 'enclitic', 'nu_movable', 'a_priv', 'poetic']);
/** The tables of a noun or adjective whose forms Morpheus lists one by one and flags `indeclform` (class `irreg_decl3`, `irreg_adj3`). */
const IRREGULAR_TABLES: ReadonlySet<string> = new Set(['irreg_decl3', 'irreg_adj3']);

const words = (s: string): string[] => s.split(/[\s,]+/).filter(Boolean);
/** `masc/fem` as ['M', 'F']; undefined when a part is not in the table (the dual). */
function letters(token: string, table: Readonly<Record<string, string>>): string[] | undefined {
  const out = token.split('/').map((t) => table[t]);
  return out.every(Boolean) ? out : undefined;
}

interface Declined {
  cases: string[];
  numbers: string[];
  genders: string[];
}

/** The case, number and gender of a noun, adjective, article or participle ('masc/neut gen sg'); undefined when a word is not one the table knows, or a part is missing. */
function declined(tokens: readonly string[]): Declined | undefined {
  const got: Partial<Declined> = {};
  for (const t of tokens) {
    const g = letters(t, GENDERS);
    const c = letters(t, CASES);
    const n = letters(t, NUMBERS);
    if (g && !got.genders) got.genders = g;
    else if (c && !got.cases) got.cases = c;
    else if (n && !got.numbers) got.numbers = n;
    else return undefined;
  }
  if (!got.cases || !got.numbers || !got.genders) return undefined;
  return { cases: got.cases, numbers: got.numbers, genders: got.genders };
}

/** TAGNT's order for a declined word: case, number, gender (N-ASF, T-GSM, a participle's V-PAP-GPF). */
const ordered = (d: Declined): string[] => d.genders.flatMap((g) => d.cases.flatMap((c) => d.numbers.map((n) => `${c}${n}${g}`)));

/**
 * One reading of Morpheus as TAGNT's codes, or the reason it is not one reading to one code (`unmappedWhy`). Mapped: a finite verb, an infinitive and a participle
 * of the present, imperfect, future and aorist (first or second by the ending table, passive by `aor_pass`); a noun; an adjective (by the ending table); the
 * article; a conjunction, a particle, an adverb and a preposition; a noun or adjective whose forms Morpheus lists one by one (`indeclform`, class `irreg_decl3`). A list of genders or cases in one reading is a code each (at most MAX_READINGS). The perfect
 * (story mw-u2w5klk.32) is TAGNT's R: an active one is R when `form` (the Greek form asked, NFC) has a κ before its ending (firstPerfect) and R and 2R otherwise, for Morpheus's
 * perf_act table holds both and without the form it cannot be told; a middle or passive one is R. Not mapped: the dual, a comparative or superlative, a dialect without
 * Attic, an unaugmented form, a pluperfect or future perfect (TAGNT's L and 2L, and the future perfect it has no code for; the tenses still left out), a pronoun, a numeral, an English gloss, anything else.
 * Deponents are not told either: the passive of a deponent verb maps to P where TAGNT writes O (the report's 'differed' shows it).
 */
export function mapAnalysis(raw: RawAnalysis, form?: string): Mapped[] | undefined {
  const r = mapReading(raw, form);
  return typeof r === 'string' ? undefined : r;
}

/** Why a reading is left out, in a word or two (a class of `unmappedWhy`); undefined when the mapping covers it. */
export function unmappedWhy(raw: RawAnalysis, form?: string): string | undefined {
  const r = mapReading(raw, form);
  return typeof r === 'string' ? r : undefined;
}

/** The tenses of Morpheus that no TAGNT code is made for, by the name the report uses. */
const LEFT_OUT_TENSES: Readonly<Record<string, string>> = { plup: 'pluperfect', futperf: 'future perfect' };

/**
 * Whether an active perfect's form is a first perfect, TAGNT's R: a κ stands before its ending (λέλυκα, πεποίηκεν, λελυκώς, ἐγνωκέναι). The second perfect (γέγονα, πέποιθα,
 * ἀκήκοα) has none. Morpheus's `perf_act` is one table for both. 13 of TAGNT's 163 second perfects have a κ (ἀκηκόαμεν); 302 of its 681 first perfects have none (οἶδα, ἕστηκα),
 * which is why a form without one is offered as both.
 */
export function firstPerfect(form: string): boolean {
  const bare = form.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return /κ(?:α|ας|ε|εν|αμεν|ατε|ασιν?|εναι|ως|ος|ο|οτ[^κ]*|υι[^κ]*)$/u.test(bare);
}

/**
 * TAGNT's voice letters for Morpheus's voice (one reading to each). Morpheus prints `mp` for a form that is middle or passive, and for a deponent verb in every tense;
 * TAGNT, which says what the form is, writes `N` for a deponent's present and imperfect, `D` (middle deponent) or `O` (passive deponent) for its aorist and future,
 * and `P` or `M` for any other verb: its `E` (the form is middle or passive) is rare, so it is not offered. A deponent is told by its lemma ending in -μαι.
 * A deponent's perfect (tense `R`, story mw-u2w5klk.32) is `N` or `P` in TAGNT (13 and 11 of its words, `D` and `M` one each), never the `D` and `O` of its aorist and future.
 */
export function voicesOf(voice: string, tense: string, lemma: string): string[] {
  const deponent = /μαι$/.test(lemma);
  if (voice === 'mp' && deponent && /R$/.test(tense)) return ['N', 'P'];
  const later = tense !== 'P' && tense !== 'I';
  if (voice === 'act') return ['A'];
  if (voice === 'mid') return deponent ? ['M', 'D'] : ['M'];
  if (voice === 'pass') return deponent && later ? ['P', 'O'] : ['P'];
  return deponent ? (later ? ['D', 'O'] : ['N']) : ['P', 'M'];
}

const bareForm = (form: string): string => form.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Whether a present subjunctive of this person and number is written as the indicative of the same voice: an α-verb (aw_pr) in every person, an ο-verb (ow_pr) in the 2nd and 3rd singular active and the 2nd singular middle or passive. */
function contractSubjunctiveIsIndicative(classes: readonly string[], voice: string, person: string, number: string): boolean {
  if (classes.includes('aw_pr')) return true;
  if (!classes.includes('ow_pr') || number !== 'S') return false;
  return voice === 'act' ? person === '2' || person === '3' : person === '2';
}

function mapReading(raw: RawAnalysis, form?: string): Mapped[] | string {
  const dialects = words(raw.dialects);
  if (dialects.length && !dialects.includes('attic')) return 'a dialect without Attic';
  const flags = words(raw.flags);
  if (flags.includes('unaugmented')) return 'an unaugmented form';
  const lemma = fromBeta(raw.lemma);
  if (!lemma) return 'no lemma';
  if (PRONOUN_LEMMAS.has(bareOf(lemma))) return 'a pronoun';
  const tokens = words(raw.features);
  const classes = words(raw.classes);
  const done = (codes: string[], why: string): Mapped[] | string => (codes.length > 0 && codes.length <= MAX_READINGS ? codes.map((code) => ({ lemma, code })) : why);

  if (raw.pos === 'V' || raw.pos === 'P') {
    const [tenseWord, ...rest] = tokens;
    let tense = TENSES[tenseWord];
    let athematic = false;
    if (tenseWord === 'aor') {
      const second = classes.some((c) => c === 'aor2' || c === 'aor2_pass');
      const first = classes.some((c) => c === 'aor1' || c === 'aor_pass');
      athematic = !second && !first && classes.some((c) => ATHEMATIC_AORISTS.has(c));
      if (second === first && !athematic) return 'an aorist whose table does not say first or second';
      tense = second || athematic ? '2A' : 'A';
    }
    if (tenseWord === 'perf') tense = 'R';
    if (!tense) return LEFT_OUT_TENSES[tenseWord] ?? 'a tense TAGNT has no code for here';
    // Morpheus prints the mood, then the voice, then a finite verb's person and number or a participle's gender, case and number
    const moodWord = rest.find((t) => Object.hasOwn(MOODS, t));
    const voiceWord = rest.find((t) => VOICES.has(t));
    const mood = MOODS[moodWord ?? ''];
    if (!mood || !voiceWord) return 'no mood or voice the table knows';
    // an active perfect is R, or R and 2R when the form has no κ before its ending: perf_act is one table for TAGNT's first and second perfect
    // an athematic verb's indicative active with a κ before its ending is TAGNT's first aorist as well as its second (ἔθηκα)
    const tenses = tense === 'R' && voiceWord === 'act' && !(form && firstPerfect(form)) ? ['R', '2R'] : athematic && mood === 'I' && voiceWord === 'act' && form && kAorist(form) ? ['A', '2A'] : [tense];
    const voices = tenses.flatMap((t) => voicesOf(voiceWord, t, lemma).map((voice) => `${t}${voice}`));
    const tail = rest.filter((t) => !Object.hasOwn(MOODS, t) && !VOICES.has(t));
    if (moodWord === 'part') {
      const d = declined(tail);
      return d ? done(voices.flatMap((voice) => ordered(d).map((x) => `V-${voice}P-${x}`)), 'too many readings') : 'a participle with no case, number and gender the table knows';
    }
    if (moodWord === 'inf') return tail.length === 0 ? done(voices.map((voice) => `V-${voice}N`), 'too many readings') : 'an infinitive with more than a tense and voice';
    const [person, number] = tail;
    const p = PERSONS[person ?? ''];
    const n = NUMBERS[number ?? ''];
    if (tail.length !== 2 || !p || !n) return 'the dual or no person and number';
    if (tense === 'I' && mood !== 'I') return 'an imperfect that is not indicative';
    const finite = (m: string, vs: readonly string[], person = p): string[] => vs.map((voice) => `V-${voice}${m}-${person}${n}`);
    const codes = finite(mood, voices);
    // Morpheus prints some forms in one tense and mood only, and TAGNT has them in another too (story mw-u2w5klk.287):
    if (tense === 'F' && mood === 'I' && voiceWord === 'mid' && p === '2' && n === 'S' && !/μαι$/.test(lemma) && form && /ει$/u.test(bareForm(form))) {
      // the middle 2nd singular in -ει is the active 3rd singular: πνεύσει (Ps 147:7) is printed as the middle only
      codes.push(...finite('I', ['FA'], '3'));
    }
    if (tense === 'P' && mood === 'S' && contractSubjunctiveIsIndicative(classes, voiceWord, p, n)) {
      // an α-verb's present subjunctive is its indicative (ἐφορᾷ, τιμῶμεν), and so, in the singular of the 2nd and 3rd person, an ο-verb's (δηλοῖς, δηλοῖ); Morpheus prints the indicative as epic only
      codes.push(...finite('I', voices));
    }
    return done(codes, 'too many readings');
  }

  if (raw.pos !== 'N') return 'not a noun, verb or participle';
  if (classes.some((c) => PRONOUN_CLASSES.has(c))) return 'a pronoun';
  if (flags.includes('indeclform')) {
    const kind = classes.at(-1) ?? '';
    if (kind === 'article') {
      const d = declined(tokens);
      return d ? done(ordered(d).map((x) => `T-${x}`), 'too many readings') : 'an article with no case, number and gender the table knows';
    }
    const codes = INDECLINABLE[kind];
    if (codes && tokens.length === 0) return done([...codes], 'too many readings');
    if (codes) return 'an indeclinable with features';
    if (kind === 'numeral') return 'a numeral';
    if (PRONOUN_CLASSES.has(kind)) return 'a pronoun';
    // `indeclform` on an irregular noun's table (irreg_decl3: δόρατι, κυνός) says only that the form is listed by itself: its case, number and gender are a noun's
    const listed = declined(tokens);
    if (!(IRREGULAR_TABLES.has(kind) && listed)) return `an indeclinable of the class ${kind || 'none'}`;
    return done(ordered(listed).map((x) => `${ADJECTIVE_TABLES.has(kind) ? 'A' : 'N'}-${x}`), 'too many readings');
  }
  if (flags.length && !flags.every((f) => NOUN_FLAGS.has(f))) return flags.some((f) => f === 'irreg_comp' || f === 'irreg_superl') ? 'a comparative or superlative' : `a noun flag: ${flags.find((f) => !NOUN_FLAGS.has(f))}`;
  const d = declined(tokens);
  if (!d) return tokens.includes('comp') || tokens.includes('superl') ? 'a comparative or superlative' : tokens.includes('dual') ? 'the dual' : tokens.includes('adverbial') ? 'an adverb made from an adjective' : 'no case, number and gender the table knows';
  const adjective = classes.some((c) => ADJECTIVE_TABLES.has(c));
  return done(ordered(d).map((x) => `${adjective ? 'A' : 'N'}-${x}`), 'too many readings');
}

/** What Morpheus knows of a form: the readings it maps (once each, in order) and how many it could not. */
export interface MorpheusForm {
  analyses: Mapped[];
  unmapped: number;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A cruncher entry as a form's readings. An `E` segment is Morpheus's English gloss of the `N` beside it, not another reading, and is left out. */
export function formOf(entry: CrunchEntry): MorpheusForm {
  const form = fromBeta(entry.input);
  const seen = new Map<string, Mapped>();
  let unmapped = 0;
  for (const raw of entry.raws) {
    if (raw.pos === 'E') continue;
    const mapped = mapAnalysis(raw, form);
    if (!mapped) unmapped++;
    for (const m of mapped ?? []) seen.set(`${m.lemma}/${m.code}`, m);
  }
  return { analyses: [...seen.values()].sort((a, b) => byText(a.lemma, b.lemma) || byText(a.code, b.code)), unmapped };
}

// -------------------------------------------------------------------------------------------------------------------------------- the cache

/** A book's cache: form (morpheusKey) to what Morpheus knows of it. */
export type MorpheusCache = Map<string, MorpheusForm>;

export const CACHE_HEADER = ['form', 'analyses'];

/**
 * Which mapping made a cache file. The cache holds the mapped readings, not Morpheus's own output, so a change to the mapping leaves every file made before it with
 * the old readings (a perfect `unmapped`): raise this when mapAnalysis changes what it returns for a form, and `ensureCache` asks the forms again. 1 is every file made
 * before the marker existed; 2 maps the perfects (story mw-u2w5klk.32); 3 maps an athematic aorist, a future middle in -ει also as the active, and an α-verb's present subjunctive also as the indicative (story mw-u2w5klk.287).
 */
export const MAPPING_VERSION = 3;
const MARKER = /^# mapping (\d+)$/m;

/** The file's text: tab-separated, a header row, a line `# mapping N`, one row a form in order, `lemma/code` readings joined by ` | ` and one `unmapped` for each reading left out. */
export function cacheText(cache: ReadonlyMap<string, MorpheusForm>): string {
  const rows = [...cache].sort(([a], [b]) => byText(a, b)).map(([form, f]) => [form, [...f.analyses.map((m) => `${m.lemma}/${m.code}`), ...Array<string>(f.unmapped).fill('unmapped')].join(' | ')]);
  return [CACHE_HEADER.join('\t'), `# mapping ${MAPPING_VERSION}`, ...rows.map((r) => r.join('\t'))].join('\n') + '\n';
}

/** Whether a cache file's text was made by the mapping as it is now. */
export const cacheIsCurrent = (text: string): boolean => Number(MARKER.exec(text)?.[1] ?? 1) === MAPPING_VERSION;

export function parseCache(text: string): MorpheusCache {
  const cache: MorpheusCache = new Map();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [form, readings = ''] = line.split('\t');
    if (form === CACHE_HEADER[0]) continue;
    const analyses: Mapped[] = [];
    let unmapped = 0;
    for (const r of readings.split(' | ').filter(Boolean)) {
      if (r === 'unmapped') unmapped++;
      else {
        const at = r.lastIndexOf('/');
        analyses.push({ lemma: r.slice(0, at).normalize('NFC'), code: r.slice(at + 1) });
      }
    }
    cache.set(form.normalize('NFC'), { analyses, unmapped });
  }
  return cache;
}

/** The command that builds a book's cache, as it is run on the Laptop (Docker is in its docker group). */
export const morpheusBuildCommand = (book: string): string => `sg docker -c 'npm run lxx:derive -- --book ${book.toLowerCase()}'`;

/**
 * The one warning line for a book run with no cache in `dir` (data/lxx/morpheus), or undefined when there is one: a command that goes on without it counts guesses and
 * no-candidate words as a host without Morpheus does (mw-u2w5klk.268, .271), so the chapter bar's guess share reads high.
 */
export function noMorpheusWarning(dir: string, book: string): string | undefined {
  const file = join(dir, `${book.toLowerCase()}.tsv`);
  if (existsSync(file)) return undefined;
  return `warning: no Morpheus cache for ${book} (${file}): counts and candidates are those of a host without it. Build it: ${morpheusBuildCommand(book)}`;
}

/** The cache of a book under `dir` (data/lxx/morpheus); undefined when the book has none. */
export function readMorpheusCache(dir: string, book: string): MorpheusCache | undefined {
  const file = join(dir, `${book.toLowerCase()}.tsv`);
  return existsSync(file) ? parseCache(readFileSync(file, 'utf8')) : undefined;
}

// -------------------------------------------------------------------------------------------------------------------------------- running it

/** Morpheus as the step runs it. */
export interface MorpheusEngine {
  /** why it cannot run here, or undefined when it can */
  unavailable(): string | undefined;
  /** cruncher's output for these beta-code forms, one to a line */
  crunch(betaForms: readonly string[]): string;
}

export interface DockerOptions {
  /** the docker command; default 'docker', looked up in PATH */
  command?: string;
  image?: string;
}

/** Morpheus from its Docker image: `docker run --rm -i -e MORPHLIB=stemlib <image> bin/cruncher -S`, the forms on its standard input. */
export function dockerEngine(options: DockerOptions = {}): MorpheusEngine {
  const command = options.command ?? 'docker';
  const image = options.image ?? process.env.LAMPAS_MORPHEUS_IMAGE ?? MORPHEUS.image;
  return {
    unavailable() {
      const probe = spawnSync(command, ['image', 'inspect', image], { encoding: 'utf8' });
      if (probe.error) return `${command} is not in PATH (Morpheus runs from its Docker image)`;
      if (probe.status !== 0) {
        const why = (probe.stderr ?? '').trim().split('\n')[0];
        return `the image ${image} is not there${why ? ` (${why})` : ''}; build it once with: ${MORPHEUS.build}`;
      }
      return undefined;
    },
    crunch(betaForms) {
      const run = spawnSync(command, ['run', '--rm', '-i', '-e', 'MORPHLIB=stemlib', image, 'bin/cruncher', '-S'], {
        input: betaForms.join('\n') + '\n',
        encoding: 'utf8',
        maxBuffer: 1 << 28,
      });
      if (run.error || run.status !== 0) throw new Error(`Morpheus failed: ${run.error?.message ?? (run.stderr ?? '').trim()}`);
      return run.stdout;
    },
  };
}

/** What a run says once however many books it runs. */
export interface MorpheusState {
  said: boolean;
}

/**
 * The cache at `file` with the forms it lacks asked of Morpheus and added (the file is rewritten only when something was added). When Morpheus cannot run and
 * there are forms to ask, the step says so once (`state`) and the cache is what it was. A form with a character beta code cannot write is not asked.
 */
export function ensureCache(engine: MorpheusEngine, file: string, forms: readonly string[], log: (line: string) => void, state: MorpheusState): MorpheusCache {
  const text = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  const found = text === undefined ? new Map<string, MorpheusForm>() : parseCache(text);
  // a file made by an earlier mapping is read as it is while Morpheus cannot run, and asked again whole once it can
  const stale = text !== undefined && !cacheIsCurrent(text);
  const cache = stale ? new Map<string, MorpheusForm>() : found;
  const asked = [...new Set(forms.map((f) => f.normalize('NFC')))].filter((f) => !cache.has(f));
  const sent = asked.flatMap((form) => {
    const beta = toBeta(form);
    return beta ? [[form, beta] as const] : [];
  });
  if (sent.length === 0) return found;
  const why = engine.unavailable();
  if (why) {
    if (!state.said) log(`Morpheus skipped: ${why}`);
    state.said = true;
    return found;
  }
  const entries = parseCruncher(engine.crunch(sent.map(([, beta]) => beta)), sent.map(([, beta]) => beta));
  sent.forEach(([form], i) => cache.set(form, formOf(entries[i])));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, cacheText(cache));
  return cache;
}
