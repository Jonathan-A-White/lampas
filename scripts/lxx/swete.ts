// scripts/lxx/swete.ts — Swete's Greek as tokens, and the Greek normalisation the look-up uses (docs/lxx-derivation.md, 'Swete's tokens').
// The pinned files are two tab-separated lists: 00-Swete_versification.csv gives each verse the line number of its first token ('1\tGen.1:1'),
// 01-Swete_word_with_punctuations.csv gives each line one token ('3\tἐποίησεν'). A token's reference is its verse and its number among the verse's
// words, 'Gen.1:20#13'. The editor's signs (⸆, ⸂⸆⸃) are tokens of their own in the file: they are not words, are not numbered and are counted apart.
// Brackets mark letters Swete supplied ('πληθυ]νέσθωσαν'): stripped for look-up, kept in the display text.

const GRAVE = '\u0300';
const ACUTE = '\u0301';
const CIRC = '\u0342';
/** The koronis and the apostrophes: an elided vowel. */
const ELISION = /[\u1FBD\u2019\u02BC'\u1FBF\u2018]/g;
/** Punctuation, brackets and the editor's signs (U+2E00-2E7F): never part of a look-up. */
export const PUNCT = /[.,;:!?()[\]{}"\u00B7\u0387\u037E\u201C\u201D\u00AB\u00BB\u2014\u2013\-\u2E00-\u2E7F\u00B6\u00A7*+\u2020\u2021]/g;

/** How many accents a word carries, its grave read as acute: two is a word with an enclitic after it (ἐξέθρεψέν με, Κέχρικά σε). */
const accentsOf = (nfd: string): number => [...nfd].filter((c) => c === ACUTE || c === CIRC).length;

/** The look-up key: no punctuation or brackets, lower case, grave as acute, an enclitic's second accent dropped (ἐξέθρεψέν -> ἐξέθρεψεν), elision as ’, NFC. */
export function keyOf(word: string): string {
  let d = word.replace(PUNCT, '').replace(ELISION, '\u2019').normalize('NFD').toLowerCase().replaceAll(GRAVE, ACUTE);
  const accents = accentsOf(d);
  if (accents >= 2) {
    const i = Math.max(d.lastIndexOf(ACUTE), d.lastIndexOf(CIRC));
    d = d.slice(0, i) + d.slice(i + 1);
  }
  return d.normalize('NFC');
}

/** No marks at all, lower case, final sigma as sigma: how a word in capitals with no accents (ΑΡΧΗ) is matched. */
export function bareOf(word: string): string {
  return word
    .replace(PUNCT, '')
    .replace(ELISION, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replaceAll('ς', 'σ');
}

export const hasAccent = (word: string): boolean => /[\u0300\u0301\u0342]/.test(word.normalize('NFD'));
/** Whether the word carries two accents, the second an enclitic's (Κέχρικά σε, 2 Kings 9:3): a Greek word, never a name's spelling. */
export const hasTwoAccents = (word: string): boolean => accentsOf(word.replace(PUNCT, '').normalize('NFD').replaceAll(GRAVE, ACUTE)) >= 2;
export const hasLower = (word: string): boolean => word !== word.toUpperCase();

/**
 * Other spellings of a form that Swete's manuscript may write differently from the New Testament, tried in turn when the form itself is not found:
 * ει written ι (ἴδεν for εἶδεν), ι written ει (Δαυείδ for Δαυίδ), the movable ν added (πᾶσι for πᾶσιν) or dropped. Each is [why, form].
 * The movable ν is only tried after -σι, -ξι, -ψι and -ε, where Greek has it: the probe also tried it after any -ι or -ε (φαίνειν as φαίνει,
 * Κάιν as καί), which was safe there only because its parser ran first and analysed such forms (docs/lxx-derivation.md, 'What the move changed').
 */
export function spellings(form: string): Array<[string, string]> {
  const d = form.normalize('NFD');
  const out: Array<[string, string]> = [];
  if (/ε[\u0301\u0342]?ι/.test(d)) out.push(['ει read as ι', d.replace(/ε([\u0301\u0342]?)ι/g, 'ι$1').normalize('NFC')]);
  if (/ι/.test(d) && !/ει/.test(d)) out.push(['ι read as ει', d.replace(/(^|[^ε])ι/, '$1ει').normalize('NFC')]);
  if (/([σξψ]ι|ε)[\u0300-\u036F]*$/.test(d)) out.push(['movable ν added', `${form}ν`]);
  if (/([σξψ]ι|ε)[\u0300-\u036F]*ν$/.test(d)) out.push(['movable ν dropped', form.slice(0, -1)]);
  return out;
}

/**
 * A verse number the editor prints in the Greek of the additions (`[1]`, `⸂[1]`: Esther's, Daniel's, Proverbs' and others, 257 tokens in Swete's file): his own numbering of the
 * verse's parts, not a word of the Septuagint. It is an editor's sign, left out of the words and counted with the signs (story mw-u2w5klk.20), where it was a word with no
 * candidate that no lexicon could have (106 of Esther's 181). A Greek numeral (`ε᾽`) is a word, and has no brackets and no digits.
 */
export const VERSE_NUMBER = /^[\u2E00-\u2E7F]*\[\d+\]$/;

export interface SweteWord {
  /** 'Gen.1:20#13': the verse and the word's number in it, counting words and not the editor's signs */
  ref: string;
  verse: string;
  /** the line of 01-Swete_word_with_punctuations.csv that holds it */
  line: number;
  /** the token as Swete has it, brackets and punctuation kept: for display, never written to Lampas's files */
  display: string;
  /** the token with punctuation and brackets stripped: what is looked up */
  form: string;
}

export interface EditorSign {
  verse: string;
  line: number;
  sign: string;
}

export interface SweteTokens {
  words: SweteWord[];
  signs: EditorSign[];
}

/** The book of a reference ('Gen.1:1' -> 'Gen'). */
export const bookOf = (ref: string): string => ref.split('.')[0];

/** Lines of 'number\ttext', keyed by their number (so a slice of a file reads as the file does). */
function numbered(text: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const n = Number(line.slice(0, tab));
    if (Number.isInteger(n) && n > 0) out.set(n, line.slice(tab + 1).trim());
  }
  return out;
}

/**
 * Swete's tokens: the words, each with its reference, and the editor's signs, counted apart. With `book` ('gen', any case) only that book's
 * verses are read. A verse runs from its first line to the line before the next verse's first line.
 */
export function sweteTokens(versification: string, wordFile: string, book?: string): SweteTokens {
  const starts = [...numbered(versification)].map(([n, ref]) => ({ n, ref })).sort((a, b) => a.n - b.n);
  const lines = numbered(wordFile);
  let last = 0;
  for (const n of lines.keys()) last = Math.max(last, n);
  const want = book?.toLowerCase();
  const words: SweteWord[] = [];
  const signs: EditorSign[] = [];
  starts.forEach((start, i) => {
    if (want && bookOf(start.ref).toLowerCase() !== want) return;
    const end = i + 1 < starts.length ? starts[i + 1].n : last + 1;
    let j = 0;
    for (let n = start.n; n < end; n++) {
      const raw = lines.get(n);
      if (!raw) continue;
      const form = raw.replace(PUNCT, '');
      if (!form || VERSE_NUMBER.test(raw)) {
        signs.push({ verse: start.ref, line: n, sign: raw });
        continue;
      }
      j++;
      words.push({ ref: `${start.ref}#${j}`, verse: start.ref, line: n, display: raw, form });
    }
  });
  return { words, signs };
}
