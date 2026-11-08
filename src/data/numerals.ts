// src/data/numerals.ts — the numeral phrases of a verse (mw-5r3p30.1127, his ask 2026-11-06 on Genesis 14:14 'the 318'): the Hebrew and the Greek write a big number as a run of words
// ('eight, ten, and three, hundreds'; 'a hundred, fifty, three'), while the English gives one chunk, and the chunk's word sheet knew only one of the words. This finds the whole run in source
// order, the value of each word and the sum, which the Number sheet (src/NumberSheet.tsx) draws. A Hebrew numeral is known by its Strong's number, a Greek one by its lemma (the Septuagint has
// no number); only the cardinals count, no ordinal. A sum is shown only where the English says it too (numberPhraseOf): where a noun splits a number ('930 years' is 'thirty years and nine
// hundred years') or the English reads it another way, the word sheet opens as it always did. scripts/numeral-sweep.ts checks every phrase of the shipped text; docs/layout/word-sheet.md.
import { sourceLanguage, type Chapter, type GreekWord, type Verse } from './chapter';

/** The language of the words: 'hbo' for an Old Testament chapter, 'grc' for the Greek (the New Testament and the Septuagint). */
export type NumeralLanguage = 'hbo' | 'grc';

/** What one numeral word is worth: its own number; a word with a `scale` (100, 1000 or 10000: hundred, thousand, ten thousand) multiplies the numbers said with it. */
export interface NumeralValue {
  value: number;
  scale?: 100 | 1000 | 10000;
}

/** A word of a numeral phrase: `value` is absent for the Greek kai between two numerals, which is shown and not added. */
export interface NumeralPart {
  index: number;
  word: GreekWord;
  value?: number;
}

export interface NumeralPhrase {
  language: NumeralLanguage;
  parts: NumeralPart[];
  /** what is added, in order: a plain number, or a product like '(6 + 40) × 1,000' with its value */
  terms: { text: string; value: number }[];
  sum: number;
  /** '8 + 10 + 300 = 318' */
  line: string;
}

const HEBREW: Record<string, number> = {
  H259: 1, H2297: 1, H2298: 1, H6249: 1, H8147: 2, H8648: 2, H7969: 3, H8532: 3, H702: 4, H703: 4, H2568: 5, H8337: 6, H8353: 6, H7651: 7, H7655: 7, H8083: 8, H8672: 9,
  H6235: 10, H6236: 10, H6240: 10, H6242: 20, H6243: 20, H7970: 30, H8533: 30, H705: 40, H2572: 50, H8346: 60, H8361: 60, H7657: 70, H8084: 80, H8673: 90,
  H3967: 100, H3969: 100, H505: 1000, H506: 1000, H7233: 10000, H7239: 10000, H7240: 10000,
};
const HEBREW_SCALES: Record<string, 100 | 1000 | 10000> = { H3967: 100, H3969: 100, H505: 1000, H506: 1000, H7233: 10000, H7239: 10000, H7240: 10000 };
/** The 'ten' of 'eight ten' (eighteen): עָשָׂר and its Aramaic one; the absolute עֶשֶׂר (H6235) is 'ten' alone and never ends a teen. */
const HEBREW_TEEN_TEN = new Set(['H6240', 'H6236']);

const nfc = (text: string): string => text.normalize('NFC');
const table = (entries: Record<string, number>): ReadonlyMap<string, number> => new Map(Object.entries(entries).map(([k, v]) => [nfc(k), v]));
const GREEK = table({
  εἷς: 1, δύο: 2, τρεῖς: 3, τέσσαρες: 4, πέντε: 5, ἕξ: 6, ἑπτά: 7, ὀκτώ: 8, ἐννέα: 9, δέκα: 10, ἕνδεκα: 11, δώδεκα: 12, δεκαδύο: 12, δεκατρεῖς: 13, δεκατέσσαρες: 14, δεκαπέντε: 15,
  δεκαέξ: 16, δεκαεπτά: 17, δεκαοκτώ: 18, δεκαεννέα: 19, εἴκοσι: 20, τριάκοντα: 30, τεσσαράκοντα: 40, πεντήκοντα: 50, ἑξήκοντα: 60, ἑβδομήκοντα: 70, ὀγδοήκοντα: 80, ἐνενήκοντα: 90,
  ἑκατόν: 100, διακόσιοι: 200, τριακόσιοι: 300, τετρακόσιοι: 400, πεντακόσιοι: 500, ἑξακόσιοι: 600, ἑπτακόσιοι: 700, ὀκτακόσιοι: 800, ἐνακόσιοι: 900,
  χίλιοι: 1000, δισχίλιοι: 2000, τρισχίλιοι: 3000, τετρακισχίλιοι: 4000, πεντακισχίλιοι: 5000, ἑξακισχίλιοι: 6000, ἑπτακισχίλιοι: 7000, ὀκτακισχίλιοι: 8000, ἐνακισχίλιοι: 9000,
  μύριοι: 10000, δισμύριοι: 20000, τρισμύριοι: 30000, χιλιάς: 1000, μυριάς: 10000,
});
const GREEK_SCALES: ReadonlyMap<string, 1000 | 10000> = new Map([
  [nfc('χιλιάς'), 1000],
  [nfc('μυριάς'), 10000],
]);
const KAI = nfc('καί');

