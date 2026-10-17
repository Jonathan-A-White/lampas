// src/data/grammar/uses.ts — what a word is doing in its verse (mw-br588b.1), pure. usesOf(verse) reads the parsing codes and the lemmas of a verse's
// Greek words, never the English, and finds the uses a syntax idea can be drilled on: agreement, the article standing alone and its position,
// postpositives, ὅτι and ἵνα clauses, adverbial participles, the genitive absolute, the periphrastic, the articular and complementary infinitives,
// the hortatory subjunctive, prohibitions, οὐ μή and the three conditions. The ids are PROVISIONAL: they are story b's idea ids, so they are not renamed.
// The Greek has no punctuation, so a clause is guessed from its words; a rule that cannot be sure finds nothing (precision over recall).
import type { GreekWord, Verse } from '../chapter';
import { splitParse } from '../parseCode';

export const USE_IDS = [
  'agreement',
  'article-substantival',
  'article-position',
  'postpositive',
  'clause-hoti',
  'clause-hina',
  'participle-adverbial',
  'genitive-absolute',
  'periphrastic',
  'infinitive-articular',
  'infinitive-complement',
  'subjunctive-hortatory',
  'prohibition',
  'ou-me',
  'condition',
] as const;

export type UseId = (typeof USE_IDS)[number];

/** One thing a verse's words are doing together. */
export interface Use {
  id: UseId;
  /** indices into verse.g, in text order */
  words: number[];
  /** the word the use hangs on: the noun of an agreement, the participle of a genitive absolute, the verb a complementary infinitive depends on */
  head?: number;
  /** 'attributive' | 'predicate' for article-position; 'first' | 'second' | 'third' for condition */
  detail?: string;
}

interface Parsed {
  /** the code's head letters: 'V', 'N', 'T', 'CONJ', 'PRT', 'R' ... */
  kind: string;
  pos: string;
  case?: string;
  number?: string;
  gender?: string;
  tense?: string;
  mood?: string;
  person?: string;
}

const parsed = new Map<string, Parsed>();

function parseOf(code: string): Parsed {
  const known = parsed.get(code);
  if (known) return known;
  const kind = code.split('-')[0];
  let out: Parsed = { kind, pos: 'other' };
  try {
    const split = splitParse(code);
    const value = (id: string): string | undefined => split.features.find((f) => f.id === id)?.value;
    out = { kind, pos: split.pos, case: value('case'), number: value('number'), gender: value('gender'), tense: value('tense'), mood: value('mood'), person: value('person') };
  } catch {
    // a code the parser does not know says nothing
  }
  parsed.set(code, out);
  return out;
}

const nfc = (list: string[]): Set<string> => new Set(list.map((s) => s.normalize('NFC')));

const POSTPOSITIVES = nfc(['δέ', 'γάρ', 'οὖν', 'μέν', 'τε']);
/** conjunctions that join two parts of one clause or two clauses without starting a subordinate one */
const COORDINATORS = nfc(['καί', 'δέ', 'γάρ', 'οὖν', 'τε', 'ἤ', 'οὔτε', 'οὐδέ', 'μήτε', 'μηδέ', 'εἴτε']);
/** adverbs that start a subordinate clause */
const SUBORDINATING_ADVERBS = nfc(['ὅπως', 'ὅπου', 'ὡς', 'ὅτε', 'ὅταν', 'ἕως', 'ὥσπερ', 'καθάπερ', 'καθώς', 'ἡνίκα', 'ὅθεν', 'οὗ', 'πρίν', 'ἄχρι', 'μέχρι', 'μήποτε', 'ἐπάν']);
/** adjectives whose place beside the article does not say attributive or predicate */
const FREE_POSITION = nfc(['πᾶς', 'ἅπας', 'ὅλος', 'ἄλλος', 'ἕτερος', 'ἀμφότεροι', 'ἕκαστος']);
/** adverbs that ask a question: a 1st plural subjunctive after one wonders ('what shall we do?'), it does not urge */
const QUESTIONING = nfc(['πῶς', 'ποῦ', 'πότε', 'πόθεν', 'τί']);
const COMPLEMENTED = nfc(['δύναμαι', 'θέλω', 'μέλλω', 'δεῖ', 'ἄρχομαι']);

