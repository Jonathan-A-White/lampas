// src/data/grammar/ideaSheet.ts — what the idea sheet (src/IdeaSheet.tsx, mw-hqd5bz.7) shows of a grammar idea, worked out from the
// chapter files alone: the passage the examples come from (the goal's, else the open chapter) and the examples of the idea in it. An example is
// one the card can explain (mw-5r3p30.234): its parsing carries the idea, it is a part of speech the cards below taught, its form is in the
// card's table, and it is shown with the ending the table names marked, its one sense here, and its parsing in the card's own terms.
// Pure data work: no store, no screen; docs/grammar.md.
import { type BookIndex, type Chapter, type GreekWord, ownEnglish, wordGloss } from '../chapter';
import { goalText, parseGoal } from '../goal';
import { decodeParse, parseSegments, splitParse } from '../parseCode';
import { passagesOf } from '../passage';
import type { OpenChapter } from '../readerChapter';
import { clustersOf, foundationSpans, isFoundation, type Span } from './inference';
import { ideaOfTerm, ideasBelow, ideasOfWord, type GrammarIdea } from './ladder';
import { bare, cellOptions, tableHas, teachOf, type TeachTable } from './teach';

/** A book goal looks in its first chapters only: every chapter would be a request each. */
export const MAX_CHAPTERS = 5;
export const MAX_EXAMPLES = 3;
/** An idea whose every form is one word (the article) shows one example per form, and as many as a verse is likely to hold. */
export const MAX_FORM_EXAMPLES = 4;
const BY_FORM: readonly string[] = ['article'];
/** A foundation idea shows more: a sound or a letter is met in many forms, and each form shows it in a different place (mw-86e9r1.13). */
export const MAX_FOUNDATION_EXAMPLES = 12;

type ChapterLoader = (book: string, n: number) => Promise<Chapter>;

export interface IdeaPassage {
  /** 'Romans 8', '1 John 1:3': what the examples are said to come from */
  title: string;
  chapters: Chapter[];
  /** a verse goal: only this verse of its chapter */
  verse?: number;
  /** the number of chapters of the goal's book, when a goal named it: the book is the last place examples are looked for */
  chapterCount?: number;
}

/**
 * The passage the examples of an idea come from: the goal named by `goalSaved` (the goal setting's text, any form parseGoal reads),
 * its chapter, its one verse or the first MAX_CHAPTERS chapters of its book; with no goal, or one that names nothing the index
 * has, the open chapter. The index may be left out when there is no goal text to read.
 */
export async function ideaPassage(goalSaved: string | undefined, open: OpenChapter, load: ChapterLoader, index?: BookIndex): Promise<IdeaPassage> {
  const goal = goalSaved && index ? parseGoal(goalSaved, index) : undefined;
  if (!goal) return { title: open.title, chapters: [await load(open.book, open.chapter)] };
  const count = index?.books.find((b) => b.code === goal.book)?.chapters ?? 0;
  const numbers = goal.chapter !== undefined ? [goal.chapter] : Array.from({ length: Math.min(count, MAX_CHAPTERS) }, (_, i) => i + 1);
  return { title: goalText(goal), chapters: await Promise.all(numbers.map((n) => load(goal.book, n))), verse: goal.verse, chapterCount: count };
}

/** A stretch of an example's Greek: `marked` is the part an idea is about (the pair of vowels, the breathing's vowel, the letter). */
export interface ExamplePart {
  text: string;
  marked: boolean;
}

export interface IdeaExample {
  word: GreekWord;
  /** the chapter it stands in: its parsing and gloss are read from it */
  chapter: Chapter;
  verse: number;
  /** '1 John 1:1' */
  reference: string;
  /** the word's Greek in order, the letters the idea is about marked; one unmarked part for a grammar idea */
  parts: ExamplePart[];
}

/** The English the verse gives `word` alone, '' when no chunk renders it alone or the chunk has no word of its own (chapter.ts ownEnglish). */
export function wordEnglish(chapter: Chapter, verse: number, word: GreekWord): string {
  const chunk = word.e === undefined ? undefined : chapter.verses.find((x) => x.n === verse)?.e[word.e];
  return chunk && chunk.g.length === 1 ? ownEnglish(chunk) : '';
}

