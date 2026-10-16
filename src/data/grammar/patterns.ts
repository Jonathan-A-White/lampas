// src/data/grammar/patterns.ts — the pattern ideas a word uses (mw-svw421.1, docs/grammar.md 'Patterns'): how a form is built, read off its
// dictionary form (the lemma) and its RP parsing code. Pure: no ladder, no store. ladder.ts ideasOfWord adds these to the ideas its code names;
// the ids are ladder ids (PROVISIONAL, not renamed once shipped). 'dictionary-entry' and 'principal-parts' are about how a dictionary lists a word,
// not about a form, so no word uses them.

const bare = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The ids of the pattern ideas patternsOf can name, in the ladder's order. */
export const PATTERN_IDEAS = ['stem-and-ending', 'declension-1', 'declension-2', 'declension-3', 'augment', 'tense-signs', 'reduplication', 'contract-verbs', 'mi-verbs', 'eimi', 'oida'] as const;
export type PatternIdea = (typeof PATTERN_IDEAS)[number];

const VERB_CODE = /^V-(2?)([PIFARL])([AMPEDONQX])([IMSONPR])(?:-|$)/;

/** The gender letter of a noun or adjective code ('N-GSF' is 'F'), or '' when it has none. */
const genderOf = (code: string): string => /^[NA]-[NGDAV][SP]([MFN])?/.exec(code)?.[1] ?? '';

/** Which declension a noun or an adjective is, from the lemma's ending and the word's gender. First: feminine in -η, -α or -αι, masculine in -ης or -ας
 * (and the feminine of an adjective in -ος, and of a three-ending adjective in -ς: πᾶς, μέγας, πολύς, οὐδείς, εὐθύς, διπλοῦς); second: -ος and -ον (an
 * adjective's masculine and neuter); the rest, and any neuter in -ος, -α or -ας, third, as is a comparative in -ων and a two-ending adjective in -ης or -ων. */
function declensionOf(code: string, lemma: string, form?: string): PatternIdea | undefined {
  const head = code.split('-');
  if (!['N', 'A'].includes(head[0]) || ['LI', 'OI', 'PRI', 'NUI'].includes(head[1])) return undefined;
  const gender = genderOf(code);
  // a name with two dictionary forms ('Ἰωάννα, Ἰωανάν') is read by the first
  const ending = bare(lemma.split(',')[0]);
  const ends = (...suffixes: string[]): boolean => suffixes.some((s) => ending.endsWith(s));
  if (head[0] === 'A') {
    // a two-ending adjective (αἰώνιος) has the feminine in -ος and -ον, a plural-only one (χίλιοι) is read like -ος: the form, when it is known, says which
    if (ends('ος', 'οι')) return gender === 'F' && !(form && /(ος|ον|ου|ῳ|οις|ους|οι)$/.test(bare(form))) ? 'declension-1' : 'declension-2';
    // an adjective that is only ever feminine (δεκάτη, ὀψία)
    if (ends('η', 'α')) return 'declension-1';
    // a comparative in -ων is third whatever the positive was (μέγας, μείζων)
    if (/^[NA]-[NGDAV][SP][MFN]?-C/.test(code)) return 'declension-3';
    // a three-ending adjective: the masculine and neuter are third (πᾶς, πάντα) or contracted second (διπλοῦς), the feminine is first (πᾶσα, μιᾶς, οὐδεμία)
    if (ends('ους')) return gender === 'F' ? 'declension-1' : 'declension-2';
    if (ends('υς', 'ας', 'εις')) return gender === 'F' ? 'declension-1' : 'declension-3';
    return 'declension-3';
  }
  if (gender === 'F' && ends('η', 'α', 'αι')) return 'declension-1';
  if (gender === 'M' && ends('ης', 'ας')) return 'declension-1';
  if (gender !== 'N' && ends('ος')) return 'declension-2';
  if (gender === 'N' && ends('ον')) return 'declension-2';
  return 'declension-3';
}

/**
 * The pattern ideas a word of the text uses, from its lemma `l` and its RP parsing code `p`, in the ladder's order. Throws on nothing: a code it
 * does not read gives none. A noun, an adjective or a verb is a stem and an ending (a pronoun, the article and the little words are learnt whole,
 * as forms); 'ὅ' and 'καί' use no pattern.
 */
export function patternsOf(word: { l: string; p: string; t?: string }): PatternIdea[] {
  const lemma = word.l.normalize('NFC');
  const code = word.p;
  const out = new Set<PatternIdea>();
  const verb = VERB_CODE.exec(code);
  const inflected = verb !== null || (/^[NA]-/.test(code) && declensionOf(code, lemma, word.t) !== undefined);
  if (inflected) out.add('stem-and-ending');
  const declension = declensionOf(code, lemma, word.t);
  if (declension) out.add(declension);
  if (verb) {
    const [, second, tense, voice, mood] = verb;
    const stem = bare(lemma);
    const isEimi = stem === 'ειμι';
    // οἶδα is the perfect of εἴδω in form and "I know" in sense: its perfect and its past (ᾔδειν) are not a first perfect, and it has no reduplication
    const isOida = (stem === 'ειδω' || stem === 'οιδα') && (tense === 'R' || tense === 'L');
    if (mood === 'I' && ['I', 'A', 'L'].includes(tense)) out.add('augment');
    if (!isEimi && !isOida) {
      if (tense === 'F' || (tense === 'A' && second === '') || (tense === 'R' && second === '' && voice === 'A')) out.add('tense-signs');
      if (tense === 'R' || tense === 'L') out.add('reduplication');
    }
    if (/(αω|εω|οω)$/.test(stem)) out.add('contract-verbs');
    if (stem.endsWith('μι') && !isEimi) out.add('mi-verbs');
    if (isEimi) out.add('eimi');
    if (isOida) out.add('oida');
  }
  return PATTERN_IDEAS.filter((id) => out.has(id));
}
