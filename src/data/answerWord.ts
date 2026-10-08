// src/data/answerWord.ts — a Greek word of an answer, found again in the chapter's text, so a tap can open its word sheet.
import { type GreekWord, type Verse, wordGloss, wordLemma } from './chapter';
import type { AnswerWord } from './db';
import { normaliseHeadword } from './lemma';
import { lookupLemma } from './lexicon';
import { addWordToLearn, wordIsListed } from './repositories';
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

/** The lexicon's gloss for an answer's word as the chapter has it ('flesh'), or '' when the chapter has no such word. */
export function glossOf(scope: TalkScope, word: AnswerWord): string {
  const found = findGreekWord(scope, word);
  return found ? wordGloss(scope.chapter, found) : '';
}

/** What happened to a lemma an answer asked to add: 'unknown' is a word neither his list nor the lexicon has. */
export interface AddedLemma {
  headword: string;
  result: 'added' | 'already' | 'unknown' | 'ignored';
}

/**
 * Puts a lemma on his words-to-learn list with the gloss and part of speech the lexicon (the whole text's, the word sheet's
 * source) gives it, wherever in the New Testament it is. A lemma the lexicon does not know is not added, unless it is on his
 * list already; when the lexicon cannot be loaded the chapter's own gloss is used so a word in the open chapter still goes in.
 */
export async function addLemmaToLearn(scope: TalkScope, lemma: string, now = Date.now()): Promise<AddedLemma> {
  const headword = normaliseHeadword(lemma);
  if (!headword) return { headword, result: 'ignored' };
  if (await wordIsListed(headword)) return { headword, result: await addWordToLearn(headword, '', now) };
  let entry;
  try {
    entry = await lookupLemma(headword);
  } catch {
    const gloss = glossOf(scope, { greek: headword, lemma: headword, note: '' });
    return gloss ? { headword, result: await addWordToLearn(headword, gloss, now) } : { headword, result: 'unknown' };
  }
  if (!entry) return { headword, result: 'unknown' };
  return { headword, result: await addWordToLearn(headword, entry.g, now, entry.c) };
}
