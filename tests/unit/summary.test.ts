// tests/unit/summary.test.ts — the pure part of Summary (src/practise/summary.ts, mw-5r3p30.902): the typed text, the request (typed or a photo) and the check of the tutor's answer.
import { describe, expect, it } from 'vitest';
import { buildSummaryRequest, isSummaryAnswer, MAX_SUMMARY_CHARS, MAX_SUMMARY_PASSAGE_CHARS, SUMMARY_KIND, summaryRefusal, type SummaryAnswer, typedSummary } from '../../src/practise/summary';

const answer: SummaryAnswer = {
  readable: true,
  read_as: 'The Word was with God and was God.',
  present: ['The Word was with God', 'The Word was God'],
  missing: ['The Word was in the beginning'],
  in_order: false,
  length: 'right',
  model_summary: 'In the beginning the Word was with God, and the Word was God.',
  advice: 'Start with when the Word was.',
};

describe('the kind', () => {
  it('is summary', () => {
    expect(SUMMARY_KIND).toBe('summary');
  });
});

describe('the typed summary', () => {
  it('has its spaces and lines collapsed to single spaces and is trimmed, its words left as he wrote them', () => {
    expect(typedSummary('  the word was\n\nwith   god.  ')).toBe('the word was with god.');
  });
  it('is empty for nothing typed', () => {
    expect(typedSummary(' \n ')).toBe('');
  });
});

describe('the request', () => {
  it('for a typed summary names the reference and sends the passage and his text', () => {
    expect(buildSummaryRequest('John 1:1', 'In the beginning was the Word.', { how: 'typed', text: ' The Word was first. ' })).toEqual({
      reference: 'John 1:1',
      passage: 'In the beginning was the Word.',
      how: 'typed',
      summary: 'The Word was first.',
    });
  });
  it('for a photo sends no text: the picture is the summary', () => {
    expect(buildSummaryRequest('John 1:1-5', 'In the beginning…', { how: 'photo' })).toEqual({ reference: 'John 1:1-5', passage: 'In the beginning…', how: 'photo' });
  });
});

describe('what cannot be asked', () => {
  it('is a passage too long for the grind (a chapter is not), or a summary too long', () => {
    expect(MAX_SUMMARY_PASSAGE_CHARS).toBeGreaterThanOrEqual(12000);
    expect(summaryRefusal('x'.repeat(MAX_SUMMARY_PASSAGE_CHARS), 'a')).toBeNull();
    expect(summaryRefusal('x'.repeat(MAX_SUMMARY_PASSAGE_CHARS + 1), 'a')).toMatch(/long passage/);
    expect(summaryRefusal('x', 'y'.repeat(MAX_SUMMARY_CHARS + 1))).toMatch(/too long/);
  });
  it('is nothing for a photo, which has no text to measure', () => {
    expect(summaryRefusal('x', '')).toBeNull();
  });
});

describe('the tutor’s answer', () => {
  it('is believed when it has the points present, the points missing, the order, the length and a model summary', () => {
    expect(isSummaryAnswer(answer)).toBe(true);
    expect(isSummaryAnswer({ ...answer, present: [], missing: [] })).toBe(true);
    expect(isSummaryAnswer({ ...answer, length: 'too_long' })).toBe(true);
    expect(isSummaryAnswer({ ...answer, length: 'too_short' })).toBe(true);
  });
  it('is believed when a photo could not be read: nothing judged, nothing to compare', () => {
    expect(isSummaryAnswer({ ...answer, readable: false, read_as: '', present: [], missing: [], model_summary: '' })).toBe(true);
  });
  it('is refused when a part is missing or of the wrong kind', () => {
    expect(isSummaryAnswer(null)).toBe(false);
    expect(isSummaryAnswer({ ...answer, present: 'x' })).toBe(false);
    expect(isSummaryAnswer({ ...answer, missing: [1] })).toBe(false);
    expect(isSummaryAnswer({ ...answer, in_order: 'yes' })).toBe(false);
    expect(isSummaryAnswer({ ...answer, length: 'long' })).toBe(false);
    expect(isSummaryAnswer({ ...answer, readable: undefined })).toBe(false);
    expect(isSummaryAnswer({ ...answer, advice: 3 })).toBe(false);
  });
  it('is refused when a readable answer has no model summary to compare', () => {
    expect(isSummaryAnswer({ ...answer, model_summary: '' })).toBe(false);
  });
});
