// scripts/lxx/agreement.ts — the agreement check and the shared-ending rule, run by derive.ts after layers 1 and 2 and before the pending list is written
// (docs/lxx-derivation.md, 'The agreement check'; the probe's 'Error checks for the full run', 2(a) and 2(b); story mw-u2w5klk.3).
// Three rules, in order. (1) A form the New Testament has only as a proper name, which Swete writes in lower case (χλόης, grass, beside the name Chloe),
// goes to the model. (2) The shared-ending rule: an answer of layer 1 or 2 whose ending two cases or genders share (SHARED_ENDINGS, TAGNT_EVIDENCE) is not
// settled on the New Testament's evidence alone; it is demoted to a candidate set, its analyses, the parser's and the ending's other readings. (3) The
// agreement check (`agree`, LINKS): within a verse, and never past a mark of punctuation, an article must agree in gender, number and case with the word
// after it; a settled pair that does not is a break, and both words go to the model. An article, adjective and noun in a row, a noun before an article
// and its adjective or participle, and an adjective or participle beside a noun only choose. A pending or demoted word whose candidates leave exactly one
// that agrees with its settled neighbours takes it, as layer '2a'; where two agree it stays pending: the check never guesses.
import { keyOf } from './swete';
import type { Analysis } from './tagnt';
import type { Candidate } from './parser';
import type { DerivedWord, PendingWord, WordCandidate } from './derive';

/** A word settled by agreement: below layer 1's 0.90 and above the parser's 0.75, since the check reads one neighbour and no syntax. */
export const AGREEMENT_CONFIDENCE = 0.85;
export const AGREEMENT_LAYER = '2a';
export const NOTE_NAME = 'a name in the New Testament: lower case here, for the model';

type Out = DerivedWord | PendingWord;
const isSettled = (w: Out): w is DerivedWord => 'layer' in w;

// ---------------------------------------------------------------- reading TAGNT's codes

/** A parsing's part of speech for this check: 'ptc' a participle, 'inf' an infinitive, 'V' any other verb, otherwise TAGNT's letters ('N', 'A', 'T', 'PREP'). */
export function partOf(morph: string): string {
  const [head, tvm, rest] = morph.split('-');
  if (head !== 'V') return head;
  if (tvm?.endsWith('P') && rest) return 'ptc';
  if (tvm?.endsWith('N') && !rest) return 'inf';
  return 'V';
}

const DECLINED = /^([A-Z])-(\d?[SP]?)([NGDAV][SP][MFN])(?=$|-)/;
const PARTICIPLE = /^(V-[^-]*P)-([NGDAV][SP][MFN])(?=$|-)/;

/** Case, number and gender as TAGNT writes them ('NSN'), or undefined for a parsing without all three (P-1NS, N-PRI, a verb not a participle). */
export function cngOf(morph: string): string | undefined {
  return (PARTICIPLE.exec(morph)?.[2] ?? DECLINED.exec(morph)?.[3]) || undefined;
}

/** The same parsing with another case, number and gender: withCng('A-ASN-C', 'NSN') is 'A-NSN-C'. */
export function withCng(morph: string, cng: string): string {
  const p = PARTICIPLE.exec(morph);
  if (p) return `${p[1]}-${cng}${morph.slice(p[0].length)}`;
  const d = DECLINED.exec(morph);
  if (d) return `${d[1]}-${d[2]}${cng}${morph.slice(d[0].length)}`;
  return morph;
}

const bare = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll('ς', 'σ')
    .replace(/[^\p{L}]/gu, '');

// ---------------------------------------------------------------- the shared-ending rule

/** Every part of speech with a gender of its own in each form: an adjective, the article, a pronoun of the third person or any other kind, a participle. */
const GENDERED = ['A', 'T', 'P', 'D', 'R', 'I', 'X', 'K', 'C', 'F', 'S', 'ptc'] as const;

