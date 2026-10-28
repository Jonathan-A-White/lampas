// src/speech/speakQuestion.ts — what 'Tap to hear' / 'Say it again' says for a grammar question: a 'sound' question asks which letter or pair he hears, so its
// sound is said (speakSound: a vowel doubled to the Greek voice, 'οο', a consonant still named, mw-5r3p30.421); any other question says a word, and a word of
// one letter is said by its sound too (speakWord). A question about Hebrew (lang 'hbo', mw-gdcyf98.21) is said in the Hebrew voice, whatever its kind.
import type { GrammarQuestion } from '../data/grammar/questions';
import { speakSound, speakWord } from './greek';

export function speakQuestion(question: Pick<GrammarQuestion, 'kind' | 'say' | 'lang'>): boolean {
  if (!question.say) return false;
  if (question.lang === 'hbo') return speakWord(question.say, 'hebrew');
  return question.kind === 'sound' ? speakSound(question.say) : speakWord(question.say, 'greek');
}