const FINITE_MOODS = new Set(['indicative', 'imperative', 'subjunctive', 'optative']);
const NOMINAL_POS = new Set(['noun', 'adjective', 'article', 'pronoun']);

type Words = readonly GreekWord[];

interface Reader {
  words: Words;
  p: (i: number) => Parsed;
  lemma: (i: number) => string;
}

const isVerb = (r: Reader, i: number): boolean => r.p(i)?.pos === 'verb';
const isFiniteVerb = (r: Reader, i: number): boolean => isVerb(r, i) && FINITE_MOODS.has(r.p(i).mood ?? '');
const isMood = (r: Reader, i: number, mood: string): boolean => isVerb(r, i) && r.p(i).mood === mood;
const isParticiple = (r: Reader, i: number): boolean => isMood(r, i, 'participle');
const isPostpositive = (r: Reader, i: number): boolean => POSTPOSITIVES.has(r.lemma(i));
const isNominal = (r: Reader, i: number): boolean => {
  const p = r.p(i);
  return p !== undefined && NOMINAL_POS.has(p.pos) && p.case !== undefined;
};
const isLemma = (r: Reader, i: number, ...lemmas: string[]): boolean => r.words[i] !== undefined && lemmas.some((l) => r.lemma(i) === l.normalize('NFC'));

/** A word that starts a subordinate clause: a conjunction that is no coordinator, a condition word, a relative pronoun, or an adverb that opens a clause. */
function isSubordinator(r: Reader, i: number): boolean {
  const p = r.p(i);
  if (p.kind === 'COND' || p.kind === 'R') return true;
  if (p.pos === 'conjunction') return !COORDINATORS.has(r.lemma(i));
  return p.pos === 'adverb' && SUBORDINATING_ADVERBS.has(r.lemma(i));
}

/** The words agree in case, number and gender. */
function agrees(r: Reader, a: number, b: number): boolean {
  const [x, y] = [r.p(a), r.p(b)];
  return x.case !== undefined && x.case === y.case && x.number !== undefined && x.number === y.number && x.gender !== undefined && x.gender === y.gender;
}

const sorted = (words: number[]): number[] => [...new Set(words)].sort((a, b) => a - b);

/** Skips a postpositive (and nothing else) after `i`: the index of the next word that counts. */
function pastPostpositive(r: Reader, i: number): number {
  return i < r.words.length && isPostpositive(r, i) ? i + 1 : i;
}

// ---- agreement, article position ----

const MODIFIER_KINDS = new Set(['A', 'S', 'D']);

/** A word that can stand beside a noun and agree with it (a participle only counts inside an article's group). */
function isModifier(r: Reader, i: number, noun: number): boolean {
  const p = r.p(i);
  if (!agrees(r, i, noun)) return false;
  return p.pos === 'article' || MODIFIER_KINDS.has(p.kind) || isParticiple(r, i);
}

function agreementUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, n) => {
    if (r.p(n).pos !== 'noun' || r.p(n).gender === undefined) return;
    const left: number[] = [];
    for (let i = n - 1; i >= 0 && isModifier(r, i, n); i--) left.unshift(i);
    const right: number[] = [];
    for (let i = pastPostpositive(r, n + 1); i < r.words.length && isModifier(r, i, n); i = pastPostpositive(r, i + 1)) right.push(i);
    // a modifier after the noun counts when it is an adjective or the article that leads one, never an article with nothing agreeing after it
    while (right.length > 0 && r.p(right[right.length - 1]).pos === 'article') right.pop();
    let group = [...left, n, ...right];
    const hasArticle = group.some((i) => r.p(i).pos === 'article');
    group = group.filter((i) => !isParticiple(r, i) || hasArticle);
    // αὐτός in front of the article is the intensive 'the very ...': αὐτὸ τὸ πνεῦμα
    const first = group[0];
    if (r.p(first).pos === 'article' && first > 0 && r.lemma(first - 1) === 'αὐτός'.normalize('NFC') && agrees(r, first - 1, n)) group.unshift(first - 1);
    // the group must be one run: a participle dropped from the middle would leave a hole
    const contiguous = group.every((w, k) => k === 0 || w - group[k - 1] === 1 || (isPostpositive(r, w - 1) && w - group[k - 1] === 2));
    if (group.length > 1 && contiguous) out.push({ id: 'agreement', words: sorted(group), head: n });
  });
}

function positionUses(r: Reader, out: Use[]): void {
  const adjective = (i: number, n: number): boolean => r.p(i).pos === 'adjective' && agrees(r, i, n) && !FREE_POSITION.has(r.lemma(i));
  const article = (i: number, n: number): boolean => r.p(i).pos === 'article' && agrees(r, i, n);
  r.words.forEach((_, n) => {
    if (r.p(n).pos !== 'noun' || r.p(n).gender === undefined) return;
    const add = (detail: 'attributive' | 'predicate', words: number[]): void => {
      out.push({ id: 'article-position', words: sorted(words), head: n, detail });
    };
    // article, adjective, noun
    if (n >= 2 && article(n - 2, n) && adjective(n - 1, n)) add('attributive', [n - 2, n - 1, n]);
    // adjective, article, noun
    else if (n >= 2 && adjective(n - 2, n) && article(n - 1, n)) add('predicate', [n - 2, n - 1, n]);
    // article, noun, article, adjective
    if (n >= 1 && article(n - 1, n) && n + 2 < r.words.length && article(n + 1, n) && adjective(n + 2, n)) add('attributive', [n - 1, n, n + 1, n + 2]);
    // article, noun, adjective
    else if (n >= 1 && article(n - 1, n) && n + 1 < r.words.length && adjective(n + 1, n)) add('predicate', [n - 1, n, n + 1]);
  });
}

// ---- the article standing alone ----

/** After a preposition: the nominal words that follow it in the case of the first, the whole phrase 'ἐν Χριστῷ Ἰησοῦ'. */
function prepositionPhrase(r: Reader, prep: number): number[] {
  const words = [prep];
  const caseOf = r.p(prep + 1)?.case;
  for (let i = prep + 1; i < r.words.length && isNominal(r, i) && r.p(i).case === caseOf; i++) words.push(i);
  return words.length > 1 ? words : [];
}

function substantivalUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, t) => {
    if (r.p(t).pos !== 'article') return;
    // 'the word ... the word' beside a noun that agrees is an attributive article, not one that stands alone
    if (t > 0 && r.p(t - 1).pos === 'noun' && agrees(r, t - 1, t)) return;
    const x = pastPostpositive(r, t + 1);
    if (x >= r.words.length) return;
    const p = r.p(x);
    const agreeing = (i: number): boolean => i < r.words.length && r.p(i).pos === 'noun' && agrees(r, i, t);
    if (p.pos === 'adjective' || isParticiple(r, x)) {
      if (!agrees(r, x, t)) return;
      // an agreeing noun right after (or after another agreeing adjective and 'καί') makes it attributive
      let after = x + 1;
      while (after < r.words.length && (r.lemma(after) === 'καί' || (r.p(after).pos === 'adjective' && agrees(r, after, t)))) after++;
      if (agreeing(x + 1) || agreeing(after)) return;
      out.push({ id: 'article-substantival', words: [t, x], head: x });
    } else if (p.pos === 'adverb') {
      if (agreeing(x + 1)) return;
      out.push({ id: 'article-substantival', words: [t, x], head: x });
    } else if (p.pos === 'preposition') {
      const phrase = prepositionPhrase(r, x);
      if (phrase.length === 0 || agreeing(phrase[phrase.length - 1] + 1)) return;
      out.push({ id: 'article-substantival', words: [t, ...phrase], head: x });
    }
  });
}

