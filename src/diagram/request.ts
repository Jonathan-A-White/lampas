// src/diagram/request.ts — what the sentence-diagram grind (grinds/sentence-diagram.json, mw-souyao.2) is sent for a verse or a passage, and the words the renderer indexes. The grind answers with a
// tree (types.ts) whose {i} point into `words`; the same list is built here for the request and for the picture, so an index means the same word on both sides. Pure: no store, no network.
import { bareEnglish, wordGloss, type Chapter, type GreekWord, type Verse } from '../data/chapter';
import { titleOf } from '../data/books';
import { unitReference } from '../data/passage';
import { hebrewPieces } from './hebrewPieces';
import { isWholeVerses, type Sentence, type SentencePart } from './sentence';
import type { DiagramMode, DiagramWords } from './types';

/** One word of the request. English: its chunk (its place in the verse's English chunks); Greek: its lemma and parse. `verse` only in a passage of several verses, where `chunk` counts within that verse. */
export interface DiagramRequestWord {
  i: number;
  text: string;
  chunk?: number;
  lemma?: string;
  parse?: string;
  /** Hebrew only: the piece's English gloss, where it has one */
  gloss?: string;
  verse?: number;
}

/** In English mode, a Greek word of the verse as context: its form, lemma and parse code, and the English chunk it is part of when it has one. */
export interface DiagramGreekWord {
  text: string;
  lemma?: string;
  parse: string;
  chunk?: number;
  verse?: number;
}

/** The grind's input (grinds/sentence-diagram.input.schema.json). `faults` is only on the second ask of a verse: what was wrong with the first answer. */
export interface DiagramRequest {
  ref: string;
  lang: DiagramMode;
  words: DiagramRequestWord[];
  greek?: DiagramGreekWord[];
  faults?: string[];
}

/**
 * The most the request may weigh (its JSON in bytes). A grist is sealed and sent as a record of at most 20,480 bytes (bsv-kit's MAX_PAYLOAD_BYTES), and sealing makes it about a third larger, so the
 * request must be under about 14,900; a long sentence (Ephesians 1:3-14 is 203 words, 15,700 bytes in Greek) is brought under this by fitRequest.
 */
export const MAX_REQUEST_BYTES = 14_000;

const jsonBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** A word with its `verse` kept only where a new verse begins (the words after it are of that verse until the next mark). */
const markVerseStarts = <T extends { verse?: number }>(list: T[]): T[] =>
  list.map((word, k) => {
    if (word.verse === undefined || k === 0 || list[k - 1].verse !== word.verse) return word;
    const { verse: _verse, ...rest } = word;
    return rest as T;
  });

/**
 * The request made to fit the grist's size (MAX_REQUEST_BYTES), by giving up the least first: (1) `verse` only on the first word of each verse; (2) the lemmas (the parse says what a word is);
 * (3) in English, the Greek context. A request that fits is returned as it is. The tree answered is of the `words` listed, whatever is left out, so nothing the app draws changes.
 */
export function fitRequest(request: DiagramRequest): DiagramRequest {
  if (jsonBytes(request) <= MAX_REQUEST_BYTES) return request;
  let fitted: DiagramRequest = { ...request, words: markVerseStarts(request.words), ...(request.greek ? { greek: markVerseStarts(request.greek) } : {}) };
  if (jsonBytes(fitted) <= MAX_REQUEST_BYTES) return fitted;
  fitted = {
    ...fitted,
    words: fitted.words.map(({ lemma: _lemma, ...rest }) => rest),
    ...(fitted.greek ? { greek: fitted.greek.map(({ lemma: _lemma, ...rest }) => rest) } : {}),
  };
  if (jsonBytes(fitted) <= MAX_REQUEST_BYTES) return fitted;
  const { greek: _greek, ...withoutGreek } = fitted;
  return withoutGreek;
}

/** The marks at a Greek word's ends (a stop, a question mark, a comma) go; an elision's apostrophe stays: ἀφ'. */
const GREEK_EDGE = /^[^\p{L}\p{M}\p{N}']+|[^\p{L}\p{M}\p{N}']+$/gu;
const WORDLIKE = /[\p{L}\p{N}]/u;

/** A chunk's English as its words, split on spaces, the marks at each word's ends stripped; a mark on its own ('—') is no word. */
const englishWords = (text: string): string[] => text.split(/\s+/).filter((w) => WORDLIKE.test(w)).map(bareEnglish);

const greekText = (word: GreekWord): string => word.t.replace(GREEK_EDGE, '');

