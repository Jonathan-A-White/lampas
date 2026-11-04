// scripts/lxx/parser.ts — layer 2 of the Septuagint derivation, the paradigm parser (docs/lxx-derivation.md, 'Layer 2'; the probe's layer 2, moved).
// It learns ending rules from TAGNT's own (form, lemma, parsing) triples: each New Testament form is matched against its lemma, after the augment,
// a reduplication or a compound's prefix is undone (ἐπεφέρετο is read as ἐπι-φερ-ετο beside ἐπιφέρω), and what is left over on each side is a rule
// ('-ετο for the lemma's -ω is V-IPI-3S'). A form the New Testament lacks is parsed by the same rules backwards, proposing only lemmas TBESG has, with a
// parsing that fits the lemma (scripts/lxx/tbesg.ts). When no rule fits, analogy: a New Testament form of the same stem with another ending
// (Γενηθήτωσαν beside γενηθήτω) gives its lemma, and the ending pair, as other lemmas show it, gives the parsing.
// Everything is compared on bareOf's letters (no accents or breathings, lower case, final sigma as sigma).
import { bareOf, keyOf } from './swete';
import { fits, posKey, type Lexicon, type TbesgName } from './tbesg';
import { inNa28, type Analysis, type TagntRow } from './tagnt';

/** One of a form's candidates from the parser: an analysis, and what produced it, the most support first. */
export interface Candidate extends Analysis {
  via: string[];
}

export interface Triple {
  /** as TAGNT writes it */
  form: string;
  lemma: string;
  morph: string;
}

