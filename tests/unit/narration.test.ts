// tests/unit/narration.test.ts — the pure part of Narration (src/practise/narration.ts, mw-5r3p30.901): the written-down narration, the request and the check of the tutor's answer.
import { describe, expect, it } from 'vitest';
import { buildNarrationRequest, isNarrationAnswer, MAX_NARRATION_CHARS, MAX_PASSAGE_CHARS, narrationRefusal, type NarrationAnswer, writtenDown } from '../../src/practise/narration';

describe('the narration written down', () => {
  it('has a capital letter and a full stop, its words as the phone heard them', () => {
    expect(writtenDown('in the beginning was the word and the word was with god')).toBe('In the beginning was the word and the word was with god.');
  });
  it('keeps the end mark a recogniser gave it, and collapses the spaces', () => {
    expect(writtenDown('  Who is he?  ')).toBe('Who is he?');
    expect(writtenDown('god  made   it!')).toBe('God made it!');
  });
  it('is empty for nothing heard', () => {
    expect(writtenDown('   ')).toBe('');
  });
});

describe('the request', () => {
  it('names the reference and sends the passage and the narration', () => {
    expect(buildNarrationRequest('John 1:1', 'In the beginning was the Word.', 'in the beginning was the word')).toEqual({
      reference: 'John 1:1',
      passage: 'In the beginning was the Word.',
      narration: 'In the beginning was the word.',
    });
  });
});

describe('what cannot be asked', () => {
  it('is a passage too long for the grind, or a narration too long', () => {
    expect(narrationRefusal('x'.repeat(MAX_PASSAGE_CHARS), 'a')).toBeNull();
    expect(narrationRefusal('x'.repeat(MAX_PASSAGE_CHARS + 1), 'a')).toMatch(/long passage/);
    expect(narrationRefusal('x', 'y'.repeat(MAX_NARRATION_CHARS + 1))).toMatch(/long/);
  });
});

describe('the tutor’s answer', () => {
  const answer: NarrationAnswer = { caught: ['The Word was in the beginning'], missed: ['The Word was God'], in_order: true, question: 'What do you think the last part says about the Word?' };
  it('is believed when it has the points caught, the points missed, the order and one question', () => {
    expect(isNarrationAnswer(answer)).toBe(true);
    expect(isNarrationAnswer({ ...answer, caught: [], missed: [] })).toBe(true);
  });
  it('is refused when a part is missing or of the wrong kind', () => {
    expect(isNarrationAnswer(null)).toBe(false);
    expect(isNarrationAnswer({ ...answer, caught: 'x' })).toBe(false);
    expect(isNarrationAnswer({ ...answer, missed: [1] })).toBe(false);
    expect(isNarrationAnswer({ ...answer, in_order: 'yes' })).toBe(false);
    expect(isNarrationAnswer({ ...answer, question: '' })).toBe(false);
    expect(isNarrationAnswer({ caught: answer.caught, missed: answer.missed, in_order: true })).toBe(false);
  });
});