/** One class of endings that two or more cases or genders share, so that the form alone never says which is meant. */
export interface SharedEnding {
  /** in words without Greek letters: the note on a demoted word says it */
  name: string;
  /** what the class is and the words it caught, for a reader checking it against the probe */
  comment: string;
  /** the parts of speech it holds for ('ptc' a participle) */
  parts: readonly string[];
  /** each group is the case-number-gender codes written alike; a reading in a group shares its ending with the rest of the group */
  groups: ReadonlyArray<readonly string[]>;
  /** a part that is in the class only when its lemma (an adjective) or its form (a participle) ends so, in bare letters (no marks, σ for ς), and
   * a participle only when its voice is not active (TAGNT's voice letter, the second last of its tense-voice-mood) */
  only?: Readonly<Record<string, { lemmaEnds?: string; formEnds?: string; notActive?: boolean }>>;
}

/** The classes, most specific first; a word in several takes the readings of each and the first one's name. docs/lxx-derivation.md copies this table. */
export const SHARED_ENDINGS: readonly SharedEnding[] = [
  {
    name: 'masculine accusative and neuter in -on',
    comment:
      'A second-declension adjective (lemma in -ος) and a middle or passive participle in -μενον write the masculine accusative as the neuter nominative ' +
      'and accusative: χλωρόν (Gen 1:30, with χόρτον, masculine). A comparative (μεῖζον, masculine μείζονα) and an active participle (masculine -οντα; ' +
      'μένον, John 1:33, only looks like -μενον) do not.',
    parts: ['A', 'ptc'],
    groups: [['ASM', 'NSN', 'ASN']],
    only: { A: { lemmaEnds: 'οσ' }, ptc: { formEnds: 'μενον', notActive: true } },
  },
  {
    name: 'neuter nominative and accusative',
    comment:
      'Every neuter has one form for the nominative and the accusative (the probe named -ον and -α; -ος, -ο and the rest are the same): ξύλον, σπέρμα, τό, ' +
      'αὐτό, ποιοῦν (Gen 1:11, 1:12, nominative given, accusative needed), μένον (John 1:33). Which case it is comes from the sentence, never from the form.',
    parts: ['N', ...GENDERED],
    groups: [
      ['NSN', 'ASN'],
      ['NPN', 'APN'],
    ],
  },
  {
    name: 'masculine and neuter genitive and dative singular',
    comment:
      'αὐτοῦ, αὐτῷ, τοῦ, τῷ, ἁγίου, ἁγίῳ, ποιοῦντος, ἕρποντι: the masculine and the neuter are one form, and only the word it stands for or goes with gives the ' +
      'gender (Gen 1:11-12, αὐτοῦ and αὐτῷ of ξύλον, given masculine; Gen 1:30, ἕρπον[τι of ἑρπετῷ, given masculine). Never a noun, whose gender is its own.',
    parts: GENDERED,
    groups: [
      ['GSM', 'GSN'],
      ['DSM', 'DSN'],
    ],
  },
  {
    name: 'every gender in the genitive plural',
    comment: 'τῶν, αὐτῶν, τούτων, ὧν, τινῶν and an adjective in -ος (ἁγίων) are one form for the three genders (Gen 1:9, αὐτῶν, masculine or neuter).',
    parts: ['T', 'P', 'D', 'R', 'I', 'X', 'K', 'C', 'F', 'S', 'A'],
    groups: [['GPM', 'GPF', 'GPN']],
    only: { A: { lemmaEnds: 'οσ' } },
  },
  {
    name: 'masculine and neuter genitive plural',
    comment: 'Any other adjective and a participle share the genitive plural between masculine and neuter only: πάντων, ποιούντων (the feminine is πασῶν, ποιουσῶν).',
    parts: GENDERED,
    groups: [['GPM', 'GPN']],
  },
  {
    name: 'masculine and neuter dative plural',
    comment: 'τοῖς, αὐτοῖς, ἁγίοις, πᾶσι, ποιοῦσι: the masculine and the neuter dative plural are one form (Gen 1:30, πᾶσι with θηρίοις, neuter).',
    parts: GENDERED,
    groups: [['DPM', 'DPN']],
  },
];