/** The distinct (form, lemma, parsing) triples of the rows, a form compared as keyOf writes it; the first row of each kept, in the rows' order. */
export function triplesOf(rows: readonly TagntRow[]): Triple[] {
  const seen = new Map<string, Triple>();
  for (const { form, lemma, morph } of rows) {
    const k = `${keyOf(form)}|${lemma}|${morph}`;
    if (!seen.has(k)) seen.set(k, { form, lemma, morph });
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------- undoing the augment, reduplication and a compound's prefix

/** The prepositions a compound verb may begin with, as bareOf writes them. */
export const PREPS = ['αμφι', 'ανα', 'αντι', 'απο', 'δια', 'εισ', 'εκ', 'εν', 'επι', 'κατα', 'μετα', 'παρα', 'περι', 'προ', 'προσ', 'συν', 'υπερ', 'υπο'];
const ASPIRATE: Readonly<Record<string, string>> = { π: 'φ', τ: 'θ', κ: 'χ' };
/** The temporal augment: a long vowel at the front read back as the short ones it may lengthen (ηυ- from ευ- or αυ-, η- from α-, ε- or αι-). */
const TEMPORAL: ReadonlyArray<[string, readonly string[]]> = [
  ['ηυ', ['ευ', 'αυ']],
  ['ει', ['ε']],
  ['η', ['α', 'ε', 'αι']],
  ['ω', ['ο']],
];
const VOWELS = 'αεηιουω';

/** A preposition as written before a vowel or the augment: elided (επ-), maybe aspirated (εφ-); εκ as εξ; περι and προ never elide. */
function elidedForms(p: string): string[] {
  if (p === 'εκ') return ['εξ'];
  if (p === 'περι' || p === 'προ' || !VOWELS.includes(p.at(-1) ?? '')) return [p];
  const e = p.slice(0, -1);
  const out = [e];
  const aspirate = ASPIRATE[e.at(-1) ?? ''];
  if (aspirate) out.push(e.slice(0, -1) + aspirate);
  return out;
}

/** συν and εν as written before the next letter: συμ-, συγ-, συλ-, συσ-; εμ-, εγ-, ελ-. */
function assimilated(p: string, next: string): string {
  if (p === 'συν') {
    if ('βπφμψ'.includes(next)) return 'συμ';
    if ('γκχξ'.includes(next)) return 'συγ';
    if (next === 'λ') return 'συλ';
    if (next === 'σ') return 'συσ';
  }
  if (p === 'εν') {
    if ('βπφμψ'.includes(next)) return 'εμ';
    if ('γκχξ'.includes(next)) return 'εγ';
    if (next === 'λ') return 'ελ';
  }
  return p;
}

/** 'none': the form as it stands; 'aug': an augment undone (also inside a compound, after its prefix); 'redup': a reduplication undone. */
export type Undone = 'none' | 'aug' | 'redup';

export interface Variant {
  /** the form's letters with the augment, reduplication or a compound's augment undone */
  g: string;
  type: Undone;
}

/**
 * Ways to read a form (bareOf's letters) with its augment or reduplication undone, the form itself first: ἐρρ- as ρ-; a syllabic ε- before a
 * consonant dropped; a temporal augment read back (TEMPORAL); a consonant + ε + the same consonant (or its aspirate) at the front dropped as a
 * reduplication; and inside a compound, the augment after an elided or assimilated prefix undone (επεφερετο -> επιφερετο, ενεβλεψεν -> εμβλεψεν).
 * Each reading once: the probe tried an elided prefix's reading twice, counting its rules double (docs/lxx-derivation.md, 'What the move changed').
 */
export function unaugment(f: string): Variant[] {
  const out: Variant[] = [{ g: f, type: 'none' }];
  if (f.startsWith('ερρ')) out.push({ g: f.slice(2), type: 'aug' });
  if (f[0] === 'ε' && f[1] && !VOWELS.includes(f[1])) out.push({ g: f.slice(1), type: 'aug' });
  for (const [t, froms] of TEMPORAL) if (f.startsWith(t)) for (const fr of froms) out.push({ g: fr + f.slice(t.length), type: 'aug' });
  if (f[1] === 'ε' && f[0] && !VOWELS.includes(f[0]) && (f[2] === f[0] || ASPIRATE[f[0]] === f[2])) out.push({ g: f.slice(2), type: 'redup' });
  for (const p of PREPS) {
    for (const e of elidedForms(p)) {
      if (f.startsWith(e + 'ε') && f.length > e.length + 2 && !VOWELS.includes(f[e.length + 1])) {
        const rest = f.slice(e.length + 1);
        out.push({ g: assimilated(p, rest[0]) + rest, type: 'aug' });
        if (e !== p && p !== 'εκ') out.push({ g: p + rest, type: 'aug' });
      }
      for (const [t, froms] of TEMPORAL) {
        if (f.startsWith(e + t) && f.length > e.length + t.length + 1) {
          for (const fr of froms) out.push({ g: e + fr + f.slice(e.length + t.length), type: 'aug' });
        }
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((v) => !seen.has(`${v.type}|${v.g}`) && Boolean(seen.add(`${v.type}|${v.g}`)));
}

const commonPrefix = (a: string, b: string): number => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

// ---------------------------------------------------------------- the ending rules

/** `${type}|${the form's ending}` -> `${the lemma's ending}|${parsing}` -> the lemmas that show it */
export type Rules = Map<string, Map<string, Set<string>>>;

/** A triple's rule: the reading of the form that shares most letters with its lemma (two at least), and what is left on each side. */
export function ruleOf(t: Triple): { key: string; rk: string } | undefined {
  const f = bareOf(t.form);
  const l = bareOf(t.lemma);
  let best: (Variant & { cp: number }) | undefined;
  for (const v of unaugment(f)) {
    const cp = commonPrefix(v.g, l);
    if (!best || cp > best.cp) best = { ...v, cp };
  }
  if (!best || best.cp < 2) return undefined;
  return { key: `${best.type}|${best.g.slice(best.cp)}`, rk: `${l.slice(best.cp)}|${t.morph}` };
}

export function trainRules(triples: readonly Triple[]): Rules {
  const rules: Rules = new Map();
  for (const t of triples) {
    const rule = ruleOf(t);
    if (!rule) continue;
    let r = rules.get(rule.key);
    if (!r) rules.set(rule.key, (r = new Map()));
    let lemmas = r.get(rule.rk);
    if (!lemmas) r.set(rule.rk, (lemmas = new Set()));
    lemmas.add(t.lemma);
  }
  return rules;
}

// ---------------------------------------------------------------- analogy

export interface Analogy {
  /** `${ending A}|${parsing A}|${ending B}` -> parsing B -> how many pairs of forms of one lemma show it */
  pairs: Map<string, Map<string, number>>;
  /** the first four letters -> every distinct (form, lemma, parsing) that begins so */
  byPrefix: Map<string, Array<{ f: string; lemma: string; morph: string }>>;
}

/** Two forms of one lemma that share three letters or more, each with an ending of six letters or fewer, make an ending pair. */
export function trainAnalogy(triples: readonly Triple[]): Analogy {
  const byLemma = new Map<string, Array<{ f: string; morph: string }>>();
  for (const t of triples) {
    let forms = byLemma.get(t.lemma);
    if (!forms) byLemma.set(t.lemma, (forms = []));
    forms.push({ f: bareOf(t.form), morph: t.morph });
  }
  const pairs: Analogy['pairs'] = new Map();
  const byPrefix: Analogy['byPrefix'] = new Map();
  for (const [lemma, forms] of byLemma) {
    const uniq = [...new Map(forms.map((x) => [`${x.f}|${x.morph}`, x])).values()];
    for (const a of uniq) {
      const p4 = a.f.slice(0, 4);
      let near = byPrefix.get(p4);
      if (!near) byPrefix.set(p4, (near = []));
      near.push({ f: a.f, lemma, morph: a.morph });
      for (const b of uniq) {
        if (a === b) continue;
        const cp = commonPrefix(a.f, b.f);
        if (cp < 3 || a.f.length - cp > 6 || b.f.length - cp > 6) continue;
        const k = `${a.f.slice(cp)}|${a.morph}|${b.f.slice(cp)}`;
        let m = pairs.get(k);
        if (!m) pairs.set(k, (m = new Map()));
        m.set(b.morph, (m.get(b.morph) ?? 0) + 1);
      }
    }
  }
  return { pairs, byPrefix };
}

// ---------------------------------------------------------------- names that do not decline (story mw-u2w5klk.13)

/** A name that does not decline, by its lemma, and the gender(s) it takes ('M', 'F', 'N'; none known means all three). */
export interface NameEntry {
  lemma: string;
  genders: readonly string[];
}

export interface NameIndex {
  /** bareOf(a spelling of the name) -> the names written so: TAGNT's one spelling, or TBESG's lemma */
  spelling: Map<string, NameEntry[]>;
  /** the lemma -> the name, for a lemma the parser or layer 1 proposed in one case only */
  lemma: Map<string, NameEntry>;
}

export const NO_NAMES: NameIndex = { spelling: new Map(), lemma: new Map() };

/** The cases a name is offered in, in the order TAGNT lists them; a name that does not decline is singular. */
export const NAME_CASES = ['N', 'G', 'D', 'A', 'V'] as const;
const GENDERS = ['M', 'F', 'N'] as const;
export const isCapital = (s: string): boolean => {
  const first = [...s.normalize('NFC')][0] ?? '';
  return first !== first.toLowerCase();
};

/**
 * The names that do not decline, from the two sources, TAGNT first.
 * TAGNT: a lemma written with a capital, tagged a person or a place (Μαγδαληνή, a woman of Magdala, is not), whose every New Testament noun row (any case, singular or plural) is one spelling, bare letters, in at least two of the
 * nominative, genitive, dative and accusative: Ἀδάμ is ἀδάμ in the nominative, genitive and dative; Ἰησοῦς has Ἰησοῦ, Ἰησοῦς, Ἰησοῦν. A neuter in the nominative and
 * accusative alone shares one form whatever its class, so it is not enough; a name with a plural is declined. The vocative is not counted: Ἰούδα is genitive and vocative.
 * TBESG (readTbesgNames): the rest, a name whose text says `indecl.` that the New Testament has too rarely or not at all (Καϊνάν, Ἰωβήλ).
 * TAGNT's lemma stands where both give the same one. A TAGNT lemma that lists spellings ('Δαυείδ, Δαυίδ, Δαβίδ') is kept as TAGNT writes it, as layer 1 does.
 */
export function indeclinableNames(rows: readonly TagntRow[], tbesg: readonly TbesgName[] = []): NameIndex {
  const seen = new Map<string, { spellings: Set<string>; cases: Set<string>; genders: Set<string>; plural: boolean; name: boolean }>();
  for (const r of rows) {
    const m = /^N-([NGDAV])([SP])([MFN])$/.exec(r.morph);
    if (!m || !isCapital(r.lemma)) continue;
    let s = seen.get(r.lemma);
    if (!s) seen.set(r.lemma, (s = { spellings: new Set(), cases: new Set(), genders: new Set(), plural: false, name: false }));
    if (r.name) s.name = true;
    s.spellings.add(bareOf(r.form));
    s.cases.add(m[1]);
    s.genders.add(m[3]);
    if (m[2] === 'P') s.plural = true;
  }
  const names: NameIndex = { spelling: new Map(), lemma: new Map() };
  const add = (spelling: string, entry: NameEntry): void => {
    let list = names.spelling.get(spelling);
    if (!list) names.spelling.set(spelling, (list = []));
    if (!list.some((e) => e.lemma === entry.lemma)) list.push(entry);
    names.lemma.set(entry.lemma, entry);
  };
  for (const [lemma, s] of [...seen].sort(([a], [b]) => byCode(a, b))) {
    const shown = [...s.cases].filter((c) => 'NGDA'.includes(c));
    const neuterOnly = s.genders.size === 1 && s.genders.has('N');
    const enough = shown.length >= 2 && (!neuterOnly || shown.some((c) => c === 'G' || c === 'D'));
    if (!s.name || s.plural || s.spellings.size !== 1 || !enough) continue;
    add([...s.spellings][0], { lemma, genders: GENDERS.filter((g) => s.genders.has(g)) });
  }
  // TAGNT's evidence of declining beats a line of TBESG's text: Ἰούδας has Ἰούδα, Ἰούδαν and Ἰούδᾳ in the New Testament, and TBESG's entry also says indecl. of its tribe's spelling
  const declined = new Set([...seen].filter(([, s]) => s.spellings.size > 1).map(([lemma]) => lemma));
  for (const t of tbesg) {
    if (names.lemma.has(t.lemma) || declined.has(t.lemma)) continue;
    add(bareOf(t.lemma), { lemma: t.lemma, genders: t.genders });
  }
  return names;
}

/**
 * The candidates an indeclinable name is owed that the word does not have: for a form written with a capital that is a spelling of such a name, or, when it is
 * none, for which layer 1 or the parser proposed such a lemma (Ἰωβέλ, proposed as Ἰωβήλ in one case; Καινάν also gets Κάϊν from the parser, which it is not), every case of the name's gender in the lemma's own name. A name
 * with no gender known is offered in all three. Only the readings the word lacks, in the order of the cases.
 */
export function nameCandidates(form: string, have: ReadonlyArray<{ lemma: string; morph: string }>, names: NameIndex): Array<{ lemma: string; morph: string }> {
  if (!isCapital(form)) return [];
  const found = new Map<string, NameEntry>();
  for (const e of names.spelling.get(bareOf(form)) ?? []) found.set(e.lemma, e);
  if (found.size === 0) {
    for (const c of have) {
      const e = names.lemma.get(c.lemma);
      if (e) found.set(e.lemma, e);
    }
  }
  const owned = new Set(have.map((c) => `${c.lemma}|${c.morph}`));
  const out: Array<{ lemma: string; morph: string }> = [];
  for (const e of found.values()) {
    for (const g of e.genders.length ? e.genders : GENDERS) {
      for (const c of NAME_CASES) {
        const morph = `N-${c}S${g}`;
        if (!owned.has(`${e.lemma}|${morph}`)) out.push({ lemma: e.lemma, morph });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- names no lexicon has: the form as its own lemma (story mw-u2w5klk.19)

/** The case, number and gender of the readings a form name is offered in: every case of every gender, singular (nothing says which gender; the article may, in the agreement check). */
export const FORM_NAME_MORPHS: readonly string[] = GENDERS.flatMap((g) => NAME_CASES.map((c) => `N-${c}S${g}`));

/**
 * The lemma a capitalised form is read as when no lexicon has it, or undefined when its ending is one Greek declines. A name that neither TAGNT nor TBESG has
 * (10,849 words of the 39 books, 4,296 forms: Γαιδάδ, Σελλά, Θόβελ, Εὑειλάτ) is a Hebrew name, and a Hebrew name's form is its lemma where it does not look declined:
 * (1) it ends in a consonant other than ς and ν (Γαιδάδ, Θόβελ, Ἰεροβοάμ); (2) it ends in -ν with the acute or grave on the α or ω before it (Ἰωναθάν, Χεβρών), which the
 * accusative of a Greek name (-ον, -ην, -ιν; Ἰούδαν with the accent earlier; the circumflex -ῶν, -ᾶν) does not; (3) it ends in α, ι, η, ω or υ with the acute or grave on that
 * last vowel (Σελλά, Νεφθαλεί, Ἰερειχώ, Βαναιού), a Greek name's nominative never being accented on its last syllable. Not -ς (Greek's nominative and so many other
 * cases), not -ε or -ο (a vocative, a verb with its enclitic), not an unaccented or circumflex vowel (Μειχαία, Μωσῇ), not a word of fewer than three letters (Ὤ, Ἦ). The lemma is the
 * form in NFC, its grave an acute (a word's grave in the running text). The accent and breathing are the form's own, which a dictionary may write otherwise (Ζοροβαβέλ for Ζοροβάβελ).
 * Measured on the New Testament's own names (docs/lxx-derivation.md, 'Names no lexicon has').
 */
export function formNameLemma(form: string): string | undefined {
  const f = form.normalize('NFC');
  if (!isCapital(f) || !/^[\p{Script=Greek}]+$/u.test(f) || [...f].length < 3) return undefined;
  const d = f.normalize('NFD').toLowerCase();
  const m = /([αεηιουω])([\u0300-\u036f]*)(ν?)$/.exec(d);
  const last = [...d.replace(/[\u0300-\u036f]/g, '')].at(-1) ?? '';
  const lemma = f.normalize('NFD').replaceAll('\u0300', '\u0301').normalize('NFC');
  if (last === 'ς') return undefined;
  if (!/[αεηιουω]/.test(last) && last !== 'ν') return lemma;
  if (!m) return undefined;
  const marks = m[2].replaceAll('\u0300', '\u0301');
  const acute = marks.includes('\u0301') && !marks.includes('\u0342') && !marks.includes('\u0345');
  if (m[3] === 'ν') return acute && 'αω'.includes(m[1]) ? lemma : undefined;
  return acute && 'αιηωυ'.includes(m[1]) ? lemma : undefined;
}

/** The readings a name from its form alone is offered: its form as the lemma, in every case of every gender (FORM_NAME_MORPHS). */
export const formNameCandidates = (lemma: string): Array<{ lemma: string; morph: string }> => FORM_NAME_MORPHS.map((morph) => ({ lemma, morph }));

// ---------------------------------------------------------------- the cases a preposition governs (story mw-u2w5klk.27)

const PARTICIPLE_CASE = /^V-[^-]*P-([NGDAV])[SP][MFN]/;
const DECLINED_CASE = /^[A-Z]-\d?(?:[SP](?=[NGDAV][SP][MFN]))?([NGDAV])[SP]/;
/** The case of a TAGNT code that has one ('N-DSF', 'P-1GS', 'F-3GSM', 'S-1SDSM', 'V-PAP-NSM'): 'N', 'G', 'D', 'A' or 'V'; undefined for any other (PREP, V-PAN, A-NUI, N-PRI). */
export const caseOf = (morph: string): string | undefined => (morph.startsWith('V-') ? PARTICIPLE_CASE : DECLINED_CASE).exec(morph)?.[1];

/** A preposition is checked only when the New Testament shows at least this many declined words right after it. */
export const GOVERN_MIN_WORDS = 20;
/** ... and at most this share of them in the nominative or vocative: more says the word is often not a preposition there (ἕως ἡμέρα ἐστίν, John 9:4). */
export const GOVERN_MAX_NOMINATIVE = 0.01;
/** A case is one the preposition takes when at least this share of its words, and two of them, show it: one is a slip of tagging, as in TAGNT_EVIDENCE. */
export const GOVERN_MIN_SHARE = 0.005;
export const GOVERN_MIN_CASE = 2;
const GOVERNED_CASES = ['G', 'D', 'A'] as const;

/**
 * The cases each preposition governs, as the New Testament shows them: in each verse, NA28's words in TAGNT's order, the case of the word right after a word
 * tagged PREP, where that word has one (an article, noun, adjective, pronoun or participle; a conjunction, adverb, infinitive or verb is passed over, and
 * nothing is read across a verse). Of the pinned TAGNT, 20 prepositions pass GOVERN_MIN_WORDS and GOVERN_MAX_NOMINATIVE (docs/lxx-derivation.md, 'A
 * preposition's case'): ἐν takes the dative (2,705 of 2,706), εἰς the accusative, ἐπί the genitive, dative and accusative. The nominative and vocative are never
 * taken. The cases in the order genitive, dative, accusative.
 */
export function prepositionCases(rows: readonly TagntRow[]): Map<string, string[]> {
  const verses = new Map<string, TagntRow[]>();
  for (const r of rows) {
    if (!inNa28(r)) continue;
    const k = `${r.book}.${r.chapter}.${r.verse}`;
    let v = verses.get(k);
    if (!v) verses.set(k, (v = []));
    v.push(r);
  }
  const seen = new Map<string, Map<string, number>>();
  for (const v of verses.values()) {
    v.sort((a, b) => a.word - b.word);
    for (let i = 0; i + 1 < v.length; i++) {
      if (v[i].morph !== 'PREP') continue;
      const c = caseOf(v[i + 1].morph);
      if (!c) continue;
      let m = seen.get(v[i].lemma);
      if (!m) seen.set(v[i].lemma, (m = new Map()));
      m.set(c, (m.get(c) ?? 0) + 1);
    }
  }
  const out = new Map<string, string[]>();
  for (const [lemma, m] of [...seen].sort(([a], [b]) => byCode(a, b))) {
    const total = [...m.values()].reduce((s, n) => s + n, 0);
    const nominative = (m.get('N') ?? 0) + (m.get('V') ?? 0);
    if (total < GOVERN_MIN_WORDS || nominative > GOVERN_MAX_NOMINATIVE * total) continue;
    const cases = GOVERNED_CASES.filter((c) => (m.get(c) ?? 0) >= GOVERN_MIN_CASE && (m.get(c) ?? 0) >= GOVERN_MIN_SHARE * total);
    if (cases.length) out.set(lemma, cases);
  }
  return out;
}

// ---------------------------------------------------------------- the trained parser

export interface Parser {
  /** the names that do not decline (indeclinableNames): a word that is one gets every case of its gender as a candidate */
  names: NameIndex;
  rules: Rules;
  analogy: Analogy;
  lexicon: Lexicon;
  /** lemma -> what the New Testament shows it as (posKey) */
  ntPos: Map<string, Set<string>>;
  /** how many distinct triples it learned from */
  triples: number;
  /** a preposition's lemma -> the cases it governs (prepositionCases), for the agreement check */
  governs: Map<string, string[]>;
}

/** Trains the parser on TAGNT's rows (a hidden book already left out) with TBESG's lemmas, and the names that do not decline (none when not given). */
export function trainParser(rows: readonly TagntRow[], lexicon: Lexicon, names: NameIndex = NO_NAMES): Parser {
  const ntPos = new Map<string, Set<string>>();
  for (const r of rows) {
    let s = ntPos.get(r.lemma);
    if (!s) ntPos.set(r.lemma, (s = new Set()));
    s.add(posKey(r.morph));
  }
  const triples = triplesOf(rows);
  return { names, rules: trainRules(triples), analogy: trainAnalogy(triples), lexicon, ntPos, triples: triples.length, governs: prepositionCases(rows) };
}

const byCode = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/** Endings in a rule's description: '-' for none. */
const end = (s: string): string => `-${s}`;
const UNDONE_NOTE: Readonly<Record<Undone, string>> = { none: '', aug: ', augment undone', redup: ', reduplication undone' };

/** Accumulates support and descriptions per 'lemma|parsing', and gives the candidates most support first, then by lemma and parsing. */
class Found {
  private readonly support = new Map<string, number>();
  private readonly via = new Map<string, Map<string, number>>();
  add(lemma: string, morph: string, n: number, why: string): void {
    const k = `${lemma}|${morph}`;
    this.support.set(k, (this.support.get(k) ?? 0) + n);
    let v = this.via.get(k);
    if (!v) this.via.set(k, (v = new Map()));
    v.set(why, (v.get(why) ?? 0) + n);
  }
  get size(): number {
    return this.support.size;
  }
  candidates(order: (a: Candidate, b: Candidate) => number): Candidate[] {
    const total = [...this.support.values()].reduce((s, n) => s + n, 0);
    return [...this.support]
      .map(([k, support]) => {
        const [lemma, morph] = k.split('|');
        const via = [...this.via.get(k)!].sort(([a, n], [b, m]) => m - n || byCode(a, b)).map(([why]) => why);
        return { lemma, morph, support, share: support / total, via };
      })
      .sort((a, b) => b.support - a.support || order(a, b));
  }
}

/**
 * The ending rules backwards: for each reading of the form (unaugment) and each ending of up to 12 letters (leaving two), every rule for that ending
 * whose lemma ending, put on the stem, is a TBESG lemma whose entry the parsing fits. A candidate's support is the number of New Testament lemmas
 * behind each rule that gives it, summed. Most support first, then by lemma and parsing.
 */
export function parse(form: string, parser: Parser): Candidate[] {
  const f = bareOf(form);
  const found = new Found();
  for (const v of unaugment(f)) {
    for (let s = 0; s <= Math.min(v.g.length - 2, 12); s++) {
      const gs = v.g.slice(v.g.length - s);
      const r = parser.rules.get(`${v.type}|${gs}`);
      if (!r) continue;
      const stem = v.g.slice(0, v.g.length - s);
      for (const [rk, lemmas] of r) {
        const [ls, morph] = rk.split('|');
        const entries = parser.lexicon.get(stem + ls);
        if (!entries) continue;
        for (const { lemma } of entries) {
          if (!fits(morph, entries.filter((e) => e.lemma === lemma), parser.ntPos.get(lemma))) continue;
          found.add(lemma, morph, lemmas.size, `rule: ${stem}${end(gs)} as ${stem}${end(ls)}${UNDONE_NOTE[v.type]} (${lemmas.size} ${lemmas.size === 1 ? 'lemma' : 'lemmas'})`);
        }
      }
    }
  }
  return found.candidates((a, b) => byCode(a.lemma, b.lemma) || byCode(a.morph, b.morph));
}

/**
 * The parser's second method, used only when the ending rules find nothing: a New Testament form that shares the form's first k letters (k from all but
 * one down to four) whose ending pair with the form other lemmas show (-ω V-AOM-3S beside -ωσαν) gives its lemma and that pair's parsing. The longest k
 * with any candidate wins. Most support first, then by parsing and lemma.
 */
export function byAnalogy(form: string, parser: Parser): Candidate[] {
  const f = bareOf(form);
  const near = parser.analogy.byPrefix.get(f.slice(0, 4)) ?? [];
  for (let k = f.length - 1; k >= 4; k--) {
    const found = new Found();
    for (const n of near) {
      if (commonPrefix(n.f, f) < k) continue;
      const m = parser.analogy.pairs.get(`${n.f.slice(k)}|${n.morph}|${f.slice(k)}`);
      if (!m) continue;
      for (const [morph, c] of m) found.add(n.lemma, morph, c, `analogy: ${n.f} (${n.lemma} ${n.morph}), ${end(n.f.slice(k))} beside ${end(f.slice(k))} (${c} pairs)`);
    }
    if (found.size) return found.candidates((a, b) => byCode(a.morph, b.morph) || byCode(a.lemma, b.lemma));
  }
  return [];
}

/** Layer 2 takes the parser's first candidate when it is the only one, or when it has at least 90% of the support. */
export const PARSER_DOMINANT = 0.9;
/** The parser is less sure than a form the New Testament has: confidence is 0.75 x the candidate's share. */
export const PARSER_CONFIDENCE = 0.75;

/** Whether layer 2 settles a word with these candidates, and how sure it is; undefined when they stay for the model. */
export function settleParsed(candidates: readonly Candidate[]): { analysis: Candidate; confidence: number } | undefined {
  const top = candidates[0];
  if (!top) return undefined;
  if (candidates.length === 1 || top.share >= PARSER_DOMINANT) return { analysis: top, confidence: Math.round(PARSER_CONFIDENCE * top.share * 100) / 100 };
  return undefined;
}
