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
