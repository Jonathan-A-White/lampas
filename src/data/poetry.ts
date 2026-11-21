// src/data/poetry.ts — a verse of poetry as its lines (docs/data.md 'Poetry lines'): the Berean table's line marks are `Verse.l`, where each line starts as an English chunk and how deep it stands.
import type { GreekWord, Verse } from './chapter';

export interface PoetryLineSpan {
  /** how deep the line stands: 1, or 2 for the deeper lines; 0 for the lead-in (below) */
  indent: 0 | 1 | 2;
  /** the line opens a block, where the stanza breaks */
  stanza: boolean;
  /** the first English chunk of the line */
  from: number;
  /** one past its last chunk */
  to: number;
  /** the line's English, as the chunks run together */
  text: string;
  /** the lead-in: the chunks ahead of a verse's first mark, prose that brings the lines in ('He said:', a Psalm's title), set flush left ahead of them */
  continued: boolean;
}

/**
 * The lines of a verse of poetry, in English order, or null when the verse is prose (it has no `l`). The chunks before the first mark (528 verses: 'Then Mary said:', a Psalm's title, 'He said:') are the verse's lead-in,
 * a line of their own, `continued`, flush left (indent 0).
 */
export function poetryLinesOf(verse: Pick<Verse, 'e' | 'l'>): PoetryLineSpan[] | null {
  const marks = verse.l;
  if (!marks?.length) return null;
  const lines: PoetryLineSpan[] = [];
  const text = (from: number, to: number): string => verse.e.slice(from, to).map((c) => c.t.trim()).filter(Boolean).join(' ');
  if (marks[0][0] > 0) lines.push({ indent: 0, stanza: false, from: 0, to: marks[0][0], text: text(0, marks[0][0]), continued: true });
  marks.forEach(([chunk, indent, stanza], i) => {
    const to = i + 1 < marks.length ? marks[i + 1][0] : verse.e.length;
    lines.push({ indent, stanza: stanza === 1, from: chunk, to, text: text(chunk, to), continued: false });
  });
  return lines;
}

/** The books whose verses are in the poetic accents (the three: Psalms, Job, Proverbs), where oleh-weyored and the atnach divide a verse; every other book is in the prose accents, where the atnach does and the zaqef divides a long half. */
const POETIC_BOOKS: ReadonlySet<string> = new Set(['psa', 'job', 'pro']);
const ATNACH = '\u0591';
const OLEH = '\u05AB';
/** the yored: the sign under the stress that completes an oleh-weyored (it is the merkha's code point) */
const YORED = '\u05A5';
const ZAQEF = /[\u0594\u0595]/;
/** A half of a verse in the prose accents longer than this many words is broken again at its zaqefs: a line of seven words is about what the phone's width holds in Hebrew type. */
export const LONG_HALF = 7;

/**
 * Where the lines of a Hebrew verse of poetry start, as indexes into its words, from the Masoretic accents (docs/data.md 'Poetry lines', mw-5r3p30.1165): a line ends at the word that carries the major accent. In Psalms, Job
 * and Proverbs that is oleh-weyored (the oleh and its yored, on one word or the oleh's word and the next) and the atnach; in every other book the atnach, and then, in a half longer than LONG_HALF words, each zaqef. Always starts with 0;
 * just [0] (no line to break) when the verse has no such accent, which the caller draws as running text.
 */
export function hebrewLineStarts(words: readonly Pick<GreekWord, 't'>[], code: string): number[] {
  const poetic = POETIC_BOOKS.has(code);
  const ends = new Set<number>();
  words.forEach(({ t }, i) => {
    if (t.includes(ATNACH)) ends.add(i);
    else if (poetic && t.includes(OLEH)) {
      // the yored is on the oleh's own word, or on the word that follows it ('פַּלְגֵ֫י מָ֥יִם')
      ends.add(t.includes(YORED) ? i : words[i + 1]?.t.includes(YORED) ? i + 1 : i);
    }
  });
  if (!poetic) {
    // a half (the words up to the atnach, or after it) of more than LONG_HALF words is broken at its zaqefs
    let from = 0;
    for (const end of [...[...ends].sort((a, b) => a - b), words.length - 1]) {
      if (end - from + 1 > LONG_HALF) for (let i = from; i < end; i++) if (ZAQEF.test(words[i].t) && i > from) ends.add(i);
      from = end + 1;
    }
  }
  return [0, ...[...ends].filter((i) => i < words.length - 1).sort((a, b) => a - b).map((i) => i + 1)];
}

/**
 * The lines of a verse of poetry in the Greek tab (the Hebrew tab's too), or null when the verse is prose or has no break to make. They are the verse's `hl` (fillChapter sets it: hebrewLineStarts for a Hebrew verse, greekLineStarts for a
 * New Testament one, withSeptuagintLines for a Septuagint one), each of indent 1, hung; `from` and `to` are indexes into the verse's source words, `g`. When the verse says `hlead`, its first line is the lead-in ('Then Mary said:'), a line of
 * indent 0 set flush left as in English. The stanza is the English's alone.
 */
