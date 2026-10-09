// src/speech/tutorVoice.ts: what is spoken of a reading check's verdict (mw-5r3p30.93).
import { describe, expect, it } from 'vitest';
import { askAnswerId, VERDICT_ID, verdictRuns } from '../../src/speech/tutorVoice';

describe('verdictRuns', () => {
  it('says the heading, the note and each word with its tip, and nothing of chunks', () => {
    const runs = verdictRuns('Words to fix', 'Nearly there.', [{ word: 'blessed', tip: 'say it as one beat, blest' }]);
    expect(runs.map((r) => r.text)).toEqual(['Words to fix.', 'Nearly there.', 'blessed: say it as one beat, blest.']);
    expect(runs.every((r) => r.language === 'english')).toBe(true);
  });

  it('sends a Greek word to the Greek voice and shows plain quote marks', () => {
    const runs = verdictRuns('Words to fix', 'It sounded like \\"laff\\".', [{ word: 'συνεργεῖ', tip: 'The γ is soft.' }]);
    expect(runs.find((r) => r.text.includes('laff'))?.text).toBe('It sounded like "laff".');
    expect(runs.filter((r) => r.language === 'greek').map((r) => r.text)).toContain('συνεργεῖ');
  });
});

describe('answer ids', () => {
  it('never meet the verdict id or a Talk turn id', () => {
    expect(VERDICT_ID).toBeLessThan(0);
    expect([1, 2, 99].map(askAnswerId).every((id) => id < VERDICT_ID)).toBe(true);
  });
});