/** The reference the request, the kept diagram and the picture name the unit by: 'Colossians 3:1', 'Colossians 3:1-2'. */
export function diagramReference(chapter: Chapter, verses: readonly Verse[]): string {
  const first = verses[0];
  const last = verses[verses.length - 1];
  const unit = { n: first.n, to: last.to ?? last.n };
  return unitReference(titleOf(chapter.code, chapter.chapter), unit);
}

/** The verses of `chapter` that a sentence touches, in order. */
export const sentenceVerses = (chapter: Chapter, sentence: Sentence): Verse[] => chapter.verses.filter((v) => sentence.parts.some((p) => p.verse === v.n));

/**
 * What a sentence is kept and asked for under (mw-5r3p30.897): its verses ('Ephesians 1:3-14'), and when it does not take every word of them, the first and the last word it takes
 * ('John 2:4 [2:4.0-2:4.6]'), so the two sentences of one verse have a diagram each. A whole-verse sentence of one verse is named as the verse always was ('Colossians 3:1'), so what was kept stays kept.
 */
export function sentenceReference(chapter: Chapter, sentence: Sentence): string {
  const base = diagramReference(chapter, sentenceVerses(chapter, sentence));
  if (isWholeVerses(chapter, sentence)) return base;
  const first = sentence.parts[0];
  const last = sentence.parts[sentence.parts.length - 1];
  return `${base} [${first.verse}.${first.from}-${last.verse}.${last.to}]`;
}

/**
 * The request for `verses` (one verse, or a passage's verses in order) in `view`, and the words the renderer indexes. English: each chunk's words, in the order of the English, each
 * carrying its chunk. Greek: each Greek word of the verse, in the order of the text, carrying its word index. In English mode the verse's Greek words go along as context, with their parse.
 * `sentence` (mw-5r3p30.897) takes only its parts of those verses: the words (Greek, Hebrew) from the part's first to its last, or, in English, the chunks whose first Greek word is among them;
 * the request is then named by sentenceReference, and each word keeps its verse's own indexes, so a tap finds the verse's word.
 */
export function buildDiagramRequest(chapter: Chapter, verses: readonly Verse[], view: DiagramMode, sentence?: Sentence): { request: DiagramRequest; words: DiagramWords } {
  const passage = verses.length > 1;
  const partOf = (verse: Verse): SentencePart | undefined => sentence?.parts.find((p) => p.verse === verse.n);
  const taken = (verse: Verse, w: number): boolean => {
    const part = partOf(verse);
    return !sentence || (part !== undefined && w >= part.from && w <= part.to);
  };
  const words: DiagramWords = [];
  const sent: DiagramRequestWord[] = [];
  const greek: DiagramGreekWord[] = [];
  for (const verse of verses) {
    const mark = passage ? { verse: verse.n } : {};
    if (view === 'english') {
      verse.e.forEach((chunk, c) => {
        // a chunk belongs to the sentence its first Greek word does; one with no Greek word goes with the whole verse
        if (chunk.g.length > 0 && !taken(verse, Math.min(...chunk.g))) return;
        if (chunk.g.length === 0 && sentence && partOf(verse)?.from !== 0) return;
        for (const text of englishWords(chunk.t)) {
          words.push({ text, chunk: c, ...mark });
          sent.push({ i: sent.length, text, chunk: c, ...mark });
        }
      });
      verse.g.forEach((word, w) => {
        if (!taken(verse, w)) return;
        greek.push({ text: greekText(word), lemma: word.l, parse: word.p, ...(word.e !== undefined ? { chunk: word.e } : {}), ...mark });
      });
    } else if (view === 'hebrew') {
      verse.g.forEach((word, w) => {
        if (!taken(verse, w)) return;
        for (const piece of hebrewPieces(word, wordGloss(chapter, word), greekText(word))) {
          const gloss = piece.gloss === '' ? {} : { gloss: piece.gloss };
          words.push({ text: piece.text, word: w, ...gloss, ...mark });
          // a prefix has no lemma of its own
          sent.push({ i: sent.length, text: piece.text, ...(piece.prefix ? {} : { lemma: word.l }), parse: piece.parse, ...gloss, ...mark });
        }
      });
    } else {
      verse.g.forEach((word, w) => {
        if (!taken(verse, w)) return;
        const text = greekText(word);
        words.push({ text, word: w, ...mark });
        sent.push({ i: sent.length, text, lemma: word.l, parse: word.p, ...mark });
      });
    }
  }
  const whole: DiagramRequest = { ref: sentence ? sentenceReference(chapter, sentence) : diagramReference(chapter, verses), lang: view, words: sent, ...(view === 'english' ? { greek } : {}) };
  return { request: fitRequest(whole), words };
}