/** The last class is TAGNT's own evidence: the New Testament shows the form as two analyses of one lemma that differ only in case or gender. */
export const TAGNT_EVIDENCE = {
  name: "the New Testament's analyses differ only in case or gender",
  comment:
    'Any form layer 1 settled that TAGNT also gives, for the same lemma, part of speech and number, in another case or gender (ἀόρατος, masculine and ' +
    'feminine): the ending is shared whatever the tables above say. A vocative is not counted: ὁ θεός as an address is the nominative put to that use. ' +
    'An analysis seen in one New Testament word only is taken as a slip of tagging, not evidence: τόν is T-ASM 1,628 times and T-DSF once.',
} as const;

/** TAGNT_EVIDENCE counts another analysis only when this many New Testament words show it. */
export const EVIDENCE_MIN = 2;

function inClass(e: SharedEnding, form: string, lemma: string, morph: string): readonly string[] {
  const part = partOf(morph);
  const cng = cngOf(morph);
  if (!cng || !e.parts.includes(part)) return [];
  const only = e.only?.[part];
  if (only?.lemmaEnds && !bare(lemma).endsWith(only.lemmaEnds)) return [];
  if (only?.formEnds && !bare(form).endsWith(only.formEnds)) return [];
  if (only?.notActive && morph.split('-')[1]?.at(-2) === 'A') return [];
  return e.groups.find((g) => g.includes(cng)) ?? [];
}

/**
 * Whether a settled answer's ending is shared, and with which readings: its class (the first that holds) and every parsing of the same lemma the
 * ending could be, its own among them, in the classes' order. `analyses` are the New Testament's for the form (layer 1's candidates), for TAGNT_EVIDENCE.
 */
export function sharedEnding(
  form: string,
  answer: { lemma: string; morph: string },
  analyses: ReadonlyArray<{ lemma: string; morph: string; support?: number }>,
): { ending: { name: string; comment: string }; shares: string[] } | undefined {
  let ending: { name: string; comment: string } | undefined;
  const shares: string[] = [];
  const add = (m: string): void => {
    if (!shares.includes(m)) shares.push(m);
  };
  for (const e of SHARED_ENDINGS) {
    const group = inClass(e, form, answer.lemma, answer.morph);
    if (group.length === 0) continue;
    ending ??= e;
    for (const cng of group) add(withCng(answer.morph, cng));
  }
  const cng = cngOf(answer.morph);
  if (cng && cng[0] !== 'V') {
    const others = analyses.filter((a) => {
      const c = cngOf(a.morph);
      const seen = (a.support ?? EVIDENCE_MIN) >= EVIDENCE_MIN;
      return seen && a.lemma === answer.lemma && a.morph !== answer.morph && c && c[0] !== 'V' && c[1] === cng[1] && withCng(a.morph, cng) === answer.morph;
    });
    if (others.length) {
      ending ??= TAGNT_EVIDENCE;
      if (shares.length === 0) add(answer.morph);
      for (const a of others) add(a.morph);
    }
  }
  return ending ? { ending, shares } : undefined;
}

// ---------------------------------------------------------------- the agreement links

export interface LinkKind {
  name: string;
  /** whether a settled pair that disagrees is a break; a link that does not only chooses among a pending word's candidates */
  breaks: boolean;
  comment: string;
}