export function hebrewLinesOf(verse: Pick<Verse, 'g' | 'hl'> & { hlead?: true }): PoetryLineSpan[] | null {
  const starts = verse.hl;
  if (!starts || starts.length < 2) return null;
  return starts.map((from, k) => {
    const to = k + 1 < starts.length ? starts[k + 1] : verse.g.length;
    const lead = k === 0 && verse.hlead === true;
    return { indent: lead ? 0 : 1, stanza: false, from, to, text: verse.g.slice(from, to).map((w) => w.t).join(' '), continued: lead };
  });
}

/** A Greek word as the small-word list has it: lower case, its punctuation off, the grave written as the acute ('Εἰς,' is 'εἰς', 'καὶ' is 'καί'); the breathings and the circumflex stay, so 'εἰς' (into) is not 'εἷς' (one) nor 'εἰ' 'εἶ' (you are). */
export const smallKey = (t: string): string =>
  t.normalize('NFD').toLowerCase().replace(/[^\p{L}\p{M}]/gu, '').replace(/\u0300/g, '\u0301').normalize('NFC');

/**
 * The small words a line of Greek poetry does not end on (mw-5r3p30.1198), by smallKey: the prepositions, the article, the negations and the conjunctions, each of which goes with the word that follows it, so a break
 * between it and that word strands it. The English word order differs from the Greek, so a break borrowed from the English line often falls there. The postpositives (γάρ, δέ, τε, οὖν) are not here: they stand
 * second in their clause and belong with the word before them, so a line may end on one and may not start with one.
 */
export const SMALL_WORDS: ReadonlySet<string> = new Set(
  [
    // prepositions
    'εἰς ἐν ἐπί ἐκ ἐξ πρός ἀπό διά κατά μετά περί ὑπό ὑπέρ παρά σύν ἀνά ἀντί πρό',
    // negations
    'οὐ οὐκ οὐχ μή',
    // the article
    'ὁ ἡ τό τοῦ τῆς τῷ τῇ τόν τήν τῶν τοῖς ταῖς τούς τάς τά οἱ αἱ',
    // conjunctions
    'καί ὅτι ἀλλά ἵνα εἰ ὡς ὅτε οὐδέ μηδέ ἐάν ἤ',
  ]
    .join(' ')
    .split(' ')
    .map(smallKey),
);

/**
 * Where the lines of a New Testament verse of poetry start in its Greek words (mw-5r3p30.1166), borrowed from the English lines (`l`): a line starts at the first Greek word of the English chunks of its line (the least index of their
 * `g`, so a line the English turns round, 'My soul magnifies', still starts at the verse's first word of it), and at the Greek words just ahead of it that have no English of their own ('Ἰδοὺ γάρ', where the English has no 'for behold'),
 * which belong to no earlier line. A line none of whose chunks has a Greek word, or whose word is not after the line before's start (the Greek runs the other way), is not a break: its words stay in the line before it. The chunks before
 * the English's first line are its lead-in; when the first line starts after the verse's first word, the words ahead of it are the lead-in line (`lead`). Null when the verse is prose or ends in one line.
 */
export function greekLineStarts(verse: Pick<Verse, 'g' | 'e' | 'l'>): { starts: number[]; lead: boolean } | null {
  const marks = verse.l;
  if (!marks?.length) return null;
  const startOf = (k: number, after: number): number | null => {
    const end = k + 1 < marks.length ? marks[k + 1][0] : verse.e.length;
    const placed = verse.e.slice(marks[k][0], end).flatMap((c) => c.g).filter((i) => i >= 0 && i < verse.g.length);
    if (placed.length === 0) return null;
    let at = Math.min(...placed);
    while (at - 1 > after && verse.g[at - 1].e === undefined) at--;
    return at > after ? at : null;
  };
  const starts = [0];
  let lead = false;
  marks.forEach((_, k) => {
    // a first line that is the English's first chunk starts at the verse's first word: it is `starts[0]`
    if (k === 0 && marks[0][0] === 0) return;
    const at = startOf(k, starts.at(-1)!);
    if (at === null) return;
    // the English chunks ahead of the first line are its lead-in: the Greek words ahead of where it starts are the lead-in line
    if (k === 0) lead = true;
    starts.push(at);
  });
  return mendStrandedWords(verse.g, starts, lead);
}

/** The most letters a word has to be a 'small word' alone on a line (Νῦν, οὐχ, Καὶ, Ἔφη). */
const LINE_OF_ONE_MAX = 4;
const lettersOf = (t: string): number => t.match(GREEK_LETTER)?.length ?? 0;