/**
 * What an example row says the word means. The lexicon's gloss is for the lemma ('this/he/she/it' for οὗτος), so beside a plural form it
 * teaches the wrong number; the word's own English is the chunk of its verse that renders it alone ('these things'). When the chunk renders
 * other Greek words too, or the word has none, the gloss is labelled as the dictionary form's: 'οὗτος: this/he/she/it'.
 */
export function exampleMeaning(chapter: Chapter, verse: number, word: GreekWord): string {
  const own = wordEnglish(chapter, verse, word);
  if (own) return own;
  const gloss = wordGloss(chapter, word);
  return gloss ? `${word.l}: ${gloss}` : word.l;
}

/** Words of `chapters` (the one `verse` of the first, when given), in text order. */
function* wordsOf(chapters: Chapter[], verse?: number): Generator<{ word: GreekWord; chapter: Chapter; verse: number }> {
  for (const chapter of chapters) {
    for (const v of chapter.verses) {
      if (verse !== undefined && v.n !== verse) continue;
      for (const word of v.g) yield { word, chapter, verse: v.n };
    }
  }
}

/** Every form of the passage (NFC), for finding the worked example that stands in the verse he reads. */
export const passageForms = (passage: Pick<IdeaPassage, 'chapters' | 'verse'>): Set<string> =>
  new Set([...wordsOf(passage.chapters, passage.verse)].map(({ word }) => word.t.normalize('NFC')));

/** True for an idea about how Greek is spelt and said (the alphabet, a letter, a pair, a breathing, an accent, iota subscript, syllables,
 * punctuation): its examples are forms with the letters marked, found by their spelling, never by their parsing. */
export const isSpellingIdea = (id: string): boolean => id === 'alphabet' || id === 'syllables' || id === 'punctuation' || isFoundation(id);

/** Spans put in order with any that overlap made one. */
function joined(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && span.start < last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}

/** The form cut into parts, the clusters in `spans` marked. */
function partsOf(form: string, spans: Span[]): ExamplePart[] {
  const clusters = clustersOf(form).map((c) => (c.text + c.marks).normalize('NFC'));
  const parts: ExamplePart[] = [];
  let at = 0;
  const push = (to: number, marked: boolean): void => {
    if (to > at) parts.push({ text: clusters.slice(at, to).join(''), marked });
    at = Math.max(at, to);
  };
  for (const span of joined(spans)) {
    push(span.start, false);
    push(span.end, true);
  }
  push(clusters.length, false);
  return parts;
}

/** The spans of a form an idea of spelling is about, or undefined when the form is not spelt with it; 'alphabet' (any form) has none to mark. */
function spellingOf(id: string, form: string): Span[] | undefined {
  const spans = foundationSpans(form);
  if (id === 'alphabet') return clustersOf(form).some((c) => c.letter) ? [] : undefined;
  const found = spans.get(id);
  // a word of one syllable has nothing to cut
  if (id === 'syllables') return found && found.length >= 2 ? found : undefined;
  return found;
}

/** The ladder idea of a word's part of speech: 'noun', 'verb', 'article', 'pronoun' (any kind), 'preposition'. */
function partOfSpeech(code: string): string | undefined {
  const { pos } = splitParse(code);
  return pos === 'pronoun' ? 'pronoun' : ideaOfTerm(pos);
}

/** The idea itself and every idea below it: what its card may take as known. */
const taughtAt = (id: string): Set<string> => new Set([id, ...ideasBelow(id).map((i) => i.id)]);

/** The number of letters of the longest ending of the table that `form` ends in; 0 when it matches none, or matches a whole form. */
function endingLength(table: TeachTable, form: string): number {
  const word = bare(form);
  let longest = 0;
  for (const row of table.rows) {
    for (const cell of row.cells) {
      for (const option of cellOptions(cell)) {
        if (option.ending && word.endsWith(option.text) && word.length > option.text.length) longest = Math.max(longest, [...option.text].length);
      }
    }
  }
  return longest;
}