/** The Hebrew parse of a numeral says its number in its second letter ('Number-fd', a dual; 'Number-mp', a plural); a scale word in the dual is two of them (מָאתַיִם, 200). */
const numberOf = (word: GreekWord): string | undefined => /Number-[mfc]([sdp])/.exec(word.p)?.[1];

/** What `word` is worth as a cardinal number, or undefined when it is no cardinal. */
export function numeralValue(word: GreekWord, language: NumeralLanguage): NumeralValue | undefined {
  if (language === 'hbo') {
    const value = HEBREW[word.s];
    if (value === undefined) return undefined;
    const scale = HEBREW_SCALES[word.s];
    return scale === undefined ? { value } : { value: numberOf(word) === 'd' ? value * 2 : value, scale };
  }
  const lemma = nfc(word.l);
  const value = GREEK.get(lemma);
  const scale = GREEK_SCALES.get(lemma);
  return value === undefined ? undefined : scale === undefined ? { value } : { value, scale };
}

const keyOf = (word: GreekWord, language: NumeralLanguage): string => (language === 'hbo' ? word.s : nfc(word.l));
const hasWaw = (word: GreekWord): boolean => /Conj-w/.test(word.p);
/** A Hebrew word that carries a preposition or the article ('לִשְׁתֵּי' for two, 'בַּחֲמֵשׁ' by five): inside a number the words carry at most an 'and', so it begins a number of its own. */
const hasPrefix = (word: GreekWord): boolean => /(^|\| )(Prep|Art)/.test(word.p);
const fmt = (n: number): string => n.toLocaleString('en-US');

/** The kinds of numeral that may stand side by side: a unit (1 to 9), the ten, the tens (20 to 90), hundreds and the thousands' own words, and a scale word. */
type Kind = 'unit' | 'ten' | 'tens' | 'hundreds' | 'scale';
const kindOf = ({ value, scale }: NumeralValue): Kind => (scale !== undefined ? 'scale' : value < 10 ? 'unit' : value === 10 ? 'ten' : value < 100 ? 'tens' : 'hundreds');

/** Whether the numeral word `next` goes on the run that `last` ends. Two units, two tens or two tens-and-ten never add up to a number ('one, two' is a pair, 'each, thirty' is not thirty-one);
 * a Hebrew number takes 'and' between the parts ('three and twenty'), except the teens ('eight ten'), the scales ('three hundreds') and what follows a hundred ('six hundred sixty and six'). */
function continues(last: GreekWord, next: GreekWord, language: NumeralLanguage): boolean {
  const a = numeralValue(last, language);
  const b = numeralValue(next, language);
  if (!a || !b) return false;
  if (keyOf(last, language) === keyOf(next, language) && !(language === 'hbo' && hasWaw(next))) return false;
  const [from, to] = [kindOf(a), kindOf(b)];
  if (to === 'scale') return true;
  if (language === 'hbo') {
    if (hasPrefix(next)) return false;
    if (to === 'ten' && from === 'unit') return HEBREW_TEEN_TEN.has(next.s);
    // after a hundred or a thousand ('six hundred sixty and six', 'two thousand eight hundred') the next part needs no 'and'
    if (from === 'scale') return true;
    if (!hasWaw(next)) return false;
  }
  return from !== to || from === 'hundreds';
}

interface Item {
  value: number;
  text: string;
  /** a plain 1 to 9, which a hundred before it multiplies */
  unit: boolean;
  /** a product of a thousand or more: nothing said after it multiplies with it */
  closed: boolean;
  /** how a product was made ('3 × 100'), said when it is the whole sum */
  how?: string;
}

