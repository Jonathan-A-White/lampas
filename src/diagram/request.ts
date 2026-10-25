// src/diagram/request.ts — what the sentence-diagram grind (grinds/sentence-diagram.json, mw-souyao.2) is sent for a verse or a passage, and the words the renderer indexes. The grind answers with a
// tree (types.ts) whose {i} point into `words`; the same list is built here for the request and for the picture, so an index means the same word on both sides. Pure: no store, no network.
import { bareEnglish, type Chapter, type GreekWord, type Verse } from '../data/chapter';
import { titleOf } from '../data/books';
import { unitReference } from '../data/passage';
import type { DiagramMode, DiagramWords } from './types';

/** One word of the request. English: its chunk (its place in the verse's English chunks); Greek: its lemma and parse. `verse` only in a passage of several verses, where `chunk` counts within that verse. */
export interface DiagramRequestWord {
  i: number;
  text: string;
  chunk?: number;
  lemma?: string;
  parse?: string;
  verse?: number;
}

/** In English mode, a Greek word of the verse as context: its form, lemma and parse code, and the English chunk it is part of when it has one. */
export interface DiagramGreekWord {
  text: string;
  lemma: string;
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

/**
 * The request for `verses` (one verse, or a passage's verses in order) in `view`, and the words the renderer indexes. English: each chunk's words, in the order of the English, each
 * carrying its chunk. Greek: each Greek word of the verse, in the order of the text, carrying its word index. In English mode the verse's Greek words go along as context, with their parse.
 */
export function buildDiagramRequest(chapter: Chapter, verses: readonly Verse[], view: DiagramMode): { request: DiagramRequest; words: DiagramWords } {
  const passage = verses.length > 1;
  const words: DiagramWords = [];
  const sent: DiagramRequestWord[] = [];
  const greek: DiagramGreekWord[] = [];
  for (const verse of verses) {
    const mark = passage ? { verse: verse.n } : {};
    if (view === 'english') {
      verse.e.forEach((chunk, c) => {
        for (const text of englishWords(chunk.t)) {
          words.push({ text, chunk: c, ...mark });
          sent.push({ i: sent.length, text, chunk: c, ...mark });
        }
      });
      verse.g.forEach((word) => {
        greek.push({ text: greekText(word), lemma: word.l, parse: word.p, ...(word.e !== undefined ? { chunk: word.e } : {}), ...mark });
      });
    } else {
      verse.g.forEach((word, w) => {
        const text = greekText(word);
        words.push({ text, word: w, ...mark });
        sent.push({ i: sent.length, text, lemma: word.l, parse: word.p, ...mark });
      });
    }
  }
  const request: DiagramRequest = { ref: diagramReference(chapter, verses), lang: view, words: sent, ...(view === 'english' ? { greek } : {}) };
  return { request, words };
}