/** The form with its last `letters` letters marked: ἀρχ + ῆς. */
function endingParts(form: string, letters: number): ExamplePart[] {
  const clusters = clustersOf(form);
  let start = clusters.length;
  for (let seen = 0; start > 0 && seen < letters; start--) if (clusters[start - 1].letter) seen++;
  return partsOf(form, [{ start, end: clusters.length }]);
}

/**
 * Whether the card of `id` can explain `word` (mw-5r3p30.234, his words: "make sure in each card that the examples do match the lesson"): its parsing
 * carries the idea; it is a part of speech the card or a card below it taught (or one the card names in examplesAs); and, when the card has a table,
 * its form is in it.
 */
export function cardExplains(id: string, word: GreekWord): boolean {
  if (!ideasOfWord(word).includes(id)) return false;
  const teach = teachOf(id);
  const pos = partOfSpeech(word.p);
  if (!pos || !(taughtAt(id).has(pos) || teach.examplesAs?.includes(pos))) return false;
  return !teach.table || tableHas(teach.table, word.t);
}

/**
 * Up to `max` words of the passage in the order of the text. For a grammar idea: the words its card can explain (cardExplains), one for each lemma
 * (one for each form, for the article), with the ending its table names marked. For an idea of spelling (isSpellingIdea): the words spelt with it,
 * one for each form, with the letters it is about marked in `parts`, up to MAX_FOUNDATION_EXAMPLES when `max` is not given.
 */
export function ideaExamples(id: string, chapters: Chapter[], verse?: number, max?: number): IdeaExample[] {
  const spelling = isSpellingIdea(id);
  const byForm = BY_FORM.includes(id);
  const limit = max ?? (spelling ? MAX_FOUNDATION_EXAMPLES : byForm ? MAX_FORM_EXAMPLES : MAX_EXAMPLES);
  const table = spelling ? undefined : teachOf(id).table;
  const explained = new Map<string, boolean>();
  const explains = (word: GreekWord): boolean => {
    const key = `${word.t} ${word.l} ${word.p}`;
    let found = explained.get(key);
    if (found === undefined) {
      found = cardExplains(id, word);
      explained.set(key, found);
    }
    return found;
  };
  const chosen: IdeaExample[] = [];
  const seen = new Set<string>();
  for (const { word, chapter, verse: n } of wordsOf(chapters, verse)) {
    if (chosen.length >= limit) break;
    const key = spelling || byForm ? bare(word.t) : word.l;
    if (seen.has(key)) continue;
    let parts: ExamplePart[];
    if (spelling) {
      const spans = spellingOf(id, word.t);
      if (!spans) continue;
      parts = partsOf(word.t, spans);
    } else {
      if (!explains(word)) continue;
      const ending = table ? endingLength(table, word.t) : 0;
      parts = ending ? endingParts(word.t, ending) : [{ text: word.t, marked: false }];
    }
    seen.add(key);
    chosen.push({ word, chapter, verse: n, reference: `${chapter.book} ${chapter.chapter}:${n}`, parts });
  }
  return chosen;
}

/** The first sense of a gloss: 'the/this/who' is 'the', 'to keep: observe' is 'to keep'. */
const firstSense = (gloss: string): string => gloss.split(/[/;:,]/)[0].trim();

/**
 * What an example means here, in one sense (mw-5r3p30.234): the article is always 'the'; any other word its own English in the verse, when a chunk
 * renders it alone, else the first sense of its dictionary gloss ('the/this/who' would teach three words at once).
 */
export function exampleGloss(idea: GrammarIdea, example: IdeaExample): string {
  const { word, chapter, verse } = example;
  if (idea.id === 'article' && word.p.startsWith('T-')) return 'the';
  const own = wordEnglish(chapter, verse, word);
  if (own) return own;
  return firstSense(wordGloss(chapter, word) ?? '') || word.l;
}