export const LINKS = {
  article: {
    name: 'an article and the word after it',
    breaks: true,
    comment:
      'An article agrees with the next word (past δέ, γάρ, μέν, οὖν, τε, γε, δή) when that word is a noun, an adjective, a possessive, a participle or an ' +
      'infinitive (an article before an infinitive is neuter singular). Not when it is another article (τὸ τοῦ θεοῦ πνεῦμα), a pronoun, or a genitive ' +
      'after an article in another case (τὰ Καίσαρος). Read the other way it is the rule that a neuter noun in -ον or -α takes its case from its article.',
  },
  attributive: {
    name: 'an article, adjective and noun',
    breaks: false,
    comment:
      'An article, an adjective and a noun in a row (τὸ μέγα φῶς): the adjective stands between article and noun, and all three agree. It only chooses, ' +
      'never breaks: the adjective may stand for a noun with another noun after it (ἡ νεωτέρα υἱόν, Gen 19:38; τῇ τρίτῃ ἡμέρα γενέσεως, Gen 40:20).',
  },
  repeated: {
    name: 'a noun, then an article and adjective or participle',
    breaks: false,
    comment:
      'A noun, then an article with an adjective or participle (τῷ ἑρπετῷ τῷ ἕρποντι): the article repeats the noun’s gender, number and case. It only ' +
      'chooses, never breaks: the article may begin a phrase of its own (ἐκάλεσεν ὁ θεὸς τὸ ξηρὸν γῆν).',
  },
  beside: {
    name: 'an adjective or participle beside a noun',
    breaks: false,
    comment:
      'An adjective or participle next to a settled noun (πάντα χόρτον χλωρόν, Gen 1:30): where exactly one of its candidates agrees with the noun it is ' +
      'taken. It only chooses, never breaks: ποιοῦν καρπόν (Gen 1:11) is a participle and its object.',
  },
} as const satisfies Record<string, LinkKind>;

/** The words an article reads past to its own word: they stand second in their clause. */
export const POSTPOSITIVES: ReadonlySet<string> = new Set(['δέ', 'γάρ', 'μέν', 'οὖν', 'τε', 'γε', 'δή']);

/** What a word is in a link: the article, the article's word (declined or an infinitive), an adjective, an adjective or participle, a noun. */
type Role = 'article' | 'word' | 'adjective' | 'modifier' | 'noun';
const ROLE_PARTS: Readonly<Record<Role, readonly string[]>> = {
  article: ['T'],
  word: ['N', 'A', 'S', 'ptc', 'inf'],
  adjective: ['A'],
  modifier: ['A', 'ptc'],
  noun: ['N'],
};

type Reading = Analysis | WordCandidate;

/** One word of a verse as the check sees it. */
export interface AgreementWord {
  ref: string;
  verse: string;
  out: Out;
  /** a word the check must not settle (a name for the model, a break): set by the check */
  held?: boolean;
  /** the text puts a mark of punctuation after the word: no link reaches past it */
  pause?: boolean;
}

/** A comma, a colon or high point, a full stop, a question mark: what ends a word's links (brackets, Swete's supplied letters, are read past). */
const PAUSE = /[,.;:!?\u00B7\u0387\u037E][\])]*$/;
/** Whether Swete's token, as he prints it, ends with a mark of punctuation (τῇ ἐρήμῳ, χεῖρα: no link from ἐρήμῳ to χεῖρα). */
export const pauseAfter = (display: string): boolean => PAUSE.test(display.normalize('NFC').trim());

const readingsOf = (w: AgreementWord): Reading[] =>
  isSettled(w.out) ? [{ lemma: w.out.lemma, morph: w.out.morph, support: 1, share: 1 }] : w.out.candidates;
const inRole = (r: Reading, role: Role): boolean => ROLE_PARTS[role].includes(partOf(r.morph)) && (partOf(r.morph) === 'inf' || Boolean(cngOf(r.morph)));
const roleReadings = (w: AgreementWord, role: Role): Reading[] => readingsOf(w).filter((r) => inRole(r, role));

/** A word plays a role when its settled answer is of it, or when its candidates of it hold at least half their support (by count where none has any). */
function plays(w: AgreementWord, role: Role): boolean {
  const all = readingsOf(w);
  const mine = all.filter((r) => inRole(r, role));
  if (mine.length === 0) return false;
  const weight = (rs: Reading[]): number => rs.reduce((s, r) => s + r.support, 0);
  const total = weight(all);
  return total > 0 ? 2 * weight(mine) >= total : 2 * mine.length >= all.length;
}

