// Robinson's RP (Robinson-Pierpont) parsing codes in plain words: 'V-PAP-DPM' is
// 'verb, present active participle, dative plural masculine'. A code this does not know throws, so a
// new source release that adds one fails the data build instead of shipping a guess.

const WORDS: Record<string, string> = {
  PREP: 'preposition',
  CONJ: 'conjunction',
  PRT: 'particle',
  ADV: 'adverb',
  COND: 'conditional',
  INJ: 'interjection',
  ARAM: 'Aramaic word',
  HEB: 'Hebrew word',
};

const PRONOUNS: Record<string, string> = {
  P: 'personal pronoun',
  R: 'relative pronoun',
  C: 'reciprocal pronoun',
  D: 'demonstrative pronoun',
  K: 'correlative pronoun',
  I: 'interrogative pronoun',
  X: 'indefinite pronoun',
  Q: 'correlative or interrogative pronoun',
  F: 'reflexive pronoun',
  S: 'possessive pronoun',
};

const SUFFIXES: Record<string, string> = {
  ATT: 'Attic form',
  C: 'comparative',
  S: 'superlative',
  N: 'negative',
  I: 'interrogative',
  K: 'crasis',
  M: 'middle significance',
  P: 'poetic',
};

const CASES: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const NUMBERS: Record<string, string> = { S: 'singular', P: 'plural' };
const GENDERS: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };
const PERSONS: Record<string, string> = { '1': '1st person', '2': '2nd person', '3': '3rd person' };

const TENSES: Record<string, string> = {
  P: 'present',
  I: 'imperfect',
  F: 'future',
  A: 'aorist',
  R: 'perfect',
  L: 'pluperfect',
};
const VOICES: Record<string, string> = {
  A: 'active',
  M: 'middle',
  P: 'passive',
  E: 'middle or passive',
  D: 'middle deponent',
  O: 'passive deponent',
  N: 'middle or passive deponent',
  Q: 'impersonal active',
  X: 'no voice',
};
const MOODS: Record<string, string> = {
  I: 'indicative',
  M: 'imperative',
  S: 'subjunctive',
  O: 'optative',
  N: 'infinitive',
  P: 'participle',
  R: 'imperative-sense participle',
};

const bad = (code: string): never => {
  throw new Error(`Unknown parsing code: ${JSON.stringify(code)}`);
};

// Case, number and (when the code has one) gender: 'DPM' -> 'dative plural masculine'.
function caseNumberGender(code: string, text: string): string {
  const m = /^([NGDAV])([SP])([MFN])?$/.exec(text);
  if (!m) return bad(code);
  return [CASES[m[1]], NUMBERS[m[2]], m[3] ? GENDERS[m[3]] : ''].filter(Boolean).join(' ');
}

function verb(code: string, parts: string[]): string {
  const m = /^(2?)([PIFARL])([AMPEDONQX])([IMSONPR])$/.exec(parts[1] ?? '');
  if (!m) return bad(code);
  const [, second, tense, voice, mood] = m;
  const out = ['verb', `${second ? 'second ' : ''}${TENSES[tense]} ${VOICES[voice]} ${MOODS[mood]}`];
  let next = 2;
  if (mood === 'P' || mood === 'R') {
    out.push(caseNumberGender(code, parts[next++] ?? ''));
  } else if (mood !== 'N') {
    const pn = /^([123])([SP])$/.exec(parts[next++] ?? '');
    if (!pn) return bad(code);
    out.push(`${PERSONS[pn[1]]} ${NUMBERS[pn[2]]}`);
  }
  return [...out, ...suffixes(code, parts.slice(next))].join(', ');
}

function suffixes(code: string, rest: string[]): string[] {
  return rest.map((s) => SUFFIXES[s] ?? bad(code));
}

function pronoun(code: string, kind: string, parts: string[]): string {
  const label = PRONOUNS[kind];
  const form = parts[1] ?? '';
  let detail: string;
  if (kind === 'S') {
    // possessor's person and number, then the case, number and gender of the thing possessed
    const m = /^([123])([SP])(.+)$/.exec(form);
    if (!m) return bad(code);
    detail = `${PERSONS[m[1]]} ${NUMBERS[m[2]]} possessor, ${caseNumberGender(code, m[3])}`;
  } else if (kind === 'P' || kind === 'F') {
    const m = /^([123])(.+)$/.exec(form);
    detail = m ? `${PERSONS[m[1]]} ${caseNumberGender(code, m[2])}` : caseNumberGender(code, form);
  } else {
    detail = caseNumberGender(code, form);
  }
  return [label, detail, ...suffixes(code, parts.slice(2))].join(', ');
}

export function decodeParse(code: string): string {
  const parts = code.split('-');
  const head = parts[0];
  if (WORDS[head]) {
    return [WORDS[head], ...suffixes(code, parts.slice(1))].join(', ');
  }
  switch (head) {
    case 'V':
      return verb(code, parts);
    case 'N': {
      const special: Record<string, string> = { LI: 'letter, indeclinable', OI: 'indeclinable', PRI: 'proper name, indeclinable' };
      if (special[parts[1]]) return `noun, ${special[parts[1]]}`;
      return ['noun', caseNumberGender(code, parts[1] ?? ''), ...suffixes(code, parts.slice(2))].join(', ');
    }
    case 'A':
      if (parts[1] === 'NUI') return 'adjective, numeral, indeclinable';
      return ['adjective', caseNumberGender(code, parts[1] ?? ''), ...suffixes(code, parts.slice(2))].join(', ');
    case 'T':
      return ['article', caseNumberGender(code, parts[1] ?? ''), ...suffixes(code, parts.slice(2))].join(', ');
    default:
      if (PRONOUNS[head]) return pronoun(code, head, parts);
      return bad(code);
  }
}