// ---- postpositives ----

/** The unit that ends at `end`: a nominal with the nominals of its own case before it and the preposition in front, or the word alone. */
function unitStart(r: Reader, end: number): number {
  let start = end;
  if (isNominal(r, end)) {
    while (start > 0 && isNominal(r, start - 1) && r.p(start - 1).case === r.p(end).case) start--;
    if (start > 0 && r.p(start - 1).pos === 'preposition') start--;
  }
  return start;
}

function postpositiveUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, i) => {
    if (!isPostpositive(r, i) || i === 0) return;
    const start = unitStart(r, i - 1);
    // second in its clause: one unit before it, and before the unit the verse's start or a word that opens a clause
    const before = start - 1;
    const opens = before < 0 || (r.p(before).pos === 'conjunction' && !isPostpositive(r, before)) || r.p(before).kind === 'COND';
    if (opens && !isPostpositive(r, i - 1)) out.push({ id: 'postpositive', words: [i] });
  });
}

// ---- clauses ----

/** The nearest verb before `i` with no clause opener between, or undefined. */
function governingVerb(r: Reader, i: number): number | undefined {
  for (let k = i - 1; k >= 0; k--) {
    if (isVerb(r, k)) return k;
    if (isSubordinator(r, k)) return undefined;
  }
  return undefined;
}

function hotiUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, i) => {
    if (!isLemma(r, i, 'ὅτι') || r.p(i).pos !== 'conjunction') return;
    let verb: number | undefined;
    for (let k = i + 1; k < r.words.length && !isSubordinator(r, k); k++) {
      if (isFiniteVerb(r, k)) {
        verb = k;
        break;
      }
    }
    out.push({ id: 'clause-hoti', words: verb === undefined ? [i] : [i, verb], head: governingVerb(r, i) });
  });
}

function hinaUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, i) => {
    if (!isLemma(r, i, 'ἵνα', 'ὅπως')) return;
    for (let k = i + 1; k < r.words.length && !isSubordinator(r, k); k++) {
      if (isMood(r, k, 'subjunctive')) {
        out.push({ id: 'clause-hina', words: [i, k], head: k });
        return;
      }
      if (isFiniteVerb(r, k)) return;
    }
  });
}

/** The words from the clause opener before `i` to the one after it: the stretch with no subordinator in it. */
function segmentOf(r: Reader, i: number): [number, number] {
  let start = i;
  while (start > 0 && !isSubordinator(r, start)) start--;
  let end = i;
  while (end + 1 < r.words.length && !isSubordinator(r, end + 1)) end++;
  return [start, end];
}

// ---- participles ----

function isPeriphrasticPair(r: Reader, be: number, ptc: number): boolean {
  // δέον ἐστίν is 'it is necessary', the participle of δεῖ is no predicate
  if (!isLemma(r, be, 'εἰμί') || !isFiniteVerb(r, be) || !isParticiple(r, ptc) || isLemma(r, ptc, 'εἰμί', 'δεῖ')) return false;
  if (r.p(ptc).case !== 'nominative' || r.p(be).number !== r.p(ptc).number) return false;
  const [lo, hi] = [Math.min(be, ptc), Math.max(be, ptc)];
  for (let k = lo + 1; k < hi; k++) {
    const p = r.p(k);
    if (!(p.pos === 'adverb' || p.pos === 'particle' || isPostpositive(r, k))) return false;
  }
  // an article in front makes the participle a substantive ('the one coming'), not a part of the verb
  return !(ptc > 0 && r.p(ptc - 1).pos === 'article');
}

function periphrasticUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, be) => {
    if (!isLemma(r, be, 'εἰμί') || !isFiniteVerb(r, be)) return;
    for (const dir of [1, -1]) {
      for (let k = be + dir, steps = 0; k >= 0 && k < r.words.length && steps < 3; k += dir, steps++) {
        if (isParticiple(r, k)) {
          if (isPeriphrasticPair(r, be, k)) out.push({ id: 'periphrastic', words: sorted([be, k]), head: be });
          break;
        }
        const p = r.p(k);
        if (!(p.pos === 'adverb' || p.pos === 'particle' || isPostpositive(r, k))) break;
      }
    }
  });
}

/** An agreeing nominative article before the participle that is no noun's article ('ὁ ... ποιῶν'), found without crossing a clause opener, a verb or 'καί'. */
function hasArticleBefore(r: Reader, ptc: number): boolean {
  for (let k = ptc - 1; k >= 0; k--) {
    if (isSubordinator(r, k) || isVerb(r, k) || r.lemma(k) === 'καί') return false;
    if (r.p(k).pos === 'article' && agrees(r, k, ptc) && !(k + 1 < ptc && r.p(k + 1).pos === 'noun' && agrees(r, k + 1, ptc))) return true;
  }
  return false;
}

function adverbialUses(r: Reader, periphrastic: Use[], out: Use[]): void {
  r.words.forEach((_, i) => {
    if (!isParticiple(r, i) || r.p(i).case !== 'nominative') return;
    if (hasArticleBefore(r, i) || periphrastic.some((u) => u.words.includes(i))) return;
    const [start, end] = segmentOf(r, i);
    let finite = false;
    for (let k = start; k <= end; k++) finite = finite || isFiniteVerb(r, k);
    if (finite) out.push({ id: 'participle-adverbial', words: [i] });
  });
}

function genitiveAbsoluteUses(r: Reader, out: Use[]): void {
  const open = (i: number): boolean => i < 0 || ['conjunction', 'particle', 'adverb', 'conditional', 'interjection'].includes(r.p(i).pos);
  r.words.forEach((_, i) => {
    if (!isParticiple(r, i) || r.p(i).case !== 'genitive' || (i > 0 && r.p(i - 1).pos === 'article')) return;
    // the genitive substantive beside the participle: a noun or αὐτός, before it or after it, with an article and a postpositive allowed between
    for (const dir of [-1, 1]) {
      let k = i + dir;
      if (dir === -1 && k >= 0 && isPostpositive(r, k)) k--;
      if (dir === 1 && k < r.words.length && isPostpositive(r, k)) k++;
      if (k < 0 || k >= r.words.length) continue;
      const lead = r.p(k).pos === 'article' ? k : -1;
      const noun = dir === 1 ? (lead >= 0 && r.p(k + 1)?.pos === 'noun' ? k + 1 : k) : k;
      const substantive = r.p(noun);
      if (!(substantive.pos === 'noun' || (substantive.kind === 'P' && r.lemma(noun) === 'αὐτός'.normalize('NFC')))) continue;
      if (!agrees(r, noun, i)) continue;
      const nounArticle = dir === -1 && noun > 0 && r.p(noun - 1).pos === 'article' && agrees(r, noun - 1, noun) ? noun - 1 : -1;
      const words = sorted([i, noun, ...(lead >= 0 && dir === 1 ? [lead] : []), ...(nounArticle >= 0 ? [nounArticle] : [])]);
      // nothing governs the pair: it begins the clause, after a conjunction, particle or adverb
      if (!open(words[0] - 1)) continue;
      out.push({ id: 'genitive-absolute', words, head: i });
      return;
    }
  });
}

// ---- infinitives ----

function articularUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, t) => {
    if (r.p(t).pos !== 'article' || r.p(t).gender !== 'neuter') return;
    for (let k = t + 1; k < r.words.length && k <= t + 8; k++) {
      if (isMood(r, k, 'infinitive')) {
        const prep = t > 0 && r.p(t - 1).pos === 'preposition' ? [t - 1] : [];
        out.push({ id: 'infinitive-articular', words: [...prep, t, k], head: k });
        return;
      }
      if (isVerb(r, k) || isSubordinator(r, k) || (r.p(k).pos === 'conjunction' && !isPostpositive(r, k))) return;
      // a noun or adjective that agrees with the article is its own, not the infinitive's
      if ((r.p(k).pos === 'noun' || r.p(k).pos === 'adjective') && agrees(r, k, t)) return;
    }
  });
}

function complementUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, v) => {
    if (!isVerb(r, v) || !COMPLEMENTED.has(r.lemma(v)) || isMood(r, v, 'infinitive')) return;
    // 'θεῷ ἀρέσαι οὐ δύνανται': the infinitive may come first, with only a negative or an adverb between
    for (let k = v - 1; k >= 0 && k >= v - 3; k--) {
      if (isMood(r, k, 'infinitive')) {
        if (!(r.p(k - 1)?.pos === 'article')) out.push({ id: 'infinitive-complement', words: [k, v], head: v });
        return;
      }
      if (!(r.p(k).pos === 'particle' || r.p(k).pos === 'adverb')) break;
    }
    for (let k = v + 1; k < r.words.length && k <= v + 6; k++) {
      if (isMood(r, k, 'infinitive')) {
        // an infinitive led by a neuter article is the articular one
        if (!(r.p(k - 1).pos === 'article' && r.p(k - 1).gender === 'neuter')) out.push({ id: 'infinitive-complement', words: [v, k], head: v });
        return;
      }
      if (isVerb(r, k) || isSubordinator(r, k) || (r.p(k).pos === 'conjunction' && !isPostpositive(r, k))) return;
    }
  });
}

// ---- moods ----

/** Nothing before `i` in the verse opens a subordinate clause or negates: the verb stands in a main clause. */
function standsFree(r: Reader, i: number): boolean {
  for (let k = 0; k < i; k++) {
    if (isSubordinator(r, k) || r.p(k).kind === 'I' || QUESTIONING.has(r.lemma(k)) || isLemma(r, k, 'ἵνα', 'ὅπως', 'μή', 'ἄν')) return false;
  }
  return true;
}

function hortatoryUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, i) => {
    const p = r.p(i);
    if (isMood(r, i, 'subjunctive') && p.person === '1st person' && p.number === 'plural' && standsFree(r, i)) out.push({ id: 'subjunctive-hortatory', words: [i] });
  });
}

/** The verb after a μή, within a few words and with no verb or conjunction between. */
function verbAfter(r: Reader, from: number): number | undefined {
  for (let k = from + 1; k < r.words.length && k <= from + 4; k++) {
    if (isVerb(r, k)) return k;
    if (isSubordinator(r, k) || r.p(k).pos === 'conjunction') return undefined;
  }
  return undefined;
}

function prohibitionUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, m) => {
    if (!isLemma(r, m, 'μή') || r.p(m).pos !== 'particle' || !standsFree(r, m)) return;
    // 'οὐ μή' is the strong denial below, not a prohibition
    if (m > 0 && isLemma(r, m - 1, 'οὐ')) return;
    const v = verbAfter(r, m);
    if (v === undefined) return;
    const p = r.p(v);
    const aoristSubjunctive = p.mood === 'subjunctive' && p.tense === 'aorist' && (p.person === '2nd person' || p.person === '3rd person');
    const presentImperative = p.mood === 'imperative' && p.tense === 'present';
    if (aoristSubjunctive || presentImperative) out.push({ id: 'prohibition', words: [m, v], head: v });
  });
}

function ouMeUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, m) => {
    if (m === 0 || !isLemma(r, m, 'μή') || !isLemma(r, m - 1, 'οὐ')) return;
    const v = verbAfter(r, m);
    if (v === undefined) return;
    const p = r.p(v);
    if (p.mood === 'subjunctive' || (p.mood === 'indicative' && p.tense === 'future')) out.push({ id: 'ou-me', words: [m - 1, m, v], head: v });
  });
}

