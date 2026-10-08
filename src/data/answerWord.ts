// src/data/answerWord.ts — a Greek word of an answer, found again in the chapter's text, so a tap can open its word sheet.
import { type GreekWord, type Verse, wordLemma } from './chapter';
import type { AnswerWord } from './db';
import type { TalkScope } from '../services/talk';

/** Lower case with no accents or breathings, so a word the companion wrote loosely still finds its place in the text. */
const plain = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The word of the chapter an answer's word stands for: the same word in the verse the talk is about first, then anywhere
 * in the chapter; by the word as written, or else by its lemma. Undefined when the text has no such word. */
export function findGreekWord(scope: TalkScope, word: AnswerWord): GreekWord | undefined {
  const verses: Verse[] = scope.verse ? [scope.verse, ...scope.chapter.verses.filter((v) => v !== scope.verse)] : scope.chapter.verses;
  const words = verses.flatMap((v) => v.g);
  const exact = (w: GreekWord) => w.t.normalize('NFC') === word.greek.normalize('NFC');
  const loose = (w: GreekWord) => plain(w.t) === plain(word.greek);
  const lemma = (w: GreekWord) => plain(wordLemma(w)) === plain(word.lemma);
  return words.find(exact) ?? words.find(loose) ?? words.find(lemma);
}
