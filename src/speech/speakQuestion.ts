// src/speech/speakQuestion.ts — what 'Hold to hear' / 'Say it again' says for a grammar question: a 'sound' question asks which LETTER he hears, so the letter is
// said as a Greek voice names it (speakLetter); any other question says a word, and a word of one letter goes as its sound (speakWord, mw-5r3p30.256).
import type { GrammarQuestion } from '../data/grammar/questions';
import { speakLetter, speakWord } from './greek';

export function speakQuestion(question: Pick<GrammarQuestion, 'kind' | 'say'>): boolean {
  if (!question.say) return false;
  return question.kind === 'sound' ? speakLetter(question.say) : speakWord(question.say, 'greek');
}
