import { describe, expect, it } from 'vitest';
import { quizQuestion, type QuizFocus } from '../../src/services/talk';

// The Quick test's Ask the tutor names the word by its lemma however the chapter spells it. tests/e2e/quiz.spec.ts
// (mw-5r3p30.90) checks the Talk sheet for the lemma on a random draw: a question that named only the chapter's form
// failed it whenever the draw was a word that stands inflected in Romans 8.
const focus = (over: Partial<QuizFocus> = {}): QuizFocus => ({
  kind: 'quiz',
  lemma: 'κύριος',
  question: 'What does κύριος mean?',
  choices: ['lord', 'house', 'peace', 'word'],
  picked: 'house',
  correct: 'lord',
  right: false,
  answers: [],
  ...over,
});

describe('quizQuestion', () => {
  it('names the lemma when the chapter has the word inflected, and the form beside it', () => {
    const text = quizQuestion(focus({ form: 'κυρίῳ' }), 'Romans 8:39');
    expect(text).toContain('κύριος');
    expect(text).toContain('(as κυρίῳ)');
    expect(text).toContain('Romans 8:39');
  });

  it('names the lemma alone when the word has no other form, or stands nowhere in the chapter', () => {
    expect(quizQuestion(focus({ form: 'κύριος' }), 'Romans 8:39')).not.toContain('(as ');
    const lost = quizQuestion(focus(), undefined);
    expect(lost).toContain('κύριος');
    expect(lost).not.toContain('as it stands');
  });

  it('says what he chose and what was right', () => {
    expect(quizQuestion(focus(), undefined)).toContain('I chose “house”, and the right answer was “lord”');
    expect(quizQuestion(focus({ picked: 'lord', right: true }), undefined)).toContain('I chose “lord”, and that was right');
  });
});