const genitiveOnly = (w: AgreementWord, role: Role): boolean => roleReadings(w, role).every((r) => cngOf(r.morph)?.[0] === 'G');
const anyGenitive = (w: AgreementWord, role: Role): boolean => roleReadings(w, role).some((r) => cngOf(r.morph)?.[0] === 'G');

/** Two readings agree: the same case, number and gender; an article and an infinitive when the article is neuter singular. */
function agrees(a: Reading, b: Reading): boolean {
  const ca = cngOf(a.morph);
  const cb = cngOf(b.morph);
  if (ca && cb) return ca === cb;
  if (partOf(a.morph) === 'inf' && partOf(b.morph) === 'T') return Boolean(cb?.endsWith('SN'));
  if (partOf(b.morph) === 'inf' && partOf(a.morph) === 'T') return Boolean(ca?.endsWith('SN'));
  return false;
}

interface Link {
  kind: LinkKind;
  /** the two words, by their place in the verse, and the role each plays */
  a: number;
  ra: Role;
  b: number;
  rb: Role;
}

/**
 * The links of one verse's words, in the text's order; none reaches past a mark of punctuation. A link that only chooses runs from its first word (the
 * settled noun, or for an article, adjective and noun the noun) to its second.
 */
function linksOf(v: readonly AgreementWord[]): Link[] {
  const links: Link[] = [];
  const isPostpositive = (w: AgreementWord): boolean => isSettled(w.out) && POSTPOSITIVES.has(w.out.lemma);
  for (let i = 0; i < v.length; i++) {
    if (!plays(v[i], 'article') || v[i].pause) continue;
    let j = i + 1;
    while (j < v.length && isPostpositive(v[j]) && !v[j].pause) j++;
    if (j >= v.length || isPostpositive(v[j]) || plays(v[j], 'article') || !plays(v[j], 'word')) continue;
    if (genitiveOnly(v[j], 'word') && !anyGenitive(v[i], 'article')) continue;
    links.push({ kind: LINKS.article, a: i, ra: 'article', b: j, rb: 'word' });
    const k = j + 1;
    if (!v[j].pause && plays(v[j], 'adjective') && k < v.length && plays(v[k], 'noun') && !(genitiveOnly(v[k], 'noun') && !anyGenitive(v[j], 'adjective'))) {
      links.push({ kind: LINKS.attributive, a: k, ra: 'noun', b: j, rb: 'adjective' }, { kind: LINKS.attributive, a: k, ra: 'noun', b: i, rb: 'article' });
    }
    if (i > 0 && j === i + 1 && !v[i - 1].pause && plays(v[i - 1], 'noun') && plays(v[j], 'modifier')) {
      links.push({ kind: LINKS.repeated, a: i - 1, ra: 'noun', b: i, rb: 'article' }, { kind: LINKS.repeated, a: i - 1, ra: 'noun', b: j, rb: 'modifier' });
    }
  }
  for (let w = 0; w < v.length; w++) {
    if (!plays(v[w], 'modifier') || plays(v[w], 'noun')) continue;
    if (w > 0 && !v[w - 1].pause && plays(v[w - 1], 'noun')) links.push({ kind: LINKS.beside, a: w - 1, ra: 'noun', b: w, rb: 'modifier' });
    if (w + 1 < v.length && !v[w].pause && plays(v[w + 1], 'noun')) links.push({ kind: LINKS.beside, a: w + 1, ra: 'noun', b: w, rb: 'modifier' });
  }
  return links;
}

const settledIn = (w: AgreementWord): w is AgreementWord & { out: DerivedWord } => isSettled(w.out) && !w.held;
const dedupe = (rs: readonly Reading[]): Reading[] => [...new Map(rs.map((r) => [`${r.lemma}|${r.morph}`, r])).values()];

export interface AgreementOutcome {
  outs: Out[];
  /** words settled by agreement (layer 2a) */
  settled: number;
  /** pairs of settled words that broke agreement */
  breaks: number;
  /** words sent pending by a break */
  brokenWords: number;
}