// ---- conditions ----

const PAST_TENSES = new Set(['imperfect', 'aorist', 'pluperfect']);

/** The first finite verb after a condition word (a participle or infinitive on the way is passed over), when nothing that opens another clause comes first. */
function protasisVerb(r: Reader, cond: number): number | undefined {
  for (let k = cond + 1; k < r.words.length; k++) {
    if (isFiniteVerb(r, k)) return k;
    if (isSubordinator(r, k)) return undefined;
  }
  return undefined;
}

function conditionUses(r: Reader, out: Use[]): void {
  r.words.forEach((_, c) => {
    if (r.p(c).kind !== 'COND') return;
    const verb = protasisVerb(r, c);
    if (isLemma(r, c, 'ἐάν')) {
      if (verb !== undefined && isMood(r, verb, 'subjunctive')) out.push({ id: 'condition', words: [c, verb], head: verb, detail: 'third' });
      return;
    }
    if (!isLemma(r, c, 'εἰ')) return;
    if (verb === undefined) {
      // 'εἰ ὁ θεὸς ὑπὲρ ἡμῶν': no verb after it, so εἰμί is understood, but 'εἰ μή' is 'except', no condition
      const exceptive = r.words[c + 1] !== undefined && isLemma(r, c + 1, 'μή');
      if (!exceptive && !r.words.some((_, k) => k > c && isVerb(r, k))) out.push({ id: 'condition', words: [c], detail: 'first' });
      return;
    }
    const p = r.p(verb);
    if (p.mood !== 'indicative') return;
    if (!PAST_TENSES.has(p.tense ?? '')) {
      out.push({ id: 'condition', words: [c, verb], head: verb, detail: 'first' });
      return;
    }
    // a past indicative with ἄν in the main clause is the second condition
    if (r.words.some((_, k) => k > verb && isLemma(r, k, 'ἄν'))) {
      out.push({ id: 'condition', words: [c, verb], head: verb, detail: 'second' });
      return;
    }
    // without ἄν it may be either; a main clause in the present or the future (real, not contrary to fact) settles it as the first, otherwise nothing is sure
    const real = r.words.some((_, k) => k > verb && isFiniteVerb(r, k) && !isSubordinator(r, k) && ['present', 'future', 'perfect'].includes(r.p(k).tense ?? '') && r.p(k).mood !== 'subjunctive');
    if (real) out.push({ id: 'condition', words: [c, verb], head: verb, detail: 'first' });
  });
}

/** What the words of a verse are doing together, in text order of their first word. Reads the Greek alone; a verse with nothing sure in it gives []. */
export function usesOf(verse: Verse): Use[] {
  const words = verse.g;
  const reader: Reader = {
    words,
    p: (i) => parseOf(words[i]?.p ?? ''),
    lemma: (i) => (words[i]?.l ?? '').normalize('NFC'),
  };
  const periphrastic: Use[] = [];
  periphrasticUses(reader, periphrastic);
  const uses: Use[] = [...dedupe(periphrastic)];
  agreementUses(reader, uses);
  positionUses(reader, uses);
  substantivalUses(reader, uses);
  postpositiveUses(reader, uses);
  hotiUses(reader, uses);
  hinaUses(reader, uses);
  adverbialUses(reader, periphrastic, uses);
  genitiveAbsoluteUses(reader, uses);
  articularUses(reader, uses);
  complementUses(reader, uses);
  hortatoryUses(reader, uses);
  prohibitionUses(reader, uses);
  ouMeUses(reader, uses);
  conditionUses(reader, uses);
  return uses.sort((a, b) => a.words[0] - b.words[0] || USE_IDS.indexOf(a.id) - USE_IDS.indexOf(b.id));
}

/** The same use found twice (a participle seen from the verb on either side) once. */
function dedupe(list: Use[]): Use[] {
  const seen = new Set<string>();
  return list.filter((u) => {
    const key = `${u.id}:${u.words.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
