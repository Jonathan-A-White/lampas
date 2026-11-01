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
import { hasLower, keyOf, PUNCT } from './swete';

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
 * Cruncher's output: for each form an echo line, then its `<NL>…</NL>` segments (none when it does not know the form). With `inputs`, the echoes must be those
 * forms in that order.
 */
export function parseCruncher(output: string, inputs?: readonly string[]): CrunchEntry[] {
  const entries: CrunchEntry[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith('<NL>')) {
      entries.push({ input: line.trim(), raws: [] });
      continue;
    }
    const entry = entries.at(-1);
    if (!entry) throw new Error(`Morpheus: an analysis before any form: ${line}`);
    for (const m of line.matchAll(/<NL>(.*?)<\/NL>/g)) {
      const raw = parseAnalysis(m[1]);
      if (raw) entry.raws.push(raw);
    }
  }
  if (inputs) {
    if (entries.length !== inputs.length) throw new Error(`Morpheus answered ${entries.length} forms for ${inputs.length}`);
    entries.forEach((e, i) => {
      if (e.input !== inputs[i]) throw new Error(`Morpheus answered '${e.input}' where '${inputs[i]}' was asked`);
    });
  }
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
const VOICES: Readonly<Record<string, string>> = { act: 'A', mid: 'M', pass: 'P', mp: 'E' };
const MOODS: Readonly<Record<string, string>> = { ind: 'I', subj: 'S', opt: 'O', imperat: 'M', inf: 'N', part: 'P' };
/** Morpheus's ending tables of adjectives (stemlib/Greek/endtables); every other table that holds a case and number is a noun's. */
const ADJECTIVE_TABLES: ReadonlySet<string> = new Set([
  'os_h_on', 'os_a_on', 'os_on', 'oos_oh_oon', 'oos_oon', 'us_eia_u', 'hs_es', 'wn_on', 'wn_on_comp', 'wn_ousa_on', 'ws_wn', 'ws_wn_long', 'as_asa_an', 'eis_essa',
  'hn_eina_en', 'heis_hessa', 'oeis_oessa', 'ous_ontos', 'is_idos_adj', 'is_itos_adj', 'n_nos_adj', 'art_adj',
]);
/** The class after `indeclform`: the indeclinable words the mapping covers. */
const INDECLINABLE: Readonly<Record<string, string>> = { conj: 'CONJ', particle: 'PRT', adverb: 'ADV', prep: 'PREP' };
/** More readings than this from one segment (every gender and case it lists) are too loose to be candidates. */
const MAX_READINGS = 6;

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
 * One reading of Morpheus as TAGNT's codes, or undefined when the mapping is not one reading to one code. Mapped: a finite verb, an infinitive and a participle
 * of the present, imperfect, future and aorist (first or second by the ending table, passive by `aor_pass`); a noun; an adjective (by the ending table); the
 * article; a conjunction, a particle, an adverb and a preposition. A list of genders or cases in one reading is a code each (at most MAX_READINGS). Not mapped:
 * the dual, a comparative or superlative, a dialect without Attic, an unaugmented form, a perfect or pluperfect (TAGNT's second perfect is not told by its
 * table), a pronoun, a numeral, an English gloss, anything else. Deponents are not told either: the passive of a deponent verb maps to P where TAGNT writes O
 * (the report's 'differed' shows it).
 */
export function mapAnalysis(raw: RawAnalysis): Mapped[] | undefined {
  const dialects = words(raw.dialects);
  if (dialects.length && !dialects.includes('attic')) return undefined;
  const flags = words(raw.flags);
  if (flags.includes('unaugmented')) return undefined;
  const lemma = fromBeta(raw.lemma);
  if (!lemma) return undefined;
  const tokens = words(raw.features);
  const classes = words(raw.classes);
  const done = (codes: string[]): Mapped[] | undefined => (codes.length > 0 && codes.length <= MAX_READINGS ? codes.map((code) => ({ lemma, code })) : undefined);

  if (raw.pos === 'V' || raw.pos === 'P') {
    const [tenseWord, ...rest] = tokens;
    let tense = TENSES[tenseWord];
    if (tenseWord === 'aor') {
      const second = classes.some((c) => c === 'aor2' || c === 'aor2_pass');
      const first = classes.some((c) => c === 'aor1' || c === 'aor_pass');
      if (second === first) return undefined;
      tense = second ? '2A' : 'A';
    }
    if (!tense) return undefined;
    // Morpheus prints the mood, then the voice, then a finite verb's person and number or a participle's gender, case and number
    const moodWord = rest.find((t) => Object.hasOwn(MOODS, t));
    const voice = VOICES[rest.find((t) => Object.hasOwn(VOICES, t)) ?? ''];
    const mood = MOODS[moodWord ?? ''];
    if (!mood || !voice) return undefined;
    const tail = rest.filter((t) => !Object.hasOwn(MOODS, t) && !Object.hasOwn(VOICES, t));
    if (moodWord === 'part') {
      const d = declined(tail);
      return d ? done(ordered(d).map((x) => `V-${tense}${voice}P-${x}`)) : undefined;
    }
    if (moodWord === 'inf') return tail.length === 0 ? done([`V-${tense}${voice}N`]) : undefined;
    const [person, number] = tail;
    const p = PERSONS[person ?? ''];
    const n = NUMBERS[number ?? ''];
    if (tail.length !== 2 || !p || !n) return undefined;
    if (tense === 'I' && mood !== 'I') return undefined;
    return done([`V-${tense}${voice}${mood}-${p}${n}`]);
  }

  if (raw.pos !== 'N') return undefined;
  if (flags.includes('indeclform')) {
    const kind = classes.at(-1) ?? '';
    if (kind === 'article') {
      const d = declined(tokens);
      return d ? done(ordered(d).map((x) => `T-${x}`)) : undefined;
    }
    const code = INDECLINABLE[kind];
    return code && tokens.length === 0 ? done([code]) : undefined;
  }
  if (flags.length && !flags.every((f) => f === 'contr' || f === 'enclitic')) return undefined;
  const d = declined(tokens);
  if (!d) return undefined;
  const adjective = classes.some((c) => ADJECTIVE_TABLES.has(c));
  return done(ordered(d).map((x) => `${adjective ? 'A' : 'N'}-${x}`));
}

/** What Morpheus knows of a form: the readings it maps (once each, in order) and how many it could not. */
export interface MorpheusForm {
  analyses: Mapped[];
  unmapped: number;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A cruncher entry as a form's readings. An `E` segment is Morpheus's English gloss of the `N` beside it, not another reading, and is left out. */
export function formOf(entry: CrunchEntry): MorpheusForm {
  const seen = new Map<string, Mapped>();
  let unmapped = 0;
  for (const raw of entry.raws) {
    if (raw.pos === 'E') continue;
    const mapped = mapAnalysis(raw);
    if (!mapped) unmapped++;
    for (const m of mapped ?? []) seen.set(`${m.lemma}/${m.code}`, m);
  }
  return { analyses: [...seen.values()].sort((a, b) => byText(a.lemma, b.lemma) || byText(a.code, b.code)), unmapped };
}

// -------------------------------------------------------------------------------------------------------------------------------- the cache

/** A book's cache: form (morpheusKey) to what Morpheus knows of it. */
export type MorpheusCache = Map<string, MorpheusForm>;

export const CACHE_HEADER = ['form', 'analyses'];

/** The file's text: tab-separated, a header row, one row a form in order, `lemma/code` readings joined by ` | ` and one `unmapped` for each reading left out. */
export function cacheText(cache: ReadonlyMap<string, MorpheusForm>): string {
  const rows = [...cache].sort(([a], [b]) => byText(a, b)).map(([form, f]) => [form, [...f.analyses.map((m) => `${m.lemma}/${m.code}`), ...Array<string>(f.unmapped).fill('unmapped')].join(' | ')]);
  return [CACHE_HEADER, ...rows].map((r) => r.join('\t')).join('\n') + '\n';
}

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
  const cache = existsSync(file) ? parseCache(readFileSync(file, 'utf8')) : new Map<string, MorpheusForm>();
  const asked = [...new Set(forms.map((f) => f.normalize('NFC')))].filter((f) => !cache.has(f));
  const sent = asked.flatMap((form) => {
    const beta = toBeta(form);
    return beta ? [[form, beta] as const] : [];
  });
  if (sent.length === 0) return cache;
  const why = engine.unavailable();
  if (why) {
    if (!state.said) log(`Morpheus skipped: ${why}`);
    state.said = true;
    return cache;
  }
  const entries = parseCruncher(engine.crunch(sent.map(([, beta]) => beta)), sent.map(([, beta]) => beta));
  sent.forEach(([form], i) => cache.set(form, formOf(entries[i])));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, cacheText(cache));
  return cache;
}