/**
 * The agreement check over words in the text's order (any number of verses): first the breaks among settled words, then, in the text's order and until
 * nothing changes, each pending word not held whose candidates leave exactly one agreeing with every settled neighbour it is linked to (a link that only
 * chooses narrows what the others leave, and is set aside where it would leave nothing). A word settled so is at once a settled neighbour of the words
 * after it.
 */
export function agree(words: readonly AgreementWord[]): AgreementOutcome {
  const items = words.map((w) => ({ ...w }));
  const verses = new Map<string, typeof items>();
  for (const w of items) {
    let v = verses.get(w.verse);
    if (!v) verses.set(w.verse, (v = []));
    v.push(w);
  }
  let breaks = 0;
  let brokenWords = 0;
  let settled = 0;
  const perVerse = [...verses.values()].map((v) => ({ v, links: linksOf(v) }));
  for (const { v, links } of perVerse) {
    const broken = new Map<number, string[]>();
    for (const l of links) {
      if (!l.kind.breaks || !settledIn(v[l.a]) || !settledIn(v[l.b])) continue;
      if (agrees(readingsOf(v[l.a])[0], readingsOf(v[l.b])[0])) continue;
      breaks++;
      for (const [x, y] of [
        [l.a, l.b],
        [l.b, l.a],
      ]) {
        const notes = broken.get(x) ?? [];
        notes.push(`agreement break: ${l.kind.name} with ${v[y].ref}: for the model`);
        broken.set(x, notes);
      }
    }
    for (const [x, notes] of broken) {
      v[x].out = { ref: v[x].ref, candidates: v[x].out.candidates, notes: [...v[x].out.notes, ...new Set(notes)] };
      v[x].held = true;
      brokenWords++;
    }
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const { v, links } of perVerse) {
      v.forEach((w, x) => {
        if (isSettled(w.out) || w.held) return;
        let required: Reading[] | undefined;
        let narrowing: Reading[] | undefined;
        const requiredNotes: string[] = [];
        const narrowingNotes: string[] = [];
        for (const l of links) {
          const [role, p] = l.b === x ? [l.rb, l.a] : l.a === x && l.kind.breaks ? [l.ra, l.b] : [undefined, -1];
          if (!role || !settledIn(v[p])) continue;
          const partner = readingsOf(v[p])[0];
          const fit = roleReadings(w, role).filter((r) => agrees(r, partner));
          const keep = (rs: Reading[] | undefined): Reading[] => (rs ? rs.filter((r) => fit.includes(r)) : fit);
          const note = `agreement: ${l.kind.name} with ${v[p].ref}`;
          if (l.kind.breaks) {
            required = keep(required);
            requiredNotes.push(note);
          } else {
            narrowing = keep(narrowing);
            narrowingNotes.push(note);
          }
        }
        let left: Reading[];
        let notes: string[];
        if (required && narrowing && required.some((r) => narrowing.includes(r))) {
          left = required.filter((r) => narrowing.includes(r));
          notes = [...requiredNotes, ...narrowingNotes];
        } else if (required) {
          [left, notes] = [required, requiredNotes];
        } else if (narrowing) {
          [left, notes] = [narrowing, narrowingNotes];
        } else return;
        left = dedupe(left);
        if (left.length !== 1) return;
        // settled at once, so a later word of the verse is held to it on this round
        const [reading] = left;
        const same = (c: Reading): boolean => c.lemma === reading.lemma && c.morph === reading.morph;
        w.out = {
          ref: w.ref,
          lemma: reading.lemma,
          morph: reading.morph,
          layer: AGREEMENT_LAYER,
          confidence: AGREEMENT_CONFIDENCE,
          candidates: [reading as WordCandidate, ...w.out.candidates.filter((c) => !same(c))],
          notes: [...w.out.notes, ...new Set(notes)],
        };
        settled++;
        changed = true;
      });
    }
  }
  return { outs: items.map((w) => w.out), settled, breaks, brokenWords };
}

// ---------------------------------------------------------------- the whole check