// ---- The same codes as features, for the Parsing drill (mw-5r3p30.31) ----
// decodeParse above writes a code as one sentence; splitParse names each thing the code says, so a drill can ask
// them one at a time. tests/unit/drill.test.ts holds the two in agreement over every code of the New Testament.

export type ParseFeatureId = 'tense' | 'voice' | 'mood' | 'person' | 'case' | 'number' | 'gender';

/** One thing a code says: 'tense' is 'present'. `choices` are the values a drill offers for it (always including `value`). */
export interface ParseFeature {
  id: ParseFeatureId;
  value: string;
  choices: string[];
}

export interface SplitParse {
  /** 'verb', 'noun', 'adjective', 'article', 'pronoun' (of any kind), 'preposition' ... */
  pos: string;
  /** In the order a drill asks them; none for a word that is only its part of speech. */
  features: ParseFeature[];
}

/** The parts of speech a drill offers (a code's own, when it is another such as 'conditional', is added to them). */
export const PARTS_OF_SPEECH = ['verb', 'noun', 'adjective', 'article', 'pronoun', 'preposition', 'conjunction', 'particle', 'adverb'];

const valuesOf = (table: Record<string, string>, keys: string): string[] => [...keys].map((k) => table[k]);
const CHOICES: Record<ParseFeatureId, string[]> = {
  tense: valuesOf(TENSES, 'PIFARL'),
  // The rarer voices and moods are offered only when the code has one of them.
  voice: valuesOf(VOICES, 'AMPE'),
  mood: valuesOf(MOODS, 'IMSONP'),
  person: valuesOf(PERSONS, '123'),
  case: valuesOf(CASES, 'NGDAV'),
  number: valuesOf(NUMBERS, 'SP'),
  gender: valuesOf(GENDERS, 'MFN'),
};

function feature(id: ParseFeatureId, value: string): ParseFeature {
  const choices = CHOICES[id];
  return { id, value, choices: choices.includes(value) ? choices : [...choices, value] };
}

function nominalFeatures(code: string, text: string): ParseFeature[] {
  const m = /^([NGDAV])([SP])([MFN])?$/.exec(text);
  if (!m) return bad(code);
  return [feature('case', CASES[m[1]]), feature('number', NUMBERS[m[2]]), ...(m[3] ? [feature('gender', GENDERS[m[3]])] : [])];
}

function verbFeatures(code: string, parts: string[]): ParseFeature[] {
  const m = /^(2?)([PIFARL])([AMPEDONQX])([IMSONPR])$/.exec(parts[1] ?? '');
  if (!m) return bad(code);
  const [, , tense, voice, mood] = m;
  const out = [feature('tense', TENSES[tense]), feature('voice', VOICES[voice]), feature('mood', MOODS[mood])];
  let next = 2;
  if (mood === 'P' || mood === 'R') {
    out.push(...nominalFeatures(code, parts[next++] ?? ''));
  } else if (mood !== 'N') {
    const pn = /^([123])([SP])$/.exec(parts[next++] ?? '');
    if (!pn) return bad(code);
    out.push(feature('person', PERSONS[pn[1]]), feature('number', NUMBERS[pn[2]]));
  }
  suffixes(code, parts.slice(next));
  return out;
}

function pronounFeatures(code: string, kind: string, parts: string[]): ParseFeature[] {
  const form = parts[1] ?? '';
  suffixes(code, parts.slice(2));
  if (kind === 'S') {
    // the possessor's person and number are left to the full parsing; the drill asks the thing possessed
    const m = /^([123])([SP])(.+)$/.exec(form);
    if (!m) return bad(code);
    return nominalFeatures(code, m[3]);
  }
  const m = kind === 'P' || kind === 'F' ? /^([123])(.+)$/.exec(form) : null;
  if (!m) return nominalFeatures(code, form);
  const [caseFeature, ...rest] = nominalFeatures(code, m[2]);
  return [caseFeature, feature('person', PERSONS[m[1]]), ...rest];
}

export function splitParse(code: string): SplitParse {
  const parts = code.split('-');
  const head = parts[0];
  if (WORDS[head]) {
    suffixes(code, parts.slice(1));
    return { pos: WORDS[head], features: [] };
  }
  switch (head) {
    case 'V':
      return { pos: 'verb', features: verbFeatures(code, parts) };
    case 'N': {
      if (['LI', 'OI', 'PRI'].includes(parts[1])) return { pos: 'noun', features: [] };
      suffixes(code, parts.slice(2));
      return { pos: 'noun', features: nominalFeatures(code, parts[1] ?? '') };
    }
    case 'A':
      if (parts[1] === 'NUI') return { pos: 'adjective', features: [] };
      suffixes(code, parts.slice(2));
      return { pos: 'adjective', features: nominalFeatures(code, parts[1] ?? '') };
    case 'T':
      suffixes(code, parts.slice(2));
      return { pos: 'article', features: nominalFeatures(code, parts[1] ?? '') };
    default:
      if (PRONOUNS[head]) return { pos: 'pronoun', features: pronounFeatures(code, head, parts) };
      return bad(code);
  }
}