/** Adds up the numerals of a run, in source order. The units, teens and tens add. 'Three hundreds' multiplies the unit just said. A thousand or a ten thousand multiplies everything said since the last
 * one ('six and forty thousand' is 46,000, 'a hundred, forty, four thousands' is 144,000), except a Hebrew plural, which multiplies only the unit before it ('five hundred and four thousands' is 4,500),
 * and a Hebrew 'and a thousand', which is one thousand added. A Greek 'thousands five' (the number after the scale word) is five thousand. */
function sumOf(parts: readonly { word: GreekWord; info: NumeralValue }[], language: NumeralLanguage): { terms: NumeralPhrase['terms']; sum: number } {
  const items: Item[] = [];
  let from = 0;
  const close = (item: Item): void => {
    items.push({ ...item, closed: true });
    from = items.length;
  };
  for (let i = 0; i < parts.length; i += 1) {
    const { word, info } = parts[i];
    const { value, scale } = info;
    if (scale === undefined) {
      items.push({ value, text: fmt(value), unit: value < 10, closed: false });
      continue;
    }
    const open = items.slice(from);
    if (scale === 100) {
      const last = items.at(-1);
      if (last && !last.closed && last.unit && value === 100) {
        items.pop();
        items.push({ value: last.value * 100, text: fmt(last.value * 100), unit: false, closed: false, how: `${last.text} × 100` });
      } else items.push({ value, text: fmt(value), unit: false, closed: false });
    } else if (language === 'hbo' && hasWaw(word) && value === scale) {
      close({ value, text: fmt(value), unit: false, closed: true });
    } else if (open.length === 0) {
      const after = language === 'grc' ? parts.slice(i + 1).findIndex((p) => p.info.scale !== undefined) : 0;
      const following = language === 'grc' ? parts.slice(i + 1, after < 0 ? undefined : i + 1 + after) : [];
      if (following.length > 0) {
        const times = following.reduce((n, p) => n + p.info.value, 0);
        close({ value: value * times, text: fmt(value * times), unit: false, closed: true, how: `${fmt(times)} × ${fmt(scale)}` });
        i += following.length;
      } else close({ value, text: fmt(value), unit: false, closed: true });
    } else {
      const plural = language === 'hbo' && numberOf(word) !== 's';
      const last = items.at(-1)!;
      const used = plural && last.value <= 10 && !last.closed ? [last] : open;
      const total = used.reduce((n, p) => n + p.value, 0) * scale;
      const how = used.length === 1 ? `${used[0].text} × ${fmt(scale)}` : `(${used.map((p) => p.text).join(' + ')}) × ${fmt(scale)}`;
      items.splice(items.length - used.length, used.length);
      close({ value: total, text: used.length === 1 ? fmt(total) : how, unit: false, closed: true, how });
    }
  }
  const terms = items.map(({ text, value }) => ({ text, value }));
  // a phrase that is one product says how it was made ('5 × 100 = 500'), not '500 = 500'
  if (items.length === 1 && items[0].how) terms[0] = { text: items[0].how, value: items[0].value };
  return { terms, sum: terms.reduce((n, t) => n + t.value, 0) };
}

/** Every run of two or more numeral words in a verse, in order (a Greek kai between two numerals stays in the run). */
export function numeralPhrases(words: readonly GreekWord[], language: NumeralLanguage): NumeralPhrase[] {
  const out: NumeralPhrase[] = [];
  let run: NumeralPart[] = [];
  let infos: { word: GreekWord; info: NumeralValue }[] = [];
  let kai: { word: GreekWord; index: number } | undefined;
  const close = (): void => {
    if (run.length >= 2) {
      const { terms, sum } = sumOf(infos, language);
      out.push({ language, parts: run, terms, sum, line: `${terms.map((t) => t.text).join(' + ')} = ${fmt(sum)}` });
    }
    run = [];
    infos = [];
    kai = undefined;
  };
  words.forEach((word, index) => {
    const info = numeralValue(word, language);
    if (info) {
      const last = infos.at(-1);
      if (last && !continues(last.word, word, language)) close();
      if (kai && run.length > 0) run.push({ index: kai.index, word: kai.word });
      kai = undefined;
      run.push({ index, word, value: info.value });
      infos.push({ word, info });
    } else if (language === 'grc' && nfc(word.l) === KAI && run.length > 0 && kai === undefined) kai = { word, index };
    else close();
  });
  close();
  return out;
}