export interface CheckContext {
  /** keyOf of every form the New Testament has only as a proper name (FormIndex.names) */
  names: ReadonlySet<string>;
  /** the parser's candidates for a form (layer 2's, cached by the caller) */
  parse: (form: string) => Candidate[];
}

export interface AgreementStats {
  /** pending after layers 1 and 2, before the check */
  pendingBefore: number;
  /** settled words sent to the model as a name written in lower case */
  names: number;
  /** settled words demoted by the shared-ending rule */
  demoted: number;
  /** of those, settled again by agreement */
  demotedSettled: number;
  /** words settled by agreement, layer 2a */
  settled: number;
  breaks: number;
  brokenWords: number;
}

const isLowerCase = (form: string): boolean => {
  const first = [...form.normalize('NFC')][0] ?? '';
  return first !== first.toUpperCase();
};

/** A candidate list with more added after it, each lemma and parsing once (the first kept). */
function mergeCandidates(first: readonly WordCandidate[], ...more: ReadonlyArray<readonly WordCandidate[]>): WordCandidate[] {
  const out = [...first];
  const seen = new Set(first.map((c) => `${c.lemma}|${c.morph}`));
  for (const c of more.flat()) {
    const k = `${c.lemma}|${c.morph}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/**
 * The check on one book's words (in the text's order) and what layers 1 and 2 made of each: the name rule, the shared-ending rule, then `agree`.
 * A demoted word's candidates are its own (layer 1's analyses or layer 2's) and the ending's other readings; not the parser's for a form the New
 * Testament has, whose rules, learned from other lemmas, offer tagged and stray readings (ἁγίῳ as A-DSN-LG and A-DSF) that only blur the choice. A name
 * written in lower case does take the parser's, since the word it is may be another lemma (χλόης, grass).
 * Returns each word's answer after the check, in the same order, and its counts.
 */
export function checkAgreement(words: ReadonlyArray<{ ref: string; verse: string; form: string; display: string }>, outs: readonly Out[], ctx: CheckContext): { outs: Out[]; stats: AgreementStats } {
  const stats: AgreementStats = { pendingBefore: outs.filter((o) => !isSettled(o)).length, names: 0, demoted: 0, demotedSettled: 0, settled: 0, breaks: 0, brokenWords: 0 };
  const demoted = new Set<string>();
  const items: AgreementWord[] = words.map((word, i) => {
    const out = outs[i];
    const item: AgreementWord = { ref: word.ref, verse: word.verse, out, pause: pauseAfter(word.display) };
    if (!isSettled(out)) {
      if (ctx.names.has(keyOf(word.form)) && isLowerCase(word.form)) {
        item.out = { ...out, notes: [...out.notes, NOTE_NAME] };
        item.held = true;
      }
      return item;
    }
    if (out.layer === 1 && ctx.names.has(keyOf(word.form)) && isLowerCase(word.form)) {
      stats.names++;
      item.out = { ref: out.ref, candidates: mergeCandidates(out.candidates, ctx.parse(word.form)), notes: [...out.notes, NOTE_NAME] };
      item.held = true;
      return item;
    }
    const shared = sharedEnding(word.form, out, out.layer === 1 ? out.candidates : []);
    if (!shared) return item;
    stats.demoted++;
    demoted.add(out.ref);
    const via = [`shared ending: ${shared.ending.name}`];
    const siblings = shared.shares.map((morph) => ({ lemma: out.lemma, morph, support: 0, share: 0, via }));
    item.out = {
      ref: out.ref,
      candidates: mergeCandidates(out.candidates, siblings),
      notes: [...out.notes, `shared ending: ${shared.ending.name}: for the agreement check or the model`],
    };
    return item;
  });
  const outcome = agree(items);
  stats.settled = outcome.settled;
  stats.breaks = outcome.breaks;
  stats.brokenWords = outcome.brokenWords;
  stats.demotedSettled = outcome.outs.filter((o) => isSettled(o) && demoted.has(o.ref)).length;
  return { outs: outcome.outs, stats };
}