/**
 * Takes the stranded small words out of a verse's borrowed line starts (mw-5r3p30.1198): a line does not end on a preposition, article, negation or conjunction (SMALL_WORDS), whose word starts the next line (the English
 * word order differs), so the break moves back to before it (Luke 1:50 'εἰς' goes with 'γενεὰς'); and a line is not one word of LINE_OF_ONE_MAX letters or fewer (Philippians 2:6 'οὐχ', Luke 2:29 'Νῦν'), so its break is
 * dropped and the word joins the line after it (the line before, for the last line). A first line (the lead-in) that goes this way is no lead-in any more. Null when no break is left.
 */
function mendStrandedWords(words: readonly Pick<GreekWord, 't'>[], starts: readonly number[], lead: boolean): { starts: number[]; lead: boolean } | null {
  const kept = [0];
  let leadLeft = lead;
  starts.slice(1).forEach((raw, k) => {
    let at = raw;
    while (at - 1 > kept.at(-1)! && SMALL_WORDS.has(smallKey(words[at - 1].t))) at--;
    // the line [kept.at(-1), at) is one small word: no break here, it runs on into the next line
    if (at - kept.at(-1)! === 1 && lettersOf(words[at - 1].t) <= LINE_OF_ONE_MAX) {
      if (k === 0) leadLeft = false;
      return;
    }
    kept.push(at);
  });
  // the last line is one small word: it joins the line before it
  if (kept.length > 1 && words.length - kept.at(-1)! === 1 && lettersOf(words.at(-1)!.t) <= LINE_OF_ONE_MAX) kept.pop();
  return kept.length > 1 ? { starts: kept, lead: leadLeft } : null;
}

/** A verse's lines for a New Testament chapter's file: Greek verses that have English lines carry `hl` (and `hlead`) as they load, as a Hebrew verse does (fillChapter). */
export function withGreekLines<T extends Verse>(verse: T): T {
  const lines = greekLineStarts(verse);
  return lines ? { ...verse, hl: lines.starts, ...(lines.lead ? { hlead: true as const } : {}) } : verse;
}

/** Whether a word ends at a stop (Swete's punctuation: comma, full stop, the high stop · and its twin U+0387, a colon, the Greek question mark U+037E), where a line may fall. */
const STOP = /[,.·\u0387:;\u037E]['’\])”"]*$/u;
const GREEK_LETTER = /\p{L}/gu;
/** The Hebrew consonants: the points and the accents are marks (\u0591-\u05C7), the letters are \u05D0-\u05EA. */
const HEBREW_LETTER = /[\u05D0-\u05EA]/g;
/** How much a break not at a stop costs, in Greek letters (about two short words): a stop up to this far from the proportional place wins over the place itself. */
export const NO_STOP_COST = 10;

/** The number of letters in a Hebrew line's words, what its length is measured in (the prefixes the Hebrew writes into a word, 'and', 'in', 'the', are letters, as the Greek's own small words are). */
export const hebrewLetters = (words: readonly Pick<GreekWord, 't'>[]): number => words.reduce((sum, w) => sum + (w.t.match(HEBREW_LETTER)?.length ?? 0), 0);

/**
 * Where the lines of a Septuagint verse start in its Greek words (mw-5r3p30.1166), borrowed from the lines of its Hebrew verse, whose lengths in Hebrew letters are `hebrew`. Lampas has no link between a Septuagint word and a Hebrew one,
 * so the break is by proportion: the line that is a fraction of the Hebrew's letters ends about that fraction of the Greek's letters in, at the word boundary nearest, and a boundary after a stop (Swete's punctuation) within NO_STOP_COST
 * letters of the place is taken over it. APPROXIMATE. Always starts with 0; null when there is nothing to break (one Hebrew line, or fewer Greek words than lines).
 */
export function septuagintLineStarts(words: readonly Pick<GreekWord, 't'>[], hebrew: readonly number[]): number[] | null {
  const lines = hebrew.filter((n) => n > 0);
  const total = lines.reduce((a, b) => a + b, 0);
  const breaks = Math.min(lines.length - 1, words.length - 1);
  if (breaks < 1 || total === 0) return null;
  // the Greek letters before each word, and in all
  const before: number[] = [0];
  words.forEach((w) => before.push(before.at(-1)! + (w.t.match(GREEK_LETTER)?.length ?? 0)));
  const greek = before.at(-1)!;
  const starts = [0];
  let seen = 0;
  for (let k = 0; k < breaks; k++) {
    seen += lines[k];
    const target = (seen / total) * greek;
    let best = -1;
    let cost = Infinity;
    // a break leaves a word for each line still to come
    for (let b = starts.at(-1)! + 1; b <= words.length - (breaks - k); b++) {
      const c = Math.abs(before[b] - target) + (STOP.test(words[b - 1].t) ? 0 : NO_STOP_COST);
      if (c < cost) {
        cost = c;
        best = b;
      }
    }
    starts.push(best);
  }
  return starts;
}