/** The phrase the numeral word at `index` belongs to, or undefined when it is no numeral or stands alone ('seven', 'a hundred'). */
export function numeralPhraseAt(words: readonly GreekWord[], index: number, language: NumeralLanguage): NumeralPhrase | undefined {
  return numeralPhrases(words, language).find((p) => p.parts.some((part) => part.index === index));
}

const UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
  sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90,
};

/** Every number an English text says, in digits ('the 318', 'numbered 46,500.') or in words ('twelve', 'forty-six thousand', 'a hundred', 'the twenty-first'): 'one of the twelve' says two. */
export function englishNumbers(text: string): number[] {
  const out: number[] = [];
  let total = 0;
  let current = 0;
  let active = false;
  const finish = (): void => {
    if (active) out.push(total + current);
    total = 0;
    current = 0;
    active = false;
  };
  const tokens = [...text.toLowerCase().matchAll(/\d{1,3}(?:\s?,\d{3})+|\d+|[a-z]+/g)].map((m) => m[0]);
  tokens.forEach((token, i) => {
    if (/^\d/.test(token)) {
      finish();
      out.push(Number(token.replace(/[\s,]/g, '')));
    } else if (token === 'and') {
      // 'one hundred and twenty': an 'and' between two number words goes on; after any other it ends the number
      const next = tokens[i + 1];
      if (!active || next === undefined || !(next in UNITS || next in ORDINALS || next === 'hundred' || next === 'thousand')) finish();
    } else if (token === 'hundred' || token === 'hundredth') {
      current = (current || 1) * 100;
      active = true;
    } else if (token === 'thousand' || token === 'thousandth') {
      total += (current || 1) * 1000;
      current = 0;
      active = true;
    } else if (token in UNITS || token in ORDINALS || token.replace(/fold$/, '') in UNITS) {
      current += UNITS[token] ?? ORDINALS[token] ?? UNITS[token.replace(/fold$/, '')];
      active = true;
    } else finish();
  });
  finish();
  return out;
}

/** The first number an English text says, or undefined when it says none. */
export const englishNumber = (text: string): number | undefined => englishNumbers(text)[0];

/** The English chunks the words of a phrase are in, each once, in the order of the English. */
export function phraseEnglish(verse: Pick<Verse, 'e'>, phrase: NumeralPhrase): string[] {
  const chunks = [...new Set(phrase.parts.map((p) => p.word.e).filter((e): e is number => e !== undefined))].sort((a, b) => a - b);
  return chunks.map((e) => verse.e[e]?.t ?? '').filter((t) => t !== '');
}

/** The numbers the English of a phrase says: each of its chunks' ('the 318'), and all of them said as one ('five' / 'hundred' is five hundred). */
export function phraseSays(verse: Pick<Verse, 'e'>, phrase: NumeralPhrase): number[] {
  const english = phraseEnglish(verse, phrase);
  return [...english, english.join(' ')].flatMap(englishNumbers);
}

/** The phrase a tapped English chunk stands for: the chunk says a number, holds a word of a numeral phrase of two or more words ('the 318' holds only the first Hebrew word of the four), and the English
 * says the phrase's sum too. A chunk that holds numeral words without saying a number ('trained men', which holds the last three) is no number, and neither is a phrase the English reads another
 * way ('930 years' over 'thirty' and 'nine hundred', split by a noun). `verse` is the number of the verse the chunk is in, when known. */
export function numberPhraseOf(chapter: Chapter, words: readonly GreekWord[], english: string | undefined, verse: number | undefined): NumeralPhrase | undefined {
  if (english === undefined || englishNumbers(english).length === 0 || words.length === 0) return undefined;
  const v = verse !== undefined ? chapter.verses.find((x) => x.n === verse) : chapter.verses.find((x) => x.g.includes(words[0]));
  if (!v) return undefined;
  const language: NumeralLanguage = sourceLanguage(chapter) === 'hbo' ? 'hbo' : 'grc';
  const phrases = numeralPhrases(v.g, language);
  for (const word of words) {
    const at = v.g.indexOf(word);
    const phrase = at < 0 ? undefined : phrases.find((p) => p.parts.some((part) => part.index === at && part.value !== undefined));
    if (phrase && phraseSays(v, phrase).includes(phrase.sum)) return phrase;
  }
  return undefined;
}