/** The noun an article goes with: the next word of its verse, within a few, in the same case, number and gender. */
function partnerOf(example: IdeaExample): GreekWord | undefined {
  const words = example.chapter.verses.find((v) => v.n === example.verse)?.g ?? [];
  const at = words.indexOf(example.word);
  const own = example.word.p.slice(2, 5);
  return words.slice(at + 1, at + 5).find((w) => !w.p.startsWith('T-') && /^(N|A|V)-/.test(w.p) && w.p.split('-').some((part) => part.endsWith(own)));
}

/**
 * The example taken apart in the card's own terms (mw-5r3p30.234): the terms of its parsing that the card or a card below it taught, leaving out its
 * part of speech ('genitive singular'; 'dative plural masculine' for τοῖς), and for the article the noun it goes with ('goes with ὀφθαλμοῖς “eyes”').
 * Undefined for an idea of spelling, whose marked letters are the explanation, or when the card has taught none of its terms.
 */
export function exampleNote(idea: GrammarIdea, example: IdeaExample): string | undefined {
  if (isSpellingIdea(idea.id)) return undefined;
  const taught = taughtAt(idea.id);
  const pos = splitParse(example.word.p).pos;
  // the parsing's groups ('verb', 'imperfect active indicative', '3rd person singular'), each kept to the terms the card has taught, the part of speech left out
  const groups = decodeParse(example.word.p)
    .split(', ')
    .map((group) =>
      parseSegments(group)
        .flatMap((segment) => (segment.term ? [segment.term] : []))
        .filter((term) => term !== pos && !term.endsWith('pronoun') && taught.has(ideaOfTerm(term) ?? ''))
        .join(' '),
    )
    .filter((group) => group !== '');
  const parts = groups.length ? [groups.join(', ')] : [];
  if (idea.id === 'article') {
    const partner = partnerOf(example);
    if (partner) parts.push(`goes with ${partner.t} “${exampleGloss(idea, { ...example, word: partner })}”`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

/** Where the examples of an idea come from, and what the sheet calls that place: 'Examples from <title>'. */
export interface IdeaExamples {
  title: string;
  examples: IdeaExample[];
}

/**
 * The examples of an idea for a passage, looking further out when the goal has none (mw-5r3p30.350, his words: "If there's an example in the goal can you
 * look outside of it, in the pericope or in the chapter"). The order is the goal itself, then (for a verse goal) its pericope, the heading's verses, then
 * its chapter, then its book. The book step is PROVISIONAL: he named the pericope or the chapter, the Governor is to confirm the whole book.
 * `title` names the place the examples came from ('1 John 1:1-4'); with none found it is the passage's own title and `examples` is empty.
 */
export async function ideaExamplesFor(id: string, passage: IdeaPassage, load: ChapterLoader): Promise<IdeaExamples> {
  const found = ideaExamples(id, passage.chapters, passage.verse);
  if (found.length) return { title: passage.title, examples: found };
  const first = passage.chapters[0];
  if (first) {
    if (passage.verse !== undefined && passage.chapters.length === 1) {
      const name = `${first.book} ${first.chapter}`;
      const open = passagesOf(first.verses).filter((p) => p.first <= (passage.verse ?? 0)).pop();
      // verses before the chapter's first heading belong to no passage: they run from verse 1 to the verse before it
      const [from, to] = open ? [open.first, open.last] : [1, (first.verses.find((v) => v.h)?.n ?? first.verses.length + 1) - 1];
      if (to > from) {
        const verses = first.verses.filter((v) => v.n >= from && v.n <= to);
        const examples = ideaExamples(id, [{ ...first, verses }]);
        if (examples.length) return { title: `${name}:${from}-${to}`, examples: examples.map((e) => ({ ...e, chapter: first })) };
      }
      const wholeChapter = ideaExamples(id, [first]);
      if (wholeChapter.length) return { title: name, examples: wholeChapter };
    }
    if (passage.chapterCount !== undefined && passage.chapters.length < passage.chapterCount) {
      const rest = await Promise.all(Array.from({ length: passage.chapterCount }, (_, i) => i + 1).map((n) => load(first.code, n)));
      const wholeBook = ideaExamples(id, rest);
      if (wholeBook.length) return { title: first.book, examples: wholeBook };
    }
  }
  return { title: passage.title, examples: [] };
}
