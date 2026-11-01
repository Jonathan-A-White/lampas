// scripts/lxx/parser.ts — layer 2 of the Septuagint derivation, the paradigm parser (docs/lxx-derivation.md, 'Layer 2'; the probe's layer 2, moved).
// It learns ending rules from TAGNT's own (form, lemma, parsing) triples: each New Testament form is matched against its lemma, after the augment,
// a reduplication or a compound's prefix is undone (ἐπεφέρετο is read as ἐπι-φερ-ετο beside ἐπιφέρω), and what is left over on each side is a rule
// ('-ετο for the lemma's -ω is V-IPI-3S'). A form the New Testament lacks is parsed by the same rules backwards, proposing only lemmas TBESG has, with a
// parsing that fits the lemma (scripts/lxx/tbesg.ts). When no rule fits, analogy: a New Testament form of the same stem with another ending
// (Γενηθήτωσαν beside γενηθήτω) gives its lemma, and the ending pair, as other lemmas show it, gives the parsing.
// Everything is compared on bareOf's letters (no accents or breathings, lower case, final sigma as sigma).
import { bareOf, keyOf } from './swete';
import { fits, posKey, type Lexicon } from './tbesg';
import type { Analysis, TagntRow } from './tagnt';

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

// ---------------------------------------------------------------- the trained parser

export interface Parser {
  rules: Rules;
  analogy: Analogy;
  lexicon: Lexicon;
  /** lemma -> what the New Testament shows it as (posKey) */
  ntPos: Map<string, Set<string>>;
  /** how many distinct triples it learned from */
  triples: number;
}

/** Trains the parser on TAGNT's rows (a hidden book already left out) with TBESG's lemmas. */
export function trainParser(rows: readonly TagntRow[], lexicon: Lexicon): Parser {
  const ntPos = new Map<string, Set<string>>();
  for (const r of rows) {
    let s = ntPos.get(r.lemma);
    if (!s) ntPos.set(r.lemma, (s = new Set()));
    s.add(posKey(r.morph));
  }
  const triples = triplesOf(rows);
  return { rules: trainRules(triples), analogy: trainAnalogy(triples), lexicon, ntPos, triples: triples.length };
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
