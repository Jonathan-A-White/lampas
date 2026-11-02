// src/data/grammar/hebrew/passageCheck.ts — Check on a Hebrew passage lesson (mw-5r3p30.911, docs/grammar.md 'Passage lessons'): the questions that pass the lesson by reading it. For each verse of the
// lesson's range, in the text's order, up to two questions: tap the word that shows one of the lesson's ideas (wordQuestions.ts buildHebrewTapForm), each idea asked once before one is asked again,
// at most `max` in all. The Greek Check (../passageCheck.ts) asks a meaning and a parsing of each verse; a Hebrew word has no English meaning question yet, so the Hebrew Check asks what the
// words show. Pure: the caller hands in the chapter and a random.
import type { Chapter } from '../../chapter';
import type { Random } from '../../quiz';
import type { GrammarQuestion } from '../questions';
import { ideaOfAny } from '../ladders';
import { CHECK_QUESTIONS } from '../passageCheck';
import { buildHebrewTapForm, hebrewIdeasOfWord } from './wordQuestions';

/** The most questions one verse gives a Check (the lesson's range is short, so each verse is asked a few ways). */
export const PER_VERSE = 2;

/**
 * The questions of a Check on verses `from` to `to` of the Hebrew `chapter`: for each verse, the lesson's ideas the verse has a word of (the ones asked least so far first), each as a
 * tap-the-word question on that verse; an idea whose verse cannot give four different words gives none. At most `max` in all.
 */
export function buildHebrewCheck(chapter: Chapter, from: number, to: number, ideas: readonly string[], random: Random, max = CHECK_QUESTIONS): GrammarQuestion[] {
  const used = new Map<string, number>();
  const questions: GrammarQuestion[] = [];
  for (const verse of chapter.verses.filter((v) => v.n >= from && v.n <= to)) {
    if (questions.length >= max) break;
    const key = `${chapter.code}.${chapter.chapter}.${verse.n}`;
    const own = new Set(verse.g.flatMap((w) => hebrewIdeasOfWord(chapter, w)));
    const candidates = ideas.filter((id) => own.has(id)).sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0));
    let asked = 0;
    for (const id of candidates) {
      if (asked >= PER_VERSE || questions.length >= max) break;
      const question = buildHebrewTapForm(ideaOfAny(id), [chapter], random, key);
      if (!question) continue;
      used.set(id, (used.get(id) ?? 0) + 1);
      questions.push(question);
      asked += 1;
    }
  }
  return questions;
}
